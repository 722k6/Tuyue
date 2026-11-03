import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
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
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
