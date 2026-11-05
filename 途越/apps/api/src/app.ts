import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { parseCorsOrigins } from '@tuyue/config';
import { AppModule } from './app.module.js';
import { storageRoot } from './cars/image-storage.js';
import { SuccessResponseInterceptor, UnifiedExceptionFilter } from './common.js';

export async function createApplication(): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['error'], abortOnError: false });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: parseCorsOrigins(process.env.CORS_ORIGINS), credentials: true });
  app.useStaticAssets(storageRoot, { prefix: '/static/' });
  app.useGlobalInterceptors(new SuccessResponseInterceptor());
  app.useGlobalFilters(new UnifiedExceptionFilter());

  const openApi = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('途越汽车 Mock API').setVersion('1.0').build(),
  );
  SwaggerModule.setup('api/docs', app, openApi, { jsonDocumentUrl: '/api/openapi.json' });
  return app;
}
