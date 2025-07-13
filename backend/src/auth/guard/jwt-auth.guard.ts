// backend/src/auth/guard/jwt-auth.guard.ts

import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core'; // Import Reflector
import { IS_PUBLIC_KEY } from 'src/blob/blob.controller'; // Import IS_PUBLIC_KEY from blob.controller (or a shared constants file)

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) { // Inject Reflector
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if the route handler is marked with @Public()
    const isPublicHandler = this.reflector.get<boolean>(
      IS_PUBLIC_KEY,
      context.getHandler()
    );
    // Check if the controller class is marked with @Public()
    const isPublicClass = this.reflector.get<boolean>(
      IS_PUBLIC_KEY,
      context.getClass()
    );

    // If either the handler or the class is public, bypass authentication
    if (isPublicHandler || isPublicClass) {
      return true;
    }
    
    // Otherwise, proceed with JWT authentication
    return super.canActivate(context);
  }
}
