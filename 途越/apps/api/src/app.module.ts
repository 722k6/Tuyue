import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { RequestIdMiddleware } from './common.js';
import {
  ActivitiesController,
  AuthController,
  CarsController,
  DealersController,
  HealthController,
} from './controllers.js';

@Module({
  controllers: [HealthController, CarsController, AuthController, ActivitiesController, DealersController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
