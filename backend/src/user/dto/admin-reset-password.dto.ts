// ==========================================================
// File: src/user/dto/admin-reset-password.dto.ts
// This file is correct but included for completeness.
// ==========================================================
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminResetPasswordDto {
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @IsNotEmpty()
  newPassword: string;
}