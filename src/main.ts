
import { NestFactory } from '@nestjs/core';
import { setDefaultResultOrder } from 'node:dns';
import { AppModule } from './app.module';

async function bootstrap() {
  // Prefer IPv4 to help resolve Gmail SMTP IPv6 connection errors
  setDefaultResultOrder('ipv4first');

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
    ],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
