// backend/src/expense/dto/create-expense.dto.ts

import { IsString, IsNotEmpty, IsOptional, IsDateString, IsInt, Min, IsBoolean, IsUUID } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  supplier?: string;

  @IsDateString()
  @IsNotEmpty()
  expense_date: Date;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency_code: string;

  @IsString()
  @IsNotEmpty()
  expense_type: string;

  @IsBoolean()
  @IsNotEmpty()
  vat_applied: boolean;

  @IsInt()
  @IsOptional()
  vat_amount?: number;

  @IsBoolean()
  @IsOptional()
  book?: boolean;
  
  @IsInt()
  @IsOptional()
  book_amount?: number;

  @IsUUID()
  @IsOptional()
  receipt_blob_id?: string;

  @IsUUID()
  @IsOptional()
  transientOcrBlobId?: string;
}