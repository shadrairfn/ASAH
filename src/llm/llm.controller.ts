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

  @Post('roadmap')
  @UseGuards(AuthGuard('jwt'))
  async generateRoadmap(@Req() req) {
    const userId = req.user['id_user'];
    return this.llmService.generateRoadmap(userId, req.body.id_career);
  }

  @Post('generate-full')
  @UseGuards(AuthGuard('jwt'))
  async generateFullRoadmap(@Req() req, @Body() body: { id_career: string }) {
    const userId = req.user['id_user'];
    const { id_career } = body;

    // 1. Generate Struktur Dulu (Cepat, < 5 detik)
    await this.llmService.generateRoadmap(userId, id_career);

    // 2. Jalankan Generate Content di BACKGROUND (Tanpa await)
    // Node.js akan melanjutkan proses ini meskipun response sudah dikirim ke frontend
    this.llmService.generateContent(userId).catch((err) => {
      console.error('Error background generation:', err);
    });

    // 3. Langsung kembalikan response sukses ke Frontend
    return {
      success: true,
      message:
        'Struktur Roadmap dibuat. Materi sedang digenerate di latar belakang.',
      status: 'PROCESSING',
    };
  }

  @Post('generate-roadmap')
  @UseGuards(AuthGuard('jwt'))
  async generateRoadmapFlow(@Req() req, @Body() body: { id_career: string }) {
    const userId = req.user['id_user'];

    // 1. Generate Struktur Roadmap (Phase & Modules) -> Tunggu sampai selesai (await)
    // Ini cepat (5-10 detik)
    await this.llmService.generateRoadmap(userId, body.id_career);

    // 2. Generate Konten & Vectorize -> JALANKAN DI BACKGROUND (JANGAN await)
    // Node.js akan melanjutkan proses ini di server meskipun response sudah dikirim ke user
    this.llmService
      .generateContent(userId)
      .then(() =>
        console.log(
          `[BACKGROUND] Selesai generate konten untuk user ${userId}`,
        ),
      )
      .catch((err) => console.error(`[BACKGROUND] Error: ${err.message}`));

    // 3. Langsung return response sukses ke Frontend
    return {
      success: true,
      message:
        'Roadmap berhasil dibuat. Materi sedang disusun oleh AI di latar belakang.',
    };
  }

  @Post('content')
  @UseGuards(AuthGuard('jwt'))
  async generateContent(@Req() req) {
    const userId = req.user['id_user'];
    return this.llmService.generateContent(userId);
  }

  @Get('content')
  @UseGuards(AuthGuard('jwt'))
  async getContent(@Req() req) {
    const userId = req.user['id_user'];
    return this.llmService.getMaterialsByPhase(userId, req.query.phaseName);
  }
}
