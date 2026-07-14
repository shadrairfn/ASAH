import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
dotenv.config({ quiet: true });

// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Tambahkan baris ini
  app.enableCors({
    origin: true, // Sesuaikan dengan port frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
