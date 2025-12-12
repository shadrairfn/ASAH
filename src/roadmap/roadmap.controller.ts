import { Controller, Get, UseGuards, Req, Post, Body } from '@nestjs/common';
import { RoadmapService } from './roadmap.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('roadmap')
export class RoadmapController {
    constructor(private readonly roadmapService: RoadmapService) {}

    @Get('option')
    @UseGuards(AuthGuard('jwt'))
    async getOptionsCareer(@Req() req) {
    const userId = req.user['id_user'];
    return this.roadmapService.getOptionsCareer(userId);
    }

    @Post('select')
    @UseGuards(AuthGuard('jwt'))
    async selectCareer(@Body() body: { id_career: string }, @Req() req) {
    const userId = req.user['id_user'];
    return this.roadmapService.selectCareer(userId, body);
    }
}
