import { Test, TestingModule } from '@nestjs/testing';
import { PsychotestController } from './psychotest.controller';
import { PsychotestService } from './psychotest.service';

describe('PsychotestController', () => {
  let controller: PsychotestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PsychotestController],
      providers: [{ provide: PsychotestService, useValue: {} }],
    }).compile();

    controller = module.get<PsychotestController>(PsychotestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
