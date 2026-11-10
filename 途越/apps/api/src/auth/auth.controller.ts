import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import {
  AdminRole,
  type AuthResponse,
  type LoginRequest,
  type MockLoginRequest,
} from '@tuyue/contracts';
import { findMockAdmin } from '@tuyue/test-utils';
import { AuthService } from './auth.service.js';

@Controller('v1/auth')
export class AuthController {
  // tsx/esbuild 不产出 design:paramtypes，构造注入必须显式写 @Inject（与 CarsAdminController 一致）
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  /** 正式登录：账号 + 密码校验通过后签发 JWT（US-SYS-01）。 */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() input: LoginRequest): Promise<AuthResponse> {
    return this.authService.login(input);
  }

  /** 兼容既有页面与测试的 Mock 登录，待 US-SYS-02 接入路由守卫后再评估下线。 */
  @Post('mock-login')
  mockLogin(@Body() input: MockLoginRequest): AuthResponse {
    const role = input.role ?? AdminRole.EDITOR;
    if (!Object.values(AdminRole).includes(role)) {
      throw new BadRequestException({ code: 'INVALID_ROLE', message: '无效的管理员角色' });
    }
    const user = { ...findMockAdmin(role), username: input.username || `mock_${role}` };
    return {
      accessToken: `mock-token-${role}`,
      user,
      expiresAt: '2026-10-28T00:00:00.000Z',
    };
  }
}
