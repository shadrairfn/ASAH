import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/db/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';

@Module({
    imports: [DatabaseModule],
    controllers: [AuthController],
    providers: [GoogleStrategy, AuthService],
})
export class AuthModule {}
