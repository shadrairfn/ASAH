import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
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
  async careerRecomendation(@Req() req) {
    const userId = req.user['id_user'];
    return this.llmService.careerRecomendation(userId);
  }
}