import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { CarStore } from './cars/car-store.js';
import { CarsAdminController } from './cars/cars-admin.controller.js';
import { RequestIdMiddleware } from './common.js';
import {
  ActivitiesController,
  AuthController,
  CarsController,
  DealersController,
  HealthController,
} from './controllers.js';

@Module({
  controllers: [
    HealthController,
    CarsController,
    CarsAdminController,
    AuthController,
    ActivitiesController,
    DealersController,
  ],
  providers: [CarStore],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
