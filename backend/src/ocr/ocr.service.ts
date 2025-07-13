// backend/src/ocr/ocr.service.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';
import { exec, execFile } from 'child_process'; // Import exec and execFile
import * as fs from 'fs/promises'; // For file system operations (async)
import * as path from 'path'; // For path manipulation
import * as os from 'os'; // For temporary directory

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Converts the first page of a PDF buffer to a PNG image buffer using Ghostscript.
   * This method creates temporary files for input and output.
   * @param pdfBuffer The buffer of the PDF file.
   * @returns A Promise that resolves with the PNG image buffer.
   * @throws Error if conversion fails.
   */
  private async convertPdfPageToPng(pdfBuffer: Buffer): Promise<Buffer> {
    const tempDir = os.tmpdir();
    const inputPdfPath = path.join(tempDir, `input_${Date.now()}.pdf`);
    const outputPngPath = path.join(tempDir, `output_${Date.now()}.png`);

    try {
      // 1. Write the PDF buffer to a temporary file
      await fs.writeFile(inputPdfPath, pdfBuffer);
      this.logger.debug(`Temporary PDF written to: ${inputPdfPath}`);

      // 2. Construct the Ghostscript command for Windows
      // -sDEVICE=png16m: Output device is 24-bit PNG
      // -r300: Resolution 300 DPI
      // -dQUIET: Suppress startup messages
      // -dBATCH -dNOPAUSE: Exit after processing
      // -dFirstPage=1 -dLastPage=1: Process only the first page
      // -sOutputFile=: Output file path
      // The Ghostscript executable name for Windows (adjust if you installed 32-bit or different version)
      const gsExecutable = 'gswin64c.exe'; 
      const gsArgs = [
        '-sDEVICE=png16m',
        '-r300',
        '-dQUIET',
        '-dBATCH',
        '-dNOPAUSE',
        '-dFirstPage=1',
        '-dLastPage=1',
        `-sOutputFile=${outputPngPath}`,
        inputPdfPath,
      ];

      this.logger.log(`Executing Ghostscript: ${gsExecutable} ${gsArgs.join(' ')}`);

      // Execute Ghostscript command
      await new Promise<void>((resolve, reject) => {
        const child = execFile(gsExecutable, gsArgs, (error, stdout, stderr) => {
          if (error) {
            this.logger.error(`Ghostscript error: ${error.message}`);
            this.logger.error(`Ghostscript stderr: ${stderr}`);
            return reject(new Error(`PDF conversion failed: ${stderr || error.message}`));
          }
          if (stderr) {
            this.logger.warn(`Ghostscript warnings: ${stderr}`);
          }
          resolve();
        });
      });

      // 3. Read the generated PNG image file
      const imageBuffer = await fs.readFile(outputPngPath);
      this.logger.debug(`Generated PNG read from: ${outputPngPath}`);
      return imageBuffer;

    } catch (error) {
      this.logger.error(`Error during PDF to PNG conversion: ${error.message}`, error.stack);
      throw new Error(`Failed to convert PDF to image: ${error.message}`);
    } finally {
      // 4. Clean up temporary files
      try {
        await fs.unlink(inputPdfPath);
        this.logger.debug(`Deleted temporary PDF: ${inputPdfPath}`);
      } catch (err) {
        this.logger.warn(`Failed to delete temporary PDF ${inputPdfPath}: ${err.message}`);
      }
      try {
        await fs.unlink(outputPngPath);
        this.logger.debug(`Deleted temporary PNG: ${outputPngPath}`);
      } catch (err) {
        this.logger.warn(`Failed to delete temporary PNG ${outputPngPath}: ${err.message}`);
      }
    }
  }

  async scanReceipt(fileBuffer: Buffer, mimetype: string, filename: string): Promise<any> {
    let imageBufferForOcr = fileBuffer;
    let imageMimeTypeForOcr = mimetype;
    let originalFilenameForOcr = filename; // Keep track of filename for OCR.space

    // If it's a PDF, convert to image first for OCR
    if (mimetype === 'application/pdf') {
      try {
        this.logger.log('Converting PDF to image for OCR...');
        imageBufferForOcr = await this.convertPdfPageToPng(fileBuffer);
        imageMimeTypeForOcr = 'image/png'; // Ghostscript output is PNG
        originalFilenameForOcr = filename.replace(/\.pdf$/i, '.png'); // Change extension for OCR.space
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
    // Use the potentially converted image buffer and its new mimetype/filename
    formData.append('file', imageBufferForOcr, { filename: originalFilenameForOcr, contentType: imageMimeTypeForOcr }); 
    formData.append('OCREngine', '2');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('isOverlayRequired', 'true');

    try {
      this.logger.log('Sending document to OCR.space for processing...');
      const response = await firstValueFrom(
        this.httpService.post(ocrApiUrl, formData, {
          headers: { ...formData.getHeaders() },
          maxContentLength: Infinity, // Allow large file uploads
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
