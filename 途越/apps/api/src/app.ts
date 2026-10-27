import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { parseCorsOrigins } from '@tuyue/config';
import { AppModule } from './app.module.js';
import { SuccessResponseInterceptor, UnifiedExceptionFilter } from './common.js';

export async function createApplication(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: parseCorsOrigins(process.env.CORS_ORIGINS), credentials: true });
  app.useGlobalInterceptors(new SuccessResponseInterceptor());
  app.useGlobalFilters(new UnifiedExceptionFilter());

  const openApi = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('途越汽车 Mock API').setVersion('1.0').build(),
  );
  SwaggerModule.setup('api/docs', app, openApi, { jsonDocumentUrl: '/api/openapi.json' });
  return app;
}
