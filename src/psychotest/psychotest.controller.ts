import { Controller, Get, Req, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PsychotestService } from './psychotest.service';

@Controller('psychotest')
export class PsychotestController {
    constructor(private readonly psychotestService: PsychotestService) {}

    @Get('/')
    @UseGuards(AuthGuard('jwt'))
    async getQuestions(@Req() req) {
        const userId = req.user['id_user'];
        return this.psychotestService.getQuestions(userId);
    }

    @Post('/submit')
    @UseGuards(AuthGuard('jwt'))
    async submitAptitude(@Req() req) {
        const userId = req.user['id_user'];
        return this.psychotestService.submitAptitude(userId, req.body);
    }
}
