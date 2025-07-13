// backend/src/pdf/pdf.module.ts

import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { BlobModule } from '../blob/blob.module';
import { OcrModule } from '../ocr/ocr.module';

@Module({
  imports: [BlobModule, OcrModule], // We need BlobService to fetch receipt images
  providers: [PdfService],
  exports: [PdfService], // Export so other modules can use it
})
export class PdfModule {}
