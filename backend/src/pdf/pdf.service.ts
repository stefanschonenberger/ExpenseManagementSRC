// backend/src/pdf/pdf.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ExpenseReport, ReportStatus } from 'src/expense-report/entities/expense-report.entity';
import { PDFDocument, rgb, StandardFonts, PageSizes, PDFFont, degrees } from 'pdf-lib';
import { BlobService } from 'src/blob/blob.service';
import { OcrService } from 'src/ocr/ocr.service';
import { User } from 'src/user/entities/user.entity';
import { AdminSettings } from 'src/admin/entities/admin-settings.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as sharp from 'sharp';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    private readonly blobService: BlobService,
    private readonly ocrService: OcrService,
  ) {}

  async generatePdf(report: ExpenseReport, settings: AdminSettings): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const primaryColor = rgb(0.039, 0.455, 0.855); // #0A74DA
    const grayColor = rgb(0.95, 0.95, 0.95);
    const fontColor = rgb(0.2, 0.2, 0.2);
    const whiteColor = rgb(1, 1, 1);

    const margin = 25;
    let y = height - margin;
    const headerY = y;

    // --- Add Logo ---
    try {
        const logoPath = path.join(process.cwd(), 'dist', 'assets', 'opia-tech.png');
        const logoImageBytes = await fs.readFile(logoPath);
        const logoImage = await pdfDoc.embedPng(logoImageBytes);
        
        const logoDims = logoImage.scale(0.175); 

        page.drawImage(logoImage, {
            x: width - margin - logoDims.width,
            y: headerY - logoDims.height + (boldFont.heightAtSize(24) * 0.2),
            width: logoDims.width,
            height: logoDims.height,
        });
    } catch (error) {
        this.logger.error('Could not load or embed the logo image.', error);
    }


    // --- Helper Functions ---
    const formatCurrency = (amountInCents: number) => {
        if (amountInCents === null || amountInCents === undefined || amountInCents === 0) return '-';
        return `R ${(amountInCents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    };

    const formatDate = (dateString: string | Date): string => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
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
            textX = currentX + col.width - textWidth - 5;
        } else if (col.align === 'center') {
            textX = currentX + (col.width - textWidth) / 2;
        } else {
            textX = currentX + 5;
        }
        page.drawText(text, { x: textX, y, font, size, color });
    };

    // --- Header ---
    const headingY = headerY - 6;
    page.drawText('Expense Report', { x: margin, y: headingY, font: boldFont, size: 24, color: primaryColor });
    y = headingY - 40;

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

    // --- Data Aggregation for Summary ---
    const expenseSummary = new Map<string, { claim: number, bookClaim: number }>();
    const expenseTypesFromSettings = settings.expense_types || [];
    expenseTypesFromSettings.forEach(type => {
        expenseSummary.set(type, { claim: 0, bookClaim: 0 });
    });

    report.expenses.forEach(expense => {
        if (!expenseSummary.has(expense.expense_type)) {
            expenseSummary.set(expense.expense_type, { claim: 0, bookClaim: 0 });
        }
        const summary = expenseSummary.get(expense.expense_type)!;
        
        if (expense.book) {
            summary.bookClaim += expense.book_amount;
        } else {
            summary.claim += expense.amount;
        }
    });

    // --- Draw Summary Section ---
    const summaryRightAlignX = width - margin;

    page.drawText('Claim Total', { x: margin, y, font: boldFont, size: 12, color: fontColor });
    let totalAmountText = formatCurrency(report.total_amount);
    let textWidth = boldFont.widthOfTextAtSize(totalAmountText, 12);
    page.drawText(totalAmountText, { x: summaryRightAlignX - textWidth, y, font: boldFont, size: 12, color: fontColor });
    y -= 20;

    page.drawText('VAT', { x: margin, y, font: boldFont, size: 12, color: fontColor });
    let totalVatText = formatCurrency(report.total_vat_amount);
    textWidth = boldFont.widthOfTextAtSize(totalVatText, 12);
    page.drawText(totalVatText, { x: summaryRightAlignX - textWidth, y, font: boldFont, size: 12, color: fontColor });
    y -= 15;

    page.drawLine({ start: { x: margin, y: y + 5 }, end: { x: width - margin, y: y + 5 }, thickness: 0.5, color: rgb(0,0,0) });
    y -= 15;

    const summaryTableWidth = width - margin * 2;
    const claimColX = margin + summaryTableWidth * 0.6;
    const bookClaimColX = margin + summaryTableWidth * 0.8;


    page.drawText('Claim', { x: claimColX, y, font: boldFont, size: 10, color: fontColor });
    page.drawText('Book Claim', { x: bookClaimColX, y, font: boldFont, size: 10, color: fontColor });
    y -= 20;

    const sortedExpenseTypes = [...expenseTypesFromSettings].sort();
    for (const type of sortedExpenseTypes) {
        const amounts = expenseSummary.get(type);
        if (!amounts || (amounts.claim === 0 && amounts.bookClaim === 0)) {
            continue;
        }
        
        if (y < margin + 20) {
            page = pdfDoc.addPage(PageSizes.A4);
            y = height - margin;
        }

        page.drawText(type, { x: margin, y, font, size: 10, color: fontColor });
        
        if (amounts.claim > 0) {
            const claimText = formatCurrency(amounts.claim);
            page.drawText(claimText, { x: claimColX, y, font, size: 10, color: fontColor });
        } else {
            page.drawText('-', { x: claimColX, y, font, size: 10, color: fontColor });
        }
        
        if (amounts.bookClaim > 0) {
            const bookClaimText = formatCurrency(amounts.bookClaim);
            page.drawText(bookClaimText, { x: bookClaimColX, y, font, size: 10, color: fontColor });
        } else {
             page.drawText('-', { x: bookClaimColX, y, font, size: 10, color: fontColor });
        }
        y -= 15;
    }
    
    y -= 30;

    // --- Expenses Table ---
    const table = {
      x: margin,
      y,
      width: width - margin * 2,
      header: { height: 25, color: primaryColor, fontColor: whiteColor },
      row: { height: 20, evenColor: whiteColor, oddColor: grayColor },
      columns: [
        { header: 'Supplier', key: 'supplier', width: (width - margin * 2) * 0.25, align: 'left' },
        { header: 'Description', key: 'title', width: (width - margin * 2) * 0.25, align: 'left' },
        { header: 'Category', key: 'type', width: (width - margin * 2) * 0.20, align: 'left' },
        { header: 'Book Amt', key: 'book_amount', width: (width - margin * 2) * 0.1, align: 'right' },
        { header: 'VAT', key: 'vat', width: (width - margin * 2) * 0.1, align: 'right' },
        { header: 'Total', key: 'amount', width: (width - margin * 2) * 0.1, align: 'right' },
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
    
    const sortedExpenses = [...report.expenses].sort((a, b) => new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime());

    sortedExpenses.forEach((expense, index) => {
      if (y < margin + table.row.height) {
        page = pdfDoc.addPage(PageSizes.A4);
        y = height - margin;
      }

      const rowColor = index % 2 === 0 ? table.row.evenColor : table.row.oddColor;
      page.drawRectangle({ x: table.x, y, width: table.width, height: -table.row.height, color: rowColor });
      
      let currentX = table.x;
      const rowY = y - 13;
      const fontSize = 7;

      drawCell(expense.supplier || 'N/A', table.columns[0], currentX, rowY, font, fontSize, fontColor);
      currentX += table.columns[0].width;

      drawCell(expense.title, table.columns[1], currentX, rowY, font, fontSize, fontColor);
      currentX += table.columns[1].width;
      
      drawCell(expense.expense_type, table.columns[2], currentX, rowY, font, fontSize, fontColor);
      currentX += table.columns[2].width;

      const bookAmountText = expense.book ? formatCurrency(expense.book_amount) : '-';
      drawCell(bookAmountText, table.columns[3], currentX, rowY, font, fontSize, fontColor);
      currentX += table.columns[3].width;

      drawCell(formatCurrency(expense.vat_amount), table.columns[4], currentX, rowY, font, fontSize, fontColor);
      currentX += table.columns[4].width;
      
      drawCell(formatCurrency(expense.amount), table.columns[5], currentX, rowY, font, fontSize, fontColor);

      totalAmount += expense.amount;
      totalVat += expense.vat_amount;
      if (expense.book) {
        totalBookAmount += expense.book_amount;
      }
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
    textWidth = font.widthOfTextAtSize(valueText, 10);
    page.drawText(valueText, { x: col1RightEdge - textWidth, y: totalsY - 15, font: font, size: 10, color: fontColor });

    // --- Column 2: Non-Book Totals ---
    const col2StartX = table.x + colWidth;
    const col2RightEdge = col2StartX + colWidth - colPadding;
    page.drawText('Non-Book Totals', { x: col2StartX, y: totalsY, font: boldFont, size: 11, color: primaryColor });
    const nonBookTotal = totalAmount - totalBookAmount;
    page.drawText('Subtotal:', { x: col2StartX, y: totalsY - 15, font: font, size: 10, color: fontColor });
    valueText = formatCurrency(nonBookTotal);
    textWidth = font.widthOfTextAtSize(valueText, 10);
    page.drawText(valueText, { x: col2RightEdge - textWidth, y: totalsY - 15, font: font, size: 10, color: fontColor });

    page.drawText('VAT incl.:', { x: col2StartX, y: totalsY - 30, font: font, size: 10, color: fontColor });
    valueText = formatCurrency(totalVat);
    textWidth = font.widthOfTextAtSize(valueText, 10);
    page.drawText(valueText, { x: col2RightEdge - textWidth, y: totalsY - 30, font: font, size: 10, color: fontColor });

    // --- Column 3: Grand Totals ---
    const col3StartX = table.x + (colWidth * 2);
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
            
            const compressedImageBuffer = await sharp(imageBuffer)
                .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 75, progressive: true })
                .toBuffer();
            
            page = pdfDoc.addPage(PageSizes.A4);
            const image = await pdfDoc.embedJpg(compressedImageBuffer);
            
            const { width: pageWidth, height: pageHeight } = page.getSize();
            const pageMargin = 25;
            
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
            await processAndDrawImage(blob.data, 'jpeg', '');
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
    
    const pages = pdfDoc.getPages();

    // --- Add Watermark if needed ---
    if (report.status === ReportStatus.DRAFT || report.status === ReportStatus.SUBMITTED) {
        const text = 'DRAFT';
        const fontSize = 120;
        const textWidth = boldFont.widthOfTextAtSize(text, fontSize);
        const textHeight = boldFont.heightAtSize(fontSize);

        for (const page of pages) {
            const { width, height } = page.getSize();
            page.drawText(text, {
                x: width / 2 - textWidth / 2,
                y: height / 2 + textHeight / 4,
                font: boldFont,
                size: fontSize,
                color: rgb(0.8, 0.8, 0.8),
                opacity: 0.2,
                rotate: degrees(-45),
            });
        }
    }

    // --- Page Numbering ---
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

    const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
    return Buffer.from(pdfBytes);
  }
}