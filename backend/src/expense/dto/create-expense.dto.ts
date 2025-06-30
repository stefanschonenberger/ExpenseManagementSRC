// ==========================================================
// File: src/expense/dto/create-expense.dto.ts
// This is the base DTO that defines all fields for a new expense.
// ==========================================================
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsInt, Min, IsBoolean, IsUUID } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

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
  
  @IsBoolean()
  @IsOptional()
  book?: boolean;
  
  @IsUUID()
  @IsOptional()
  receipt_blob_id?: string;
}