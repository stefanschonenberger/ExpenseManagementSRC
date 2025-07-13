// backend/src/auth/auth.controller.ts

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
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { Request } from 'express';
import { Public } from 'src/blob/blob.controller'; // Import the Public decorator

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public() // Mark this route as public
  @Post('register')
  async register(@Body(new ValidationPipe()) createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Public() // Mark this route as public
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

  // This route should remain protected
  @UseGuards(JwtAuthGuard) // Explicitly apply guard here if you want to be clear, though global guard covers it
  @Get('profile')
  getProfile(@Req() req: Request) {
    return req.user;
  }
}
