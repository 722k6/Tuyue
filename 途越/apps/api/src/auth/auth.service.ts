import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthResponse, LoginRequest } from '@tuyue/contracts';
import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DUMMY_PASSWORD_HASH, adminAccounts } from './accounts.js';

/** 未配置环境变量时使用开发密钥；部署到共享环境必须通过 JWT_SECRET 覆盖。 */
export const AUTH_JWT_SECRET = process.env.JWT_SECRET?.trim() || 'tuyue-dev-secret-change-me';

function resolveTokenTtlSeconds(): number {
  const parsed = Number(process.env.JWT_EXPIRES_IN_SECONDS);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 7200;
}

export const AUTH_TOKEN_TTL_SECONDS = resolveTokenTtlSeconds();

@Injectable()
export class AuthService {
  async login(input: LoginRequest): Promise<AuthResponse> {
    const username = typeof input?.username === 'string' ? input.username.trim() : '';
    const password = typeof input?.password === 'string' ? input.password : '';
    if (!username || !password) {
      throw new BadRequestException({ code: 'AUTH_INPUT_REQUIRED', message: '请输入账号和密码' });
    }

    const account = adminAccounts.find((item) => item.user.username === username);
    const passwordMatches = await compare(password, account?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!account || !passwordMatches) {
      // 账号不存在与密码错误返回同一错误，避免泄露账号是否存在
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: '账号或密码错误',
      });
    }

    const accessToken = jwt.sign(
      { sub: account.user.id, username: account.user.username, role: account.user.role },
      AUTH_JWT_SECRET,
      { expiresIn: AUTH_TOKEN_TTL_SECONDS },
    );
    return {
      accessToken,
      user: account.user,
      expiresAt: new Date(Date.now() + AUTH_TOKEN_TTL_SECONDS * 1000).toISOString(),
    };
  }
}
