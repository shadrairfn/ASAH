import { Module } from '@nestjs/common';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/db/database.module';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [LlmController],
  providers: [LlmService],
  exports: [LlmService], // Export jika ingin dipakai di module lain
})
export class LlmModule {}