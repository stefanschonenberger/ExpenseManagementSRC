// ==========================================================
// File: src/blob/blob.service.ts
// Add a new `deleteBlob` method to this service.
// ==========================================================
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blob } from './blob.entity';

@Injectable()
export class BlobService {
    constructor(
        @InjectRepository(Blob, 'blob_db')
        private readonly blobRepository: Repository<Blob>
    ) {}

    async uploadBlob(filename: string, mimetype: string, data: Buffer): Promise<{ id: string }> {
        const newBlob = this.blobRepository.create({ filename, mimetype, data });
        const savedBlob = await this.blobRepository.save(newBlob);
        return { id: savedBlob.id };
    }

    async getBlobById(id: string): Promise<Blob> {
        const file = await this.blobRepository.findOne({ where: { id } });
        if (!file) {
            throw new NotFoundException('File not found');
        }
        return file;
    }

    /**
     * Deletes a blob from the database by its ID.
     */
    async deleteBlob(id: string): Promise<void> {
        const result = await this.blobRepository.delete(id);
        if (result.affected === 0) {
            // We can choose to throw an error or just log it.
            // For a cleanup operation, logging might be better than failing the whole request.
            console.warn(`Attempted to delete blob with ID ${id}, but it was not found.`);
        }
    }
}