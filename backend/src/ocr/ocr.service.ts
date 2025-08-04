// backend/src/ocr/ocr.service.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';
import { exec, execFile } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private getGhostscriptExecutable(): string {
    return this.configService.get<string>('GHOSTSCRIPT_PATH', 'gs');
  }

  public async getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
    const tempDir = os.tmpdir();
    const inputPdfPath = path.join(tempDir, `info_${Date.now()}.pdf`);
    const gsExecutable = this.getGhostscriptExecutable();

    try {
      await fs.writeFile(inputPdfPath, pdfBuffer);
      
      const gsArgs = [
        '-q',
        '-dNODISPLAY',
        '-c',
        `(${inputPdfPath.replace(/\\/g, '/')}) (r) file runpdfbegin pdfpagecount = quit`,
      ];
      
      this.logger.log(`Executing Ghostscript to get page count: ${gsExecutable} ${gsArgs.join(' ')}`);
      const { stdout } = await execFileAsync(gsExecutable, gsArgs);
      const pageCount = parseInt(stdout.trim(), 10);
      return isNaN(pageCount) ? 0 : pageCount;
    } catch (error) {
      this.logger.error(`Failed to get PDF page count: ${error.message}`, error.stack);
      return 0;
    } finally {
      await fs.unlink(inputPdfPath).catch(err => this.logger.warn(`Failed to delete temp info file: ${err.message}`));
    }
  }

  public async convertPdfPageToPng(pdfBuffer: Buffer, pageNumber: number): Promise<Buffer> {
    const tempDir = os.tmpdir();
    const inputPdfPath = path.join(tempDir, `input_${Date.now()}_p${pageNumber}.pdf`);
    // OPTIMIZATION: Change output to JPEG for better compression
    const outputImagePath = path.join(tempDir, `output_${Date.now()}_p${pageNumber}.jpeg`);
    const gsExecutable = this.getGhostscriptExecutable();

    try {
      await fs.writeFile(inputPdfPath, pdfBuffer);
      this.logger.debug(`Temporary PDF written to: ${inputPdfPath}`);

      // OPTIMIZATION: Switched to jpeg device, reduced DPI, and added quality/rendering hints.
      const gsArgs = [
        '-sDEVICE=jpeg',         // Use JPEG for smaller file sizes
        '-dJPEGQ=85',            // Set JPEG quality to 85%
        '-r150',                 // Reduce resolution to 150 DPI (still great for OCR)
        '-dTextAlphaBits=4',     // Enable text anti-aliasing for better OCR accuracy
        '-dGraphicsAlphaBits=4', // Enable graphics anti-aliasing
        '-dQUIET',
        '-dBATCH',
        '-dNOPAUSE',
        `-dFirstPage=${pageNumber}`,
        `-dLastPage=${pageNumber}`,
        `-sOutputFile=${outputImagePath}`,
        inputPdfPath,
      ];

      this.logger.log(`Executing Ghostscript: ${gsExecutable} ${gsArgs.join(' ')}`);

      await execFileAsync(gsExecutable, gsArgs);

      const imageBuffer = await fs.readFile(outputImagePath);
      this.logger.debug(`Generated JPEG read from: ${outputImagePath}`);
      return imageBuffer;

    } catch (error) {
      this.logger.error(`Error during PDF to Image conversion for page ${pageNumber}: ${error.message}`, error.stack);
      throw new Error(`Failed to convert page ${pageNumber} of PDF to image: ${error.message}`);
    } finally {
        await fs.unlink(inputPdfPath).catch(err => this.logger.warn(`Failed to delete temp input file: ${err.message}`));
        await fs.unlink(outputImagePath).catch(err => this.logger.warn(`Failed to delete temp output file: ${err.message}`));
    }
  }

  async scanReceipt(fileBuffer: Buffer, mimetype: string, filename: string): Promise<any> {
    let imageBufferForOcr = fileBuffer;
    let imageMimeTypeForOcr = mimetype;
    let originalFilenameForOcr = filename;

    if (mimetype === 'application/pdf') {
      try {
        this.logger.log('Converting PDF to image for OCR...');
        imageBufferForOcr = await this.convertPdfPageToPng(fileBuffer, 1); 
        // OPTIMIZATION: Mimetype is now jpeg
        imageMimeTypeForOcr = 'image/jpeg';
        originalFilenameForOcr = filename.replace(/\.pdf$/i, '.jpeg'); 
      } catch (pdfError) {
        this.logger.error(`Failed to convert PDF for OCR: ${pdfError.message}`);
        throw new BadRequestException('Failed to convert PDF for OCR.');
      }
    }
    
    const ocrApiKey = this.configService.get<string>('OCR_SPACE_API_KEY');
    const ocrApiUrl = 'https://api.ocr.space/parse/image';

    if (!ocrApiKey) {
      this.logger.error('OCR.space API Key is not configured.');
      throw new Error('OCR service is not configured.');
    }

    const formData = new FormData();
    formData.append('apikey', ocrApiKey);
    formData.append('file', imageBufferForOcr, { filename: originalFilenameForOcr, contentType: imageMimeTypeForOcr }); 
    formData.append('OCREngine', '2');
    formData.append('detectOrientation', 'true');
    formData.append('isOverlayRequired', 'true');
    formData.append('scale', 'true');

    try {
      this.logger.log('Sending document to OCR.space for processing...');
      const response = await firstValueFrom(
        this.httpService.post(ocrApiUrl, formData, {
          headers: { ...formData.getHeaders() },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }),
      );

      this.logger.debug('OCR.space raw response:', JSON.stringify(response.data));
      
      if (response.data && !response.data.IsErroredOnProcessing) {
        const parsedResult = response.data.ParsedResults[0];
        const parsedData = this.parseOcrSpaceResponse(parsedResult?.ParsedText);
        
        return {
          parsedData,
          rawText: parsedResult?.ParsedText,
          overlay: parsedResult?.TextOverlay,
          ocrImageBuffer: imageBufferForOcr,
          ocrImageMimeType: imageMimeTypeForOcr
        };

      } else {
        const errorMessage = response.data?.ErrorMessage?.join(', ') || 'OCR.space failed to process the document.';
        throw new BadRequestException(errorMessage);
      }
    } catch (error) {
      const specificMessage = error.response?.data?.message || error.message || 'Could not process the document with OCR.space.';
      this.logger.error(`Failed to scan document with OCR.space: ${specificMessage}`);
      throw new BadRequestException(specificMessage);
    }
  }
  
  private parseOcrSpaceResponse(text: string): any {
    this.logger.debug('Parsing OCR.space text...');
    if (!text) {
        this.logger.warn('No text was returned from OCR.space to parse.');
        return {};
    }

    const lines = text.split(/\r?\n/);
    let total = 0;
    let vat = 0;
    let date: string | null = null;
    let supplier = lines[0] || 'Scanned Expense';

    // This regex is now more flexible and will capture totals with or without a decimal part.
    const totalRegex = /(?:total|amount|pay|balance|due)[\s:]*R?([\d\s,]*(?:\.\d{1,2})?)/i;
    const vatRegex = /(?:vat|tax)[\s:]*R?([\d\s,]+\.\d{2})/i;
    const dateRegex = /(\d{1,2}\s*[\/\-.]\s*\d{1,2}\s*[\/\-.]\s*\d{4})|(\d{4}-\d{2}-\d{2})/;

    const potentialTotals: number[] = [];

    lines.forEach(line => {
        // The word "Bill" is common, so let's look for "Bill Total" specifically
        if (line.match(/bill total/i)) {
          const totalMatch = line.match(/([\d\s,]*(?:\.\d{1,2})?)/i);
          if (totalMatch && totalMatch[1]) {
            potentialTotals.push(parseFloat(totalMatch[1].replace(/[\s,]/g, '')));
          }
        } else {
          const totalMatch = line.match(totalRegex);
          if (totalMatch && totalMatch[1]) {
              potentialTotals.push(parseFloat(totalMatch[1].replace(/[\s,]/g, '')));
          }
        }

        const vatMatch = line.match(vatRegex);
        if (vatMatch && vatMatch[1]) {
            vat = parseFloat(vatMatch[1].replace(/[\s,]/g, ''));
        }

        const dateMatch = line.match(dateRegex);
        if (dateMatch && !date) {
            date = dateMatch[1] || dateMatch[2];
        }
    });

    if (potentialTotals.length > 0) {
        total = Math.max(...potentialTotals);
    }

    const parseSaDate = (dateStr: string | null): string | null => {
        if (!dateStr) return null;
        const cleanedDateStr = dateStr.replace(/\s/g, '');
        const match = cleanedDateStr.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
        if (match) {
            const day = match[1].padStart(2, '0');
            const month = match[2].padStart(2, '0');
            const year = match[3];
            return `${year}-${month}-${day}`;
        }
        try {
          return new Date(dateStr).toISOString().split('T')[0];
        } catch (e) {
          return null;
        }
    };

    const parsedData = {
      title: supplier,
      amount: Math.round(total * 100),
      expense_date: date ? parseSaDate(date) : new Date().toISOString().split('T')[0],
      supplier: supplier,
      vat_amount: Math.round(vat * 100),
      currency_code: 'ZAR',
    };

    this.logger.debug('Parsed OCR.space data:', parsedData);
    return parsedData;
  }
}