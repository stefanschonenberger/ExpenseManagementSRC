// backend/src/pdf/pdf.service.ts

import { Injectable } from '@nestjs/common';
import { ExpenseReport } from 'src/expense-report/entities/expense-report.entity';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { BlobService } from 'src/blob/blob.service';
import { Expense } from 'src/expense/entities/expense.entity';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class PdfService {
  constructor(private readonly blobService: BlobService) {}

  async generatePdf(
    report: ExpenseReport,
    expenses: Expense[],
    user: User,
    approver?: User,
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(
      StandardFonts.Helvetica_Bold,
    );

    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    let yPosition = height - 50;

    // Report Header
    page.drawText('Expense Report', {
      x: 50,
      y: yPosition,
      font: helveticaBoldFont,
      size: 24,
    });
    yPosition -= 30;

    // Report Details
    page.drawText(`Report ID: ${report.id}`, {
      x: 50,
      y: yPosition,
      font: helveticaFont,
      size: 12,
    });
    yPosition -= 20;
    page.drawText(`Report Name: ${report.name}`, {
      x: 50,
      y: yPosition,
      font: helveticaFont,
      size: 12,
    });
    yPosition -= 20;
    page.drawText(`Submitted by: ${user.firstName} ${user.lastName}`, {
      x: 50,
      y: yPosition,
      font: helveticaFont,
      size: 12,
    });
    yPosition -= 20;
    page.drawText(`Submission Date: ${new Date(report.submissionDate).toLocaleDateString()}`, {
      x: 50,
      y: yPosition,
      font: helveticaFont,
      size: 12,
    });
    yPosition -= 20;

    if (approver && report.approvalDate) {
      page.drawText(
        `Approved by: ${approver.firstName} ${approver.lastName}`,
        { x: 50, y: yPosition, font: helveticaFont, size: 12 },
      );
      yPosition -= 20;
      page.drawText(`Approval Date: ${new Date(report.approvalDate).toLocaleDateString()}`, {
        x: 50,
        y: yPosition,
        font: helveticaFont,
        size: 12,
      });
      yPosition -= 20;
    }

    yPosition -= 30;

    // Expenses Table Header
    page.drawText('Expenses', {
      x: 50,
      y: yPosition,
      font: helveticaBoldFont,
      size: 16,
    });
    yPosition -= 25;
    const tableTop = yPosition;
    page.drawText('Date', { x: 55, y: tableTop, font: helveticaBoldFont, size: 10 });
    page.drawText('Title', { x: 120, y: tableTop, font: helveticaBoldFont, size: 10 });
    page.drawText('Supplier', { x: 250, y: tableTop, font: helveticaBoldFont, size: 10 });
    page.drawText('Amount', { x: 400, y: tableTop, font: helveticaBoldFont, size: 10 });
    page.drawText('VAT', { x: 500, y: tableTop, font: helveticaBoldFont, size: 10 });
    yPosition -= 15;

    // Expenses Table Rows
    let totalAmount = 0;
    let totalVat = 0;
    for (const expense of expenses) {
      if (yPosition < 70) {
        page = pdfDoc.addPage();
        yPosition = height - 50;
      }
      page.drawText(new Date(expense.expense_date).toLocaleDateString(), {
        x: 55,
        y: yPosition,
        font: helveticaFont,
        size: 10,
      });
      page.drawText(expense.title, {
        x: 120,
        y: yPosition,
        font: helveticaFont,
        size: 10,
      });
      page.drawText(expense.supplier || 'N/A', {
        x: 250,
        y: yPosition,
        font: helveticaFont,
        size: 10,
      });
      page.drawText((expense.amount / 100).toFixed(2), {
        x: 400,
        y: yPosition,
        font: helveticaFont,
        size: 10,
      });
      page.drawText((expense.vat_amount / 100).toFixed(2), {
        x: 500,
        y: yPosition,
        font: helveticaFont,
        size: 10,
      });
      totalAmount += expense.amount;
      totalVat += expense.vat_amount;
      yPosition -= 15;
    }

    // Totals
    yPosition -= 10;
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: width - 50, y: yPosition },
      thickness: 1,
    });
    yPosition -= 20;
    page.drawText('Total Amount:', {
      x: 320,
      y: yPosition,
      font: helveticaBoldFont,
      size: 12,
    });
    page.drawText((totalAmount / 100).toFixed(2), {
      x: 400,
      y: yPosition,
      font: helveticaFont,
      size: 12,
    });
    page.drawText((totalVat / 100).toFixed(2), {
      x: 500,
      y: yPosition,
      font: helveticaFont,
      size: 12,
    });

    // Receipts
    for (const expense of expenses) {
      if (expense.receipt_blob_id) {
        const blob = await this.blobService.getBlobById(expense.receipt_blob_id);
        const isImage = blob && (blob.mimetype === 'image/jpeg' || blob.mimetype === 'image/png');
        
        if (isImage) {
          const image = await (blob.mimetype === 'image/jpeg'
            ? pdfDoc.embedJpg(blob.data)
            : pdfDoc.embedPng(blob.data));

          page = pdfDoc.addPage();
          const { width: pageWidth, height: pageHeight } = page.getSize();
          const margin = 50;
          
          page.drawText(`Receipt for: ${expense.title}`, {
            x: margin,
            y: pageHeight - margin + 10,
            font: helveticaBoldFont,
            size: 14,
          });

          // FIX: Robustly scale the image to fit within the page margins.
          const usableWidth = pageWidth - margin * 2;
          const usableHeight = pageHeight - margin * 2 - 40; // leave space for title

          // Use the scaleToFit method to get the correct dimensions
          const scaled = image.scaleToFit(usableWidth, usableHeight);

          // Center the image horizontally and place it below the title
          const xPosition = (pageWidth - scaled.width) / 2;
          const yPosition = pageHeight - margin - 40 - scaled.height;

          page.drawImage(image, {
            x: xPosition,
            y: yPosition,
            width: scaled.width,
            height: scaled.height,
          });
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
