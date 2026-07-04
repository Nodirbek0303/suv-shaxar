import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express } from 'express';
import { AppModule } from './app.module';

export async function createNestServer(): Promise<Express> {
  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ['error', 'warn', 'log'] },
  );

  const config = app.get(ConfigService);
  const origins = config
    .get<string>(
      'CORS_ORIGINS',
      'http://localhost:5170,http://localhost:5173,http://localhost:5174,https://*.vercel.app',
    )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);
      const allowed =
        origins.includes(origin) ||
        origins.includes('*') ||
        /\.vercel\.app$/.test(origin) ||
        origins.some((o) => o.includes('*.vercel.app'));
      callback(null, allowed);
    },
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.init();
  return expressApp;
}
