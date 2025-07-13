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
    // Read from environment variable, default to 'gs' for Linux/macOS environments
    return this.configService.get<string>('GHOSTSCRIPT_PATH', 'gs');
  }

  /**
   * Counts the number of pages in a PDF buffer using Ghostscript.
   * @param pdfBuffer The buffer containing the PDF file data.
   * @returns A promise that resolves to the number of pages.
   */
  public async getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
    const tempDir = os.tmpdir();
    const inputPdfPath = path.join(tempDir, `info_${Date.now()}.pdf`);
    const gsExecutable = this.getGhostscriptExecutable();

    try {
      await fs.writeFile(inputPdfPath, pdfBuffer);
      // NOTE: Ensure Ghostscript is installed and in the system's PATH.
      // 'gswin64c.exe' is for Windows. Use 'gs' on Linux/macOS.
      const gsExecutable = 'gswin64c.exe';
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
      return 0; // Return 0 if counting fails
    } finally {
      // Clean up the temporary file.
      await fs.unlink(inputPdfPath).catch(err => this.logger.warn(`Failed to delete temp info file: ${err.message}`));
    }
  }

  /**
   * Converts a specific page of a PDF buffer to a PNG image buffer.
   * @param pdfBuffer The buffer containing the PDF file data.
   * @param pageNumber The 1-based index of the page to convert.
   * @returns A promise that resolves to a buffer containing the PNG image data.
   */
  public async convertPdfPageToPng(pdfBuffer: Buffer, pageNumber: number): Promise<Buffer> {
    const tempDir = os.tmpdir();
    const inputPdfPath = path.join(tempDir, `input_${Date.now()}_p${pageNumber}.pdf`);
    const outputPngPath = path.join(tempDir, `output_${Date.now()}_p${pageNumber}.png`);
    const gsExecutable = this.getGhostscriptExecutable();

    try {
      await fs.writeFile(inputPdfPath, pdfBuffer);
      this.logger.debug(`Temporary PDF written to: ${inputPdfPath}`);

      const gsExecutable = 'gswin64c.exe'; 
      const gsArgs = [
        '-sDEVICE=png16m',
        '-r300', // High resolution for better OCR quality
        '-dQUIET',
        '-dBATCH',
        '-dNOPAUSE',
        `-dFirstPage=${pageNumber}`,
        `-dLastPage=${pageNumber}`,
        `-sOutputFile=${outputPngPath}`,
        inputPdfPath,
      ];

      this.logger.log(`Executing Ghostscript: ${gsExecutable} ${gsArgs.join(' ')}`);

      await execFileAsync(gsExecutable, gsArgs);

      const imageBuffer = await fs.readFile(outputPngPath);
      this.logger.debug(`Generated PNG read from: ${outputPngPath}`);
      return imageBuffer;

    } catch (error) {
      this.logger.error(`Error during PDF to PNG conversion for page ${pageNumber}: ${error.message}`, error.stack);
      throw new Error(`Failed to convert page ${pageNumber} of PDF to image: ${error.message}`);
    } finally {
        // Clean up temporary files.
        await fs.unlink(inputPdfPath).catch(err => this.logger.warn(`Failed to delete temp input file: ${err.message}`));
        await fs.unlink(outputPngPath).catch(err => this.logger.warn(`Failed to delete temp output file: ${err.message}`));
    }
  }

  /**
   * Scans a receipt file (image or PDF) using OCR.space API.
   * If the file is a PDF, it converts the first page to an image before scanning.
   * @param fileBuffer The buffer of the file to scan.
   * @param mimetype The mimetype of the file.
   * @param filename The original filename.
   * @returns An object containing the parsed data, raw text, overlay info, and the image buffer used for OCR.
   */
  async scanReceipt(fileBuffer: Buffer, mimetype: string, filename: string): Promise<any> {
    let imageBufferForOcr = fileBuffer;
    let imageMimeTypeForOcr = mimetype;
    let originalFilenameForOcr = filename;

    // If it's a PDF, convert the first page to an image for OCR scanning.
    if (mimetype === 'application/pdf') {
      try {
        this.logger.log('Converting PDF to image for OCR...');
        imageBufferForOcr = await this.convertPdfPageToPng(fileBuffer, 1); 
        imageMimeTypeForOcr = 'image/png';
        originalFilenameForOcr = filename.replace(/\.pdf$/i, '.png'); 
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
  
  /**
   * Parses the raw text from OCR.space to extract structured data like total, VAT, date, and supplier.
   * @param text The raw text string from the OCR response.
   * @returns An object with the parsed expense data.
   */
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

    const totalRegex = /(?:total|amount|pay|balance|due)[\s:]*R?([\d\s,]+\.\d{2})/i;
    const vatRegex = /(?:vat|tax)[\s:]*R?([\d\s,]+\.\d{2})/i;
    const dateRegex = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})|(\d{4}-\d{2}-\d{2})/;

    const potentialTotals: number[] = [];

    lines.forEach(line => {
        const totalMatch = line.match(totalRegex);
        if (totalMatch && totalMatch[1]) {
            potentialTotals.push(parseFloat(totalMatch[1].replace(/[\s,]/g, '')));
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
        const match = dateStr.replace(/\s/g, '').match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
        if (match) {
            const day = match[1].padStart(2, '0');
            const month = match[2].padStart(2, '0');
            const year = match[3];
            return `${year}-${month}-${day}`;
        }
        return new Date(dateStr).toISOString().split('T')[0];
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
