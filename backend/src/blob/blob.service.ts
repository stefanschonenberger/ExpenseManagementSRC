// backend/src/blob/blob.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blob } from './blob.entity';

@Injectable()
export class BlobService {
    constructor(
        @InjectRepository(Blob, 'blob_db') // Ensure 'blob_db' connection is used
        private readonly blobRepository: Repository<Blob>
    ) {}

    async uploadBlob(filename: string, mimetype: string, data: Buffer): Promise<{ id: string }> {
        // FIX: Ensure 'data' is correctly assigned and saved.
        // Also, add logging to confirm what's being saved.
        const newBlob = this.blobRepository.create({ filename, mimetype, data });
        console.log(`BlobService: Attempting to save blob: ${filename}, mimetype: ${mimetype}, data length: ${data.length}`);
        const savedBlob = await this.blobRepository.save(newBlob);
        console.log(`BlobService: Successfully saved blob with ID: ${savedBlob.id}`);
        return { id: savedBlob.id };
    }

    async getBlobById(id: string): Promise<Blob> {
        // FIX: Add logging to confirm what's being retrieved.
        const file = await this.blobRepository.findOne({ where: { id } });
        if (!file) {
            console.warn(`BlobService: File with ID ${id} not found.`);
            throw new NotFoundException('File not found');
        }
        console.log(`BlobService: Retrieved file with ID ${id}, filename: ${file.filename}, mimetype: ${file.mimetype}, data length: ${file.data ? file.data.length : 'null'}`);
        return file;
    }

    /**
     * Deletes a blob from the database by its ID.
     */
    async deleteBlob(id: string): Promise<void> {
        const result = await this.blobRepository.delete(id);
        if (result.affected === 0) {
            console.warn(`BlobService: Attempted to delete blob with ID ${id}, but it was not found.`);
        } else {
            console.log(`BlobService: Successfully deleted blob with ID: ${id}`);
        }
    }
}
