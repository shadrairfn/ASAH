import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/db/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import * as dotenv from 'dotenv';

dotenv.config({ quiet: true });

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
    throw new Error('JWT_SECRET must be configured.');
}

@Module({
    imports: [
        DatabaseModule, 
        JwtModule.register({
            global: true, // Opsional: agar bisa dipakai di module lain tanpa import ulang
            secret: jwtSecret,
            signOptions: { expiresIn: '1d' },
    }),],
    controllers: [AuthController],
    providers: [AuthService, GoogleStrategy, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule {}
