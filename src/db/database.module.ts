// src/db/database.module.ts

import { Module } from '@nestjs/common';
import { createDrizzleClient } from './drizzle-client';

@Module({
  providers: [
    {
      provide: 'DRIZZLE',
      useFactory: async () => {
        const db = await createDrizzleClient();
        return db;
      },
    },
  ],
  exports: ['DRIZZLE'],
})
export class DatabaseModule {}
