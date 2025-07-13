// backend/src/expense-report/dto/update-expense-report.dto.ts

import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID } from 'class-validator';

export class UpdateExpenseReportDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  expense_ids?: string[];
}
