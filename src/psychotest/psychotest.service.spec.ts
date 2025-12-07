import { Test, TestingModule } from '@nestjs/testing';
import { PsychotestService } from './psychotest.service';

describe('PsychotestService', () => {
  let service: PsychotestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PsychotestService],
    }).compile();

    service = module.get<PsychotestService>(PsychotestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
