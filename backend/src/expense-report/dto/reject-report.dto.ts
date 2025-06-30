// backend/src/expense-report/dto/reject-report.dto.ts

import { IsNotEmpty, IsString } from 'class-validator';

export class RejectReportDto {
  @IsString()
  @IsNotEmpty({ message: 'A rejection reason is required.' })
  reason: string;
}
