import { Test, TestingModule } from '@nestjs/testing';
import { RoadmapService } from './roadmap.service';
import { LlmService } from 'src/llm/llm.service';

describe('RoadmapService', () => {
  let service: RoadmapService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoadmapService,
        { provide: 'DRIZZLE', useValue: {} },
        { provide: LlmService, useValue: {} },
      ],
    }).compile();

    service = module.get<RoadmapService>(RoadmapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
