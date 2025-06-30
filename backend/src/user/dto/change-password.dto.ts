// src/user/dto/change-password.dto.ts

import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @IsNotEmpty()
  newPassword: string;
}