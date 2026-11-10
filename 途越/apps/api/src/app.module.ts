import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { CarStore } from './cars/car-store.js';
import { CarsAdminController } from './cars/cars-admin.controller.js';
import { AdminCarsController } from './car-status.controller.js';
import { CarReviewController } from './car-review.controller.js';
import { CompareController } from './compare.controller.js';
import { RequestIdMiddleware } from './common.js';
import {
  ActivitiesController,
  AnalyticsController,
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
    AnalyticsController,
    AdminCarsController,
    CarReviewController,
    CompareController,
  ],
  providers: [CarStore, AuthService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
