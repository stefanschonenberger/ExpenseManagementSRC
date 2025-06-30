// backend/src/expense-report/dto/create-expense-report.dto.ts

import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateExpenseReportDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  /**
   * An array of expense IDs to associate with this report.
   * Each ID must be a valid UUID.
   */
  @IsArray()
  @IsUUID('all', { each: true }) // Validates that each item in the array is a UUID
  @IsNotEmpty()
  expense_ids: string[];
}
