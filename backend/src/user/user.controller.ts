// src/user/user.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { Request } from 'express';
import { User } from './entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';

// All routes in this controller are protected by default.
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Endpoint for the logged-in user to change their own password.
   * This is a PATCH request to a static path, so it won't conflict with other routes.
   */
  @Patch('change-password')
  changePassword(
    @Req() req: Request,
    @Body(new ValidationPipe()) changePasswordDto: ChangePasswordDto,
  ) {
    const user = req.user as User;
    return this.userService.changePassword(user.id, changePasswordDto);
  }

  /**
   * New endpoint to check if the logged-in user has any management responsibilities.
   */
  @Get('is-manager')
  checkIfManager(@Req() req: Request) {
      const user = req.user as User;
      return this.userService.isManagerOfAnyone(user);
  }

  /**
   * New endpoint to get the managers for the logged-in user.
   */
  @Get('my-managers')
  getMyManagers(@Req() req: Request) {
    const user = req.user as User;
    return this.userService.findMyManagers(user);
  }

  // NOTE: The following endpoints are currently only used by the Admin module.
  // They are kept here as part of the user resource but are not directly
  // accessible except through the admin controller's service calls.

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.userService.findOne(id);
  }

  // This endpoint is effectively admin-only because the AdminController is the
  // only thing that calls the underlying service method.
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string, 
    @Body(new ValidationPipe()) updateUserDto: UpdateUserDto
  ) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.userService.remove(id);
  }
}