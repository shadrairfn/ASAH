import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { DatabaseModule } from 'src/db/database.module';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { UploadService } from 'src/upload/upload.service';

@Module({
  imports: [DatabaseModule, SupabaseModule],
  controllers: [UsersController],
  providers: [UsersService, UploadService]
})
export class UsersModule {}
