import { Module } from '@nestjs/common';
import { RoadmapController } from './roadmap.controller';
import { RoadmapService } from './roadmap.service';
import { DatabaseModule } from 'src/db/database.module';
import { LlmService } from 'src/llm/llm.service';


@Module({
  imports: [DatabaseModule],
  controllers: [RoadmapController],
  providers: [RoadmapService, LlmService],
})
export class RoadmapModule {}
