// ==========================================================
// File: src/user/dto/create-user.dto.ts
// This is the most critical fix. It changes 'role' to 'roles'.
// ==========================================================
import { IsEmail, IsString, MinLength, IsNotEmpty, IsEnum, IsArray, ArrayMinSize } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  full_name: string;

  // FIX: This property must be 'roles' and expect an array.
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(UserRole, { each: true, message: 'Each role must be a valid UserRole enum value' })
  @IsNotEmpty()
  roles: UserRole[];
}