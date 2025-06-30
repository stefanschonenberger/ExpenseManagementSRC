// backend/src/auth/strategy/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    // FIX: Explicitly get the secret from the ConfigService first.
    const secret = configService.get<string>('JWT_SECRET');

    // If the secret is missing, throw an error to prevent startup.
    // This is a critical security measure.
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in the environment variables!');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Pass the validated secret to the strategy options.
      secretOrKey: secret,
    });
  }

  /**
   * This method is called after the token has been successfully verified.
   * The payload that we originally encoded into the token is passed here.
   * Whatever this method returns is attached to the Request object as `req.user`.
   */
  async validate(payload: any) {
    // FIX: Include the 'roles' array in the returned user object.
    return { id: payload.sub, email: payload.email, roles: payload.roles };
  }
}
