// src/auth/guard/roles.guard.ts

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from 'src/user/entities/user.entity';
import { ROLES_KEY } from '../decorator/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();

    // FIX: Check the 'user.roles' array (plural) to see if it contains
    // any of the roles required by the endpoint.
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
