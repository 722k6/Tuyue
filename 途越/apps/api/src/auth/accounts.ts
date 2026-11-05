import { AdminRole, type AuthUser, type PermissionCode } from '@tuyue/contracts';
import { hashSync } from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

const ROLE_PERMISSIONS: Record<AdminRole, PermissionCode[]> = {
  editor: ['content:edit'],
  reviewer: ['content:review', 'content:publish'],
  super_admin: ['content:edit', 'content:review', 'content:publish', 'admin:manage'],
};

interface SeedAccount {
  id: string;
  username: string;
  displayName: string;
  role: AdminRole;
  password: string;
}

/**
 * 演示账号。真实项目从数据库读取，这里用内存种子代替；
 * 明文密码只在种子声明里出现一次，存储与比对都走 BCrypt 哈希。
 */
const SEED_ACCOUNTS: SeedAccount[] = [
  {
    id: 'admin-1',
    username: 'admin',
    displayName: '超级管理员',
    role: AdminRole.SUPER_ADMIN,
    password: 'Admin@123',
  },
  {
    id: 'admin-2',
    username: 'editor',
    displayName: '内容编辑',
    role: AdminRole.EDITOR,
    password: 'Editor@123',
  },
  {
    id: 'admin-3',
    username: 'reviewer',
    displayName: '内容审核',
    role: AdminRole.REVIEWER,
    password: 'Reviewer@123',
  },
];

export interface AdminAccount {
  user: AuthUser;
  passwordHash: string;
}

export const adminAccounts: AdminAccount[] = SEED_ACCOUNTS.map(({ password, ...user }) => ({
  user: { ...user, permissions: ROLE_PERMISSIONS[user.role] },
  passwordHash: hashSync(password, BCRYPT_ROUNDS),
}));

/**
 * 账号不存在时也拿它跑一次 BCrypt 比对，
 * 让「账号不存在」和「密码错误」耗时接近，避免通过响应时间探测账号。
 */
export const DUMMY_PASSWORD_HASH = hashSync('tuyue-dummy-password', BCRYPT_ROUNDS);
