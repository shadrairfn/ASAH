import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as dotenv from 'dotenv';
dotenv.config({ quiet: true });

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be configured.');
  }

  return process.env.JWT_SECRET;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Pastikan token diambil dari Header Bearer
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(), // HARUS SAMA dengan yang ada di AuthService
    });
  }

  async validate(payload: any) {
    // Pastikan 'sub' (id_user) ada
    if (!payload || !payload.sub) {
        throw new UnauthorizedException('Token payload invalid');
    }

    // Return object ini akan masuk ke req.user di Controller
    return { id_user: payload.sub, email: payload.email };
  }
}
