// backend/src/auth/guard/jwt-auth.guard.ts

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * This guard is responsible for protecting routes that require a valid JWT.
 * It automatically uses the 'jwt' strategy we configured earlier.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
