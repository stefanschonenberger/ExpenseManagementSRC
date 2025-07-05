import { Module } from '@nestjs/common';
import { PdfGenerationService } from './pdf.service';
import { BlobModule } from '../blob/blob.module';

@Module({
  imports: [BlobModule], // We need BlobService to fetch receipt images
  providers: [PdfGenerationService],
  exports: [PdfGenerationService], // Export so other modules can use it
})
export class PdfModule {}
