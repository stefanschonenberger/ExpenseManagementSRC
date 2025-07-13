// backend/src/blob/blob.controller.ts

import { Controller, Get, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors, ParseUUIDPipe, SetMetadata } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard'; 
import { BlobService } from './blob.service';
import { OcrService } from 'src/ocr/ocr.service';
import { Response, Express } from 'express';

// Define a custom decorator for public routes
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Removed @UseGuards(JwtAuthGuard) from here and from individual methods.
// The JwtAuthGuard is now applied globally via APP_GUARD in app.module.ts.
@Controller('blob') 
export class BlobController {
    constructor(
        private readonly blobService: BlobService,
        private readonly ocrService: OcrService,
    ) {}

    /**
     * Handles file uploads to the blob storage. This route is now protected by the global JwtAuthGuard.
     * @param file The uploaded file (from Multer).
     * @returns The ID of the newly created blob.
     */
    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        return this.blobService.uploadBlob(file.originalname, file.mimetype, file.buffer);
    }

    /**
     * Retrieves a blob by its ID and serves it as a file. This route is public.
     * The @Public() decorator bypasses the global JwtAuthGuard.
     * @param id The UUID of the blob to retrieve.
     * @param res The Express response object for sending the file.
     */
    @Public() // Mark this route as public, bypassing the global JWT guard
    @Get(':id')
    async getFile(@Param('id', new ParseUUIDPipe()) id: string, @Res() res: Response) {
        const file = await this.blobService.getBlobById(id);
        res.setHeader('Content-Type', file.mimetype);
        res.send(file.data);
    }

    /**
     * Scans a blob (receipt image/PDF) using OCR.space and returns parsed data, overlay,
     * and the blob ID of the OCR'd image for display on the frontend. This route is now protected by the global JwtAuthGuard.
     * @param id The UUID of the blob to scan.
     * @returns An object containing parsed OCR data, text overlay information,
     * and the blob ID of the image used for OCR (which might be a converted PDF).
     */
    @Post(':id/scan')
    async scanFile(@Param('id', new ParseUUIDPipe()) id: string) {
        const file = await this.blobService.getBlobById(id);
        
        const scanResult = await this.ocrService.scanReceipt(file.data, file.mimetype, file.filename);

        let ocrImageBlobId: string | null = null;

        if (scanResult.ocrImageBuffer && scanResult.ocrImageMimeType) {
            const uploadedOcrImage = await this.blobService.uploadBlob(
                file.filename.replace(/\.pdf$/i, '.png'), 
                scanResult.ocrImageMimeType,
                scanResult.ocrImageBuffer
            );
            ocrImageBlobId = uploadedOcrImage.id;
        } else {
            ocrImageBlobId = file.id;
        }

        return {
            parsedData: scanResult.parsedData,
            rawText: scanResult.rawText,
            overlay: scanResult.overlay,
            ocrImageBlobId: ocrImageBlobId 
        };
    }
}
