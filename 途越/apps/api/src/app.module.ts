import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { AdminCarsController } from './car-status.controller.js';
import { CompareController } from './compare.controller.js';
import { RequestIdMiddleware } from './common.js';
import {
  ActivitiesController,
  AnalyticsController,
  AuthController,
  CarsController,
  DealersController,
  HealthController,
} from './controllers.js';

@Module({
  controllers: [
    HealthController,
    CarsController,
    AuthController,
    ActivitiesController,
    DealersController,
    AnalyticsController,
    AdminCarsController,
    CompareController,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
