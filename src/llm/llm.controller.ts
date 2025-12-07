import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { LlmService } from './llm.service'; // Pastikan import service yang benar
import { AuthGuard } from '@nestjs/passport';

class ChatDto {
  prompt: string;
}

@Controller('ai')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Post('mapping')
  @UseGuards(AuthGuard('jwt'))
  async chat(@Req() req) {
    const userId = req.user['id_user'];
    return this.llmService.generateText(userId);
  }

//   @Post('roadmap')
//   @UseGuards(AuthGuard('jwt'))
//   async generateRoadmap(@Req() req) {
//     const userId = req.user['id_user'];
//     return this.llmService.generateRoadmap(userId);
//   }
}