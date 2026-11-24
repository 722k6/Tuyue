import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AdminPrincipal, RequestWithAdmin } from './admin-auth.guard.js';

/** 取出 AdminAuthGuard 解析出的登录用户；只挂在 /api/v1/admin/** 路由上。 */
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AdminPrincipal => {
    const request = context.switchToHttp().getRequest<RequestWithAdmin>();
    if (!request.admin) {
      throw new Error('CurrentAdmin 只能用于受 AdminAuthGuard 保护的接口');
    }
    return request.admin;
  },
);