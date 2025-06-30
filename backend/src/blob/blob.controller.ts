// src/blob/blob.controller.ts

import { Controller, Get, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors, ParseUUIDPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { BlobService } from './blob.service';
import { Response, Express } from 'express'; // Import Express

@UseGuards(JwtAuthGuard)
@Controller('blob')
export class BlobController {
    constructor(private readonly blobService: BlobService) {}

    @Post('upload')
    @UseInterceptors(FileInterceptor('file')) // 'file' must match the field name in the form-data
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        return this.blobService.uploadBlob(file.originalname, file.mimetype, file.buffer);
    }

    @Get(':id')
    async getFile(@Param('id', new ParseUUIDPipe()) id: string, @Res() res: Response) {
        const file = await this.blobService.getBlobById(id);
        res.setHeader('Content-Type', file.mimetype);
        res.send(file.data);
    }
}