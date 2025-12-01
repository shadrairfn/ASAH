import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('login')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth() {
    // redirect otomatis
    }
    
    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleRedirect(@Req() req) {
    return this.authService.googleLogin(req.user);
    }
}
