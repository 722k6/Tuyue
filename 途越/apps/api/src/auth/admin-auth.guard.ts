import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminRole } from '@tuyue/contracts';
import type { Request } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { AUTH_JWT_SECRET } from './auth.service.js';

export interface AdminPrincipal {
  id: string;
  username: string;
  role: AdminRole;
}

export type RequestWithAdmin = Request & { admin?: AdminPrincipal };

const ADMIN_PATH_PREFIX = '/api/v1/admin';

/**
 * 后台接口守卫（issue #26）。
 *
 * 前端路由守卫只拦页面，不能拦直接调用；所有 /api/v1/admin/** 必须携带
 * 有效 JWT，用户与角色一律从 Token 解析，不再信任客户端可伪造的 x-admin-role 头。
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithAdmin>();
    const path = (request.originalUrl ?? request.url ?? '').split('?')[0] ?? '';
    if (!path.startsWith(ADMIN_PATH_PREFIX)) return true;

    const header = request.header('authorization')?.trim() ?? '';
    const token = /^Bearer\s+(.+)$/i.exec(header)?.[1];
    if (!token) {
      throw new UnauthorizedException({ code: 'AUTH_TOKEN_REQUIRED', message: '请先登录' });
    }

    let payload: JwtPayload | string;
    try {
      payload = jwt.verify(token, AUTH_JWT_SECRET);
    } catch {
      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_INVALID',
        message: '登录已失效，请重新登录',
      });
    }

    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string' ||
      typeof payload.username !== 'string' ||
      !Object.values(AdminRole).includes(payload.role as AdminRole)
    ) {
      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_INVALID',
        message: '登录已失效，请重新登录',
      });
    }

    request.admin = {
      id: payload.sub,
      username: payload.username,
      role: payload.role as AdminRole,
    };
    return true;
  }
}