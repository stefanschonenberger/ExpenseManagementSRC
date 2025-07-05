import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import { ExpenseReport } from '../expense-report/entities/expense-report.entity';
import { BlobService } from '../blob/blob.service';
import * as fs from 'fs/promises';
import * as path from 'path';

// A simple utility for currency formatting, as we can't use frontend utils here.
const formatCurrency = (amountInCents: number): string => {
  if (typeof amountInCents !== 'number' || isNaN(amountInCents)) return 'R 0.00';
  const amount = (amountInCents / 100).toFixed(2);
  const parts = amount.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `R ${parts.join('.')}`;
};

@Injectable()
export class PdfGenerationService {
  private readonly logger = new Logger(PdfGenerationService.name);

  constructor(private readonly blobService: BlobService) {}

  async generateReportPdf(report: ExpenseReport): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    // --- Add Summary Page ---
    await this.drawSummaryPage(pdfDoc, report, timesRomanFont, timesRomanBoldFont);

    // --- Add Receipt Pages ---
    const sortedExpensesForReceipts = [...report.expenses].sort((a, b) => new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime());
    for (const expense of sortedExpensesForReceipts) {
      if (expense.receipt_blob_id) {
        try {
          this.logger.log(`Fetching receipt blob ${expense.receipt_blob_id} for expense "${expense.title}"`);
          const blob = await this.blobService.getBlobById(expense.receipt_blob_id);
          
          if (blob.mimetype === 'image/png' || blob.mimetype === 'image/jpeg' || blob.mimetype === 'image/jpg') {
            const page = pdfDoc.addPage();
            const { width, height } = page.getSize();
            let image;
            if (blob.mimetype === 'image/png') {
              image = await pdfDoc.embedPng(blob.data);
            } else {
              image = await pdfDoc.embedJpg(blob.data);
            }
            const imageDims = image.scale(0.8);
            page.drawImage(image, {
              x: (width - imageDims.width) / 2,
              y: height - imageDims.height - 50,
              width: imageDims.width,
              height: imageDims.height,
            });
            page.drawText(`Receipt for: ${expense.title}`, { x: 50, y: height - 30, font: timesRomanFont, size: 12 });
          } 
          else if (blob.mimetype === 'application/pdf') {
            const receiptPdf = await PDFDocument.load(blob.data);
            const copiedPages = await pdfDoc.copyPages(receiptPdf, receiptPdf.getPageIndices());
            copiedPages.forEach((page) => {
              pdfDoc.addPage(page);
            });
            this.logger.log(`Embedded ${copiedPages.length} page(s) from PDF receipt for expense "${expense.title}".`);
          } 
          else {
            this.logger.warn(`Unsupported receipt format (${blob.mimetype}) for expense ${expense.id}. Skipping.`);
          }
        } catch (error) {
          this.logger.error(`Failed to embed receipt for expense ${expense.id}:`, error);
          const errorPage = pdfDoc.addPage();
          errorPage.drawText(`Could not load receipt for expense: ${expense.title}`, { x: 50, y: 500, font: timesRomanFont, size: 12, color: rgb(1, 0, 0) });
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private async drawSummaryPage(pdfDoc: PDFDocument, report: ExpenseReport, font: PDFFont, boldFont: PDFFont) {
      let page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const margin = 40;
      let y = height - margin;
      const logoFilename = 'opia-tech.png';

      // --- Header with Logo ---
      try {
        const logoPath = path.resolve(__dirname, '..', 'assets', logoFilename);
        const logoImageBytes = await fs.readFile(logoPath);
        const logoImage = await pdfDoc.embedPng(logoImageBytes);
        const logoDims = logoImage.scale(0.15);
        page.drawImage(logoImage, {
          x: margin,
          y: y - logoDims.height,
          width: logoDims.width,
          height: logoDims.height,
        });
      } catch (e) {
        this.logger.warn(`Logo not found at 'src/assets/${logoFilename}'. Drawing text instead.`);
        page.drawText('Opiatech (Pty) Ltd', { x: margin, y: y - 20, font: boldFont, size: 16, color: rgb(0.04, 0.45, 0.85) });
      }
      
      page.drawText('Expense Report', { x: width - margin - 150, y: y - 20, font: boldFont, size: 24 });
      y -= 70;

      // --- Report Details ---
      page.drawText(`Report Title: ${report.title}`, { x: margin, y, font: boldFont, size: 14 });
      y -= 20;
      page.drawText(`Submitted By: ${report.user.full_name}`, { x: margin, y, font: font, size: 12 });
      y -= 15;
      page.drawText(`Approved By: ${report.approver?.full_name || 'N/A'}`, { x: margin, y, font: font, size: 12 });
      y -= 15;
      page.drawText(`Approval Date: ${new Date(report.decision_at).toLocaleDateString()}`, { x: margin, y, font: font, size: 12 });
      y -= 30;

      // --- Expenses Table ---
      const tableTop = y;
      const rightEdge = width - margin;

      // Define column START positions from left to right for clarity
      const dateX = margin;
      const titleX = dateX + 45;      // Date column width: 45
      const typeX = titleX + 80;     // Title column width: 80
      const supplierX = typeX + 90;   // Type column width: 90
      const bookX = supplierX + 90;    // Supplier column width: 90
      const subtotalX = bookX + 20;   // Book column width: 20
      const vatX = subtotalX + 50;      // Subtotal column width: 50
      const totalX = vatX + 70;       // VAT column width: 70
                                      // Total column takes remaining space
      
      const drawRightAlignedText = (text: string, x: number, yPos: number, fontToUse: PDFFont, size: number) => {
        const textWidth = fontToUse.widthOfTextAtSize(text, size);
        page.drawText(text, { x: x - textWidth, y: yPos, font: fontToUse, size });
      };

      // --- Draw Headers ---
      page.drawText('Date', { x: dateX, y: tableTop, font: boldFont, size: 10 });
      page.drawText('Title', { x: titleX, y: tableTop, font: boldFont, size: 10 });
      page.drawText('Type', { x: typeX, y: tableTop, font: boldFont, size: 10 });
      page.drawText('Supplier', { x: supplierX, y: tableTop, font: boldFont, size: 10 });
      page.drawText('Book', { x: bookX, y: tableTop, font: boldFont, size: 10 });
      drawRightAlignedText('Subtotal', vatX, tableTop, boldFont, 10);
      drawRightAlignedText('VAT', totalX, tableTop, boldFont, 10);
      drawRightAlignedText('Total', rightEdge, tableTop, boldFont, 10);
      y -= 5;
      page.drawLine({ start: { x: margin, y }, end: { x: rightEdge, y }, thickness: 1 });
      y -= 15;

      // --- Draw Rows ---
      const sortedExpenses = [...report.expenses].sort((a, b) => new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime());
      for (const expense of sortedExpenses) {
          const lineTotal = expense.amount + expense.vat_amount;
          page.drawText(new Date(expense.expense_date).toLocaleDateString(), { x: dateX, y, font: font, size: 8 });
          page.drawText(expense.title.substring(0, 18), { x: titleX, y, font: font, size: 8 });
          page.drawText(expense.expense_type, { x: typeX, y, font: font, size: 8 });
          page.drawText(expense.supplier?.substring(0, 16) || '-', { x: supplierX, y, font: font, size: 8 });
          page.drawText(expense.book ? 'Yes' : 'No', { x: bookX, y, font: font, size: 8 });
          drawRightAlignedText(formatCurrency(expense.amount), vatX, y, font, 8);
          drawRightAlignedText(formatCurrency(expense.vat_amount), totalX, y, font, 8);
          drawRightAlignedText(formatCurrency(lineTotal), rightEdge, y, font, 8);
          y -= 15;
          if (y < margin + 100) {
            page = pdfDoc.addPage();
            y = height - margin;
          }
      }
      
      // --- Totals Footer ---
      page.drawLine({ start: { x: margin, y }, end: { x: rightEdge, y }, thickness: 0.5 });
      y -= 20;
      
      const bookedExpenses = report.expenses.filter(e => e.book);
      const nonBookedExpenses = report.expenses.filter(e => !e.book);
      const bookSubtotal = bookedExpenses.reduce((sum, e) => sum + e.amount, 0);
      const bookVat = bookedExpenses.reduce((sum, e) => sum + e.vat_amount, 0);
      const bookTotal = bookSubtotal + bookVat;
      const nonBookSubtotal = nonBookedExpenses.reduce((sum, e) => sum + e.amount, 0);
      const nonBookVat = nonBookedExpenses.reduce((sum, e) => sum + e.vat_amount, 0);
      const nonBookTotal = nonBookSubtotal + nonBookVat;
      const grandSubtotal = report.total_amount;
      const grandVat = report.total_vat_amount;
      const grandTotal = grandSubtotal + grandVat;
      
      const drawTotalsRow = (title: string, subtotal: number, vat: number, total: number, startY: number, isBold = false) => {
        const currentFont = isBold ? boldFont : font;
        const size = isBold ? 10 : 9;
        const titleX = supplierX;
        
        page.drawText(title, { x: titleX, y: startY, font: boldFont, size: size });
        drawRightAlignedText(formatCurrency(subtotal), vatX, startY, currentFont, size);
        drawRightAlignedText(formatCurrency(vat), totalX, startY, currentFont, size);
        drawRightAlignedText(formatCurrency(total), rightEdge, startY, currentFont, size);
        return startY - (size + 4);
      };

      let currentY = y;
      currentY = drawTotalsRow('Book Totals', bookSubtotal, bookVat, bookTotal, currentY);
      currentY = drawTotalsRow('Non-Book Totals', nonBookSubtotal, nonBookVat, nonBookTotal, currentY);
      y = currentY - 5;
      page.drawLine({ start: { x: supplierX, y }, end: { x: rightEdge, y }, thickness: 0.5 });
      y -= 15;
      drawTotalsRow('Grand Totals', grandSubtotal, grandVat, grandTotal, y, true);
  }
}
