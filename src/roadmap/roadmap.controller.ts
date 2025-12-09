import { Controller, Get, UseGuards, Req } from '@nestjs/common';
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
}
