import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './db/database.module';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { SupabaseModule } from './supabase/supabase.module';
import { PsychotestModule } from './psychotest/psychotest.module';
import { LlmService } from './llm/llm.service';
import { LlmController } from './llm/llm.controller';
import { LlmModule } from './llm/llm.module';
import { RoadmapService } from './roadmap/roadmap.service';
import { RoadmapModule } from './roadmap/roadmap.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), UsersModule, DatabaseModule, AuthModule, SupabaseModule, PsychotestModule, LlmModule, RoadmapModule],
  controllers: [AppController, AuthController, LlmController],
  providers: [AppService, AuthService, LlmService, RoadmapService],
})
export class AppModule {}
