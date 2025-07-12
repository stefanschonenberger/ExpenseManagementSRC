// backend/src/blob/blob.controller.ts

import { Controller, Get, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors, ParseUUIDPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { BlobService } from './blob.service';
import { OcrService } from 'src/ocr/ocr.service';
import { Response, Express } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('blob')
export class BlobController {
    constructor(
        private readonly blobService: BlobService,
        private readonly ocrService: OcrService,
    ) {}

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        return this.blobService.uploadBlob(file.originalname, file.mimetype, file.buffer);
    }

    @Get(':id')
    async getFile(@Param('id', new ParseUUIDPipe()) id: string, @Res() res: Response) {
        const file = await this.blobService.getBlobById(id);
        res.setHeader('Content-Type', file.mimetype);
        res.send(file.data);
    }

    @Post(':id/scan')
    async scanFile(@Param('id', new ParseUUIDPipe()) id: string) {
        const file = await this.blobService.getBlobById(id);
        // FIX: Provide all three required arguments to the ocr.space service.
        return this.ocrService.scanReceipt(file.data, file.mimetype, file.filename);
    }
}
