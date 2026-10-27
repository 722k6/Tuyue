import {
  Catch,
  type ArgumentsHost,
  type CallHandler,
  type ExceptionFilter,
  type ExecutionContext,
  HttpException,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type RequestWithId = Request & { requestId: string };

export class RequestIdMiddleware {
  use(req: RequestWithId, res: Response, next: () => void): void {
    req.requestId = req.header('x-request-id')?.trim() || randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
  }
}

export class SuccessResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    return next
      .handle()
      .pipe(map((data) => ({ success: true, data, requestId: request.requestId })));
  }
}

@Catch()
export class UnifiedExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<RequestWithId>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    const body = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
    const message =
      typeof body.message === 'string'
        ? body.message
        : status === 500
          ? '服务器内部错误'
          : '请求失败';
    response.status(status).json({
      success: false,
      error: {
        code:
          typeof body.code === 'string'
            ? body.code
            : status === 500
              ? 'INTERNAL_ERROR'
              : 'HTTP_ERROR',
        message,
      },
      requestId: request.requestId,
    });
  }
}
