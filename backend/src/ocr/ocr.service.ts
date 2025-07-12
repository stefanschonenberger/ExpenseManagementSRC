// backend/src/ocr/ocr.service.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async scanReceipt(fileBuffer: Buffer, mimetype: string, filename: string): Promise<any> {
    const ocrApiKey = this.configService.get<string>('OCR_SPACE_API_KEY');
    const ocrApiUrl = 'https://api.ocr.space/parse/image';

    if (!ocrApiKey) {
      this.logger.error('OCR.space API Key is not configured.');
      throw new Error('OCR service is not configured.');
    }

    const formData = new FormData();
    formData.append('apikey', ocrApiKey);
    formData.append('file', fileBuffer, { filename, contentType: mimetype });
    formData.append('OCREngine', '2');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('isOverlayRequired', 'true');

    try {
      this.logger.log('Sending document to OCR.space for processing...');
      const response = await firstValueFrom(
        this.httpService.post(ocrApiUrl, formData, {
          headers: { ...formData.getHeaders() },
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
      const specificMessage = error.response?.message || error.message || 'Could not process the document with OCR.space.';
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
