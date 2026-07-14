import { Test, TestingModule } from '@nestjs/testing';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';

describe('LlmController', () => {
  let controller: LlmController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LlmController],
      providers: [{ provide: LlmService, useValue: {} }],
    }).compile();

    controller = module.get<LlmController>(LlmController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
