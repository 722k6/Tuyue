import { ForbiddenException } from '@nestjs/common';
import { ADMIN_ROLE_PERMISSIONS, AdminRole, type PermissionCode } from '@tuyue/contracts';

/**
 * 以服务端登录态判定权限（US-SYS-01 / BUG-ADM02-02）。
 *
 * 角色一律来自 `AdminAuthGuard` 从 JWT 解析出的 `AdminPrincipal`，
 * 不读取客户端可伪造的 `x-admin-role` 请求头。
 */
export function assertAdminPermission(
  role: AdminRole | undefined,
  permission: PermissionCode,
): AdminRole {
  if (!role || !Object.values(AdminRole).includes(role)) {
    throw new ForbiddenException({
      code: 'FORBIDDEN_ROLE',
      message: '当前账号缺少有效角色',
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

/**
 * 命中任一权限即可放行。
 *
 * 用于「审核留痕」这类编辑与审核都需要读的接口：
 * 编辑要据此知道驳回原因（BUG-ADM02-04），审核要据此复查历史。
 */
export function assertAnyAdminPermission(
  role: AdminRole | undefined,
  permissions: PermissionCode[],
): AdminRole {
  if (!role || !Object.values(AdminRole).includes(role)) {
    throw new ForbiddenException({
      code: 'FORBIDDEN_ROLE',
      message: '当前账号缺少有效角色',
    });
  }
  const granted = ADMIN_ROLE_PERMISSIONS[role];
  if (!permissions.some((permission) => granted.includes(permission))) {
    throw new ForbiddenException({
      code: 'FORBIDDEN_ROLE',
      message: '当前角色无权执行该操作',
    });
  }
  return role;
}
