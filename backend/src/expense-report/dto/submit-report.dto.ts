// backend/src/expense-report/dto/submit-report.dto.ts

import { IsNotEmpty, IsUUID } from 'class-validator';

export class SubmitReportDto {
  @IsUUID()
  @IsNotEmpty()
  manager_id: string;
}
