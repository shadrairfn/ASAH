import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
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

  @Get('roadmap')
  @UseGuards(AuthGuard('jwt'))
  async getRoadmap(@Req() req) {
    const userId = req.user['id_user'];
    return this.llmService.getRoadmapUser(userId);
  }

  @Post('chat')
  @UseGuards(AuthGuard('jwt'))
  async chatWithAssistant(@Req() req, @Body() body: { message: string }) {
    const userId = req.user['id_user'];
    return this.llmService.chatWithRoadmap(userId, body.message);
  }

  @Post('quizzes')
  @UseGuards(AuthGuard('jwt'))
  async generateQuiz(@Req() req, @Body() body: { id_roadmap_item: string }) {
    const userId = req.user['id_user'];
    return this.llmService.generateQuiz(userId, body.id_roadmap_item);
  }

  @Patch('quizzes/:id_roadmap_item')
  @UseGuards(AuthGuard('jwt')) // Pastikan diproteksi
  async updateQuiz(
    @Param('id_roadmap_item') idRoadmapItem: string, // Ambil ID dari URL
    @Body() body: { score: number }, // Ambil Score dari Body
  ) {
    // Panggil service dengan ID dari Param dan Score dari Body
    return this.llmService.submitQuiz(idRoadmapItem, body.score);
  }

  // 1. Tambahkan ':id_roadmap_item' di sini agar menjadi Dynamic Route
  @Get('quizzes/:id_roadmap_item')
  @UseGuards(AuthGuard('jwt'))
  async getQuizzes(
    @Param('id_roadmap_item') id: string, // Ini akan mengambil value dari URL
    @Req() req,
  ) {
    const userId = req.user['id_user'];

    // Pastikan urutan parameter di service sesuai
    return this.llmService.getQuizByRoadmapId(userId, id);
  }
}
