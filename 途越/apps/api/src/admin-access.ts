import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ADMIN_ROLE_PERMISSIONS, AdminRole, type PermissionCode } from '@tuyue/contracts';

/**
 * 临时角色适配（US-SYS-01 落地前）。
 *
 * 当前没有真实登录态，后台前端把角色放在 `x-admin-role` 请求头里。
 * 这里只校验角色和权限码，不代表生产级鉴权；Token 接入后应改为从 Token 解析。
 */
export function assertAdminPermission(
  roleHeader: string | undefined,
  permission: PermissionCode,
): AdminRole {
  const role = roleHeader?.trim() as AdminRole;
  if (!role || !Object.values(AdminRole).includes(role)) {
    throw new BadRequestException({
      code: 'ROLE_REQUIRED',
      message: '缺少或无效的管理员角色',
    });
  }
  if (!ADMIN_ROLE_PERMISSIONS[role].includes(permission)) {
    throw new ForbiddenException({
      code: 'FORBIDDEN_ROLE',
      message: '当前角色无权执行该操作',
    });
  }
  return role;
}
