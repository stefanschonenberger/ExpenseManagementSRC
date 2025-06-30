// ==========================================================
// File: src/auth/auth.controller.ts
// This file is included for completeness.
// ==========================================================
import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  UnauthorizedException,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body(new ValidationPipe()) createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  async login(@Body(new ValidationPipe()) loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request) {
    return req.user;
  }
}