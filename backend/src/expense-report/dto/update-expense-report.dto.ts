// backend/src/expense-report/dto/update-expense-report.dto.ts

import { IsNotEmpty, IsString } from 'class-validator'; // FIX: Add missing imports

// For now, we only allow updating the title.
// We can easily add other fields here later.
export class UpdateExpenseReportDto {
  @IsString()
  @IsNotEmpty()
  title: string;
}
