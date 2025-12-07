import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Pastikan token diambil dari Header Bearer
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET, // HARUS SAMA dengan yang ada di AuthService
    });
  }

  async validate(payload: any) {
    // Debugging: Lihat apa isi payload yang diterima
    console.log('Payload decoded di Strategy:', payload);

    // Pastikan 'sub' (id_user) ada
    if (!payload || !payload.sub) {
        throw new UnauthorizedException('Token payload invalid');
    }

    // Return object ini akan masuk ke req.user di Controller
    return { id_user: payload.sub, email: payload.email };
  }
}