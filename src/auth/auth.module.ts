import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/db/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [
        DatabaseModule, 
        JwtModule.register({
            global: true, // Opsional: agar bisa dipakai di module lain tanpa import ulang
            secret: process.env.JWT_SECRET || 'secretKeyDefault', // Pastikan secret ada
            signOptions: { expiresIn: '1d' },
    }),],
    controllers: [AuthController],
    providers: [AuthService, GoogleStrategy, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule {}
