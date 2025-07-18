// backend/src/pdf/pdf.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ExpenseReport } from 'src/expense-report/entities/expense-report.entity';
import { PDFDocument, rgb, StandardFonts, PageSizes, PDFFont } from 'pdf-lib';
import { BlobService } from 'src/blob/blob.service';
import { OcrService } from 'src/ocr/ocr.service';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    private readonly blobService: BlobService,
    private readonly ocrService: OcrService,
  ) {}

  async generatePdf(report: ExpenseReport): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const primaryColor = rgb(0.039, 0.455, 0.855); // #0A74DA
    const grayColor = rgb(0.95, 0.95, 0.95);
    const fontColor = rgb(0.2, 0.2, 0.2);
    const whiteColor = rgb(1, 1, 1);

    const margin = 50;
    let y = height - margin;

    // --- Helper Functions ---
    const formatCurrency = (amountInCents: number) => {
        if (amountInCents === null || amountInCents === undefined) return '-';
        return `R ${(amountInCents / 100).toFixed(2)}`;
    };

    const formatDate = (dateString: string | Date): string => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const drawCell = (
        text: string, 
        col: { width: number, align?: string }, 
        currentX: number, 
        y: number, 
        font: PDFFont, 
        size: number, 
        color: any
    ) => {
        const textWidth = font.widthOfTextAtSize(text, size);
        let textX;
        if (col.align === 'right') {
            textX = currentX + col.width - textWidth - 5; // 5 units padding from right
        } else if (col.align === 'center') {
            textX = currentX + (col.width - textWidth) / 2;
        } else {
            textX = currentX + 5; // 5 units padding from left
        }
        page.drawText(text, { x: textX, y, font, size, color });
    };

    // --- Header ---
    page.drawText('Expense Report', { x: margin, y, font: boldFont, size: 24, color: primaryColor });
    y -= 40;

    // --- Report Details ---
    const details = [
      { label: 'Report Title:', value: report.title },
      { label: 'Report ID:', value: report.id },
      { label: 'Submitted By:', value: report.user.full_name },
      { label: 'Submission Date:', value: formatDate(report.submitted_at) },
      { label: 'Status:', value: `Approved by ${report.approver?.full_name} on ${formatDate(report.decision_at)}` },
    ];

    let detailX = margin;
    details.forEach(detail => {
        page.drawText(detail.label, { x: detailX, y, font: boldFont, size: 10, color: fontColor });
        page.drawText(detail.value, { x: detailX + 90, y, font: font, size: 10, color: fontColor });
        y -= 15;
    });
    
    y -= 30;

    // --- Expenses Table ---
    const table = {
      x: margin,
      y,
      width: width - margin * 2,
      header: { height: 25, color: primaryColor, fontColor: whiteColor },
      row: { height: 20, evenColor: whiteColor, oddColor: grayColor },
      columns: [
        { header: 'Date', key: 'date', width: 60, align: 'left' },
        { header: 'Title', key: 'title', width: 110, align: 'left' },
        { header: 'Supplier', key: 'supplier', width: 90, align: 'left' },
        { header: 'Book Amt', key: 'book_amount', width: 70, align: 'right' },
        { header: 'VAT', key: 'vat', width: 60, align: 'right' },
        { header: 'Amount', key: 'amount', width: 80, align: 'right' },
      ],
    };

    // Draw table header
    let headerX = table.x ;
    page.drawRectangle({ x: table.x, y: table.y, width: table.width, height: table.header.height, color: table.header.color });
    table.columns.forEach(col => {
      drawCell(col.header, col, headerX, table.y + 8, boldFont, 10, table.header.fontColor);
      headerX += col.width;
    });
    y -= table.header.height - 30;

    // Draw table rows
    let totalAmount = 0;
    let totalVat = 0;
    let totalBookAmount = 0;
    let totalNonBookAmount = 0;
    let totalNonBookVat = 0;
    
    const sortedExpenses = [...report.expenses].sort((a, b) => new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime());

    sortedExpenses.forEach((expense, index) => {
      if (y < margin + table.row.height) {
        page = pdfDoc.addPage(PageSizes.A4);
        y = height - margin;
      }

      const rowColor = index % 2 === 0 ? table.row.evenColor : table.row.oddColor;
      page.drawRectangle({ x: table.x, y, width: table.width, height: -table.row.height, color: rowColor });
      
      let currentX = table.x;
      const rowY = y - 15;

      drawCell(formatDate(expense.expense_date), table.columns[0], currentX, rowY, font, 9, fontColor);
      currentX += table.columns[0].width;
      
      drawCell(expense.title, table.columns[1], currentX, rowY, font, 9, fontColor);
      currentX += table.columns[1].width;

      drawCell(expense.supplier || 'N/A', table.columns[2], currentX, rowY, font, 9, fontColor);
      currentX += table.columns[2].width;

      const bookAmountText = expense.book ? formatCurrency(expense.book_amount) : '-';
      drawCell(bookAmountText, table.columns[3], currentX, rowY, font, 9, fontColor);
      currentX += table.columns[3].width;

      if (expense.book) {
        totalBookAmount += expense.book_amount;
      } else {
        totalNonBookAmount += expense.amount;
        totalNonBookVat += expense.vat_amount;
      }

      drawCell(formatCurrency(expense.vat_amount), table.columns[4], currentX, rowY, font, 9, fontColor);
      currentX += table.columns[4].width;
      
      drawCell(formatCurrency(expense.amount), table.columns[5], currentX, rowY, font, 9, fontColor);

      totalAmount += expense.amount;
      totalVat += expense.vat_amount;
      y -= table.row.height;
    });

    // --- Totals Section ---
    y -= 20;
    page.drawLine({ start: { x: margin, y: y + 10 }, end: { x: width - margin, y: y + 10 }, thickness: 0.5, color: primaryColor });
    
    const totalsY = y;
    const colWidth = table.width / 3;
    const colPadding = 15;

    // --- Column 1: Book Totals ---
    const col1StartX = table.x;
    const col1RightEdge = col1StartX + colWidth - colPadding;
    page.drawText('Book Totals', { x: col1StartX, y: totalsY, font: boldFont, size: 11, color: primaryColor });
    
    page.drawText('Subtotal:', { x: col1StartX, y: totalsY - 15, font: font, size: 10, color: fontColor });
    let valueText = formatCurrency(totalBookAmount);
    let textWidth = font.widthOfTextAtSize(valueText, 10);
    page.drawText(valueText, { x: col1RightEdge - textWidth, y: totalsY - 15, font: font, size: 10, color: fontColor });

    // --- Column 2: Non-Book Totals ---
    const col2StartX = table.x + +10 + colWidth;
    const col2RightEdge = col2StartX + colWidth - colPadding;
    page.drawText('Non-Book Totals', { x: col2StartX, y: totalsY, font: boldFont, size: 11, color: primaryColor });

    page.drawText('Subtotal:', { x: col2StartX, y: totalsY - 15, font: font, size: 10, color: fontColor });
    valueText = formatCurrency(totalNonBookAmount);
    textWidth = font.widthOfTextAtSize(valueText, 10);
    page.drawText(valueText, { x: col2RightEdge - textWidth, y: totalsY - 15, font: font, size: 10, color: fontColor });

    page.drawText('VAT incl.:', { x: col2StartX, y: totalsY - 30, font: font, size: 10, color: fontColor });
    valueText = formatCurrency(totalNonBookVat);
    textWidth = font.widthOfTextAtSize(valueText, 10);
    page.drawText(valueText, { x: col2RightEdge - textWidth, y: totalsY - 30, font: font, size: 10, color: fontColor });

    // --- Column 3: Grand Totals ---
    const col3StartX = table.x + 10 + colWidth * 2;
    const col3RightEdge = col3StartX + colWidth - colPadding;
    page.drawText('Grand Totals', { x: col3StartX, y: totalsY, font: boldFont, size: 11, color: primaryColor });

    page.drawText('Total:', { x: col3StartX, y: totalsY - 15, font: boldFont, size: 10, color: fontColor });
    valueText = formatCurrency(totalAmount);
    textWidth = boldFont.widthOfTextAtSize(valueText, 10);
    page.drawText(valueText, { x: col3RightEdge - textWidth, y: totalsY - 15, font: boldFont, size: 10, color: fontColor });

    page.drawText('Total VAT incl.:', { x: col3StartX, y: totalsY - 30, font: boldFont, size: 10, color: fontColor });
    valueText = formatCurrency(totalVat);
    textWidth = boldFont.widthOfTextAtSize(valueText, 10);
    page.drawText(valueText, { x: col3RightEdge - textWidth, y: totalsY - 30, font: boldFont, size: 10, color: fontColor });

    y -= 45;

    // --- Receipts Section ---
    for (const expense of sortedExpenses) {
      if (expense.receipt_blob_id) {
        try {
          const blob = await this.blobService.getBlobById(expense.receipt_blob_id);
          const processAndDrawImage = async (imageBuffer: Buffer, imageType: 'png' | 'jpeg', pageNumInfo: string) => {
            page = pdfDoc.addPage(PageSizes.A4);
            const image = await (imageType === 'jpeg' ? pdfDoc.embedJpg(imageBuffer) : pdfDoc.embedPng(imageBuffer));
            const { width: pageWidth, height: pageHeight } = page.getSize();
            const pageMargin = 50;
            
            const titleY = pageHeight - pageMargin;
            page.drawText(`Receipt for: ${expense.title} ${pageNumInfo}`, { x: pageMargin, y: titleY, font: boldFont, size: 14, color: fontColor });

            const titleHeight = 30;
            const usableWidth = pageWidth - pageMargin * 2;
            const usableHeight = pageHeight - pageMargin * 2 - titleHeight;
            const scale = Math.min(usableWidth / image.width, usableHeight / image.height, 1);
            const imgWidth = image.width * scale;
            const imgHeight = image.height * scale;

            page.drawImage(image, {
              x: (pageWidth - imgWidth) / 2,
              y: titleY - titleHeight - imgHeight,
              width: imgWidth,
              height: imgHeight,
            });
          };

          if (blob.mimetype === 'image/jpeg' || blob.mimetype === 'image/png') {
            await processAndDrawImage(blob.data, blob.mimetype === 'image/jpeg' ? 'jpeg' : 'png', '');
          } else if (blob.mimetype === 'application/pdf') {
            const pageCount = await this.ocrService.getPdfPageCount(blob.data);
            for (let i = 1; i <= pageCount; i++) {
              const imageBuffer = await this.ocrService.convertPdfPageToPng(blob.data, i);
              await processAndDrawImage(imageBuffer, 'png', `(Page ${i}/${pageCount})`);
            }
          }
        } catch (error) {
          this.logger.error(`Could not attach receipt for expense ${expense.id}:`, error);
        }
      }
    }

    // --- Page Numbering ---
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
        const currentPage = pages[i];
        const { width: pageWidth, height: pageHeight } = currentPage.getSize();
        const pageNumText = `Page ${i + 1} of ${pages.length}`;
        const textWidth = font.widthOfTextAtSize(pageNumText, 8);
        
        currentPage.drawText(pageNumText, {
            x: pageWidth - margin - textWidth,
            y: margin / 2,
            font: font,
            size: 8,
            color: fontColor
        });
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
