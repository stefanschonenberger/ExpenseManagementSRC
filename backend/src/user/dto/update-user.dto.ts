// ==========================================================
// File: src/user/dto/update-user.dto.ts
// This file inherits from CreateUserDto and should remain as is.
// ==========================================================
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
