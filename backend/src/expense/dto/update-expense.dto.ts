// ==========================================================
// File: src/expense/dto/update-expense.dto.ts
// This file defines which fields of an expense can be updated.
// ==========================================================
import { PartialType } from '@nestjs/mapped-types';
import { CreateExpenseDto } from './create-expense.dto';

// By extending PartialType, all fields from CreateExpenseDto are
// inherited and automatically marked as optional.
export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}