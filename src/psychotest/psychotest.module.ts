import { Module } from '@nestjs/common';
import { PsychotestController } from './psychotest.controller';
import { PsychotestService } from './psychotest.service';
import { DatabaseModule } from 'src/db/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PsychotestController],
  providers: [PsychotestService]
})
export class PsychotestModule {}
