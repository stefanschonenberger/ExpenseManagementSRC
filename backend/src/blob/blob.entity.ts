// src/blob/blob.entity.ts

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'blobs', database: 'expense_blobs' }) // Specify the correct database
export class Blob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column()
  mimetype: string;

  // 'bytea' is the PostgreSQL type for storing binary data.
  @Column({ type: 'bytea' })
  data: Buffer;
}