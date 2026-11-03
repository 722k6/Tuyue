# 浏览器 E2E 测试规范

本文属于「运营能力及质量发布」责任线，规定浏览器级 E2E 的边界、运行方式和扩展约定。

## 一、职责边界（先分清，避免重复劳动）

| 层级 | 覆盖内容 | 谁写 |
| ---- | ---- | ---- |
| 单元测试（Vitest） | store、纯函数、api 封装 | 各责任线自己写 |
| 接口测试（Vitest + supertest） | 控制器入参/出参/错误码 | 各责任线自己写 |
| **浏览器 E2E（Playwright）** | **跨模块关键用户路径**，一条用例通常串起 前台 + 后台 + API | 本条责任线统一维护 |

E2E 不追求覆盖率，只守**用户真能走通的那几条路**。同一个业务逻辑不要既写单元测试又写 E2E，重复写会让 CI 越来越慢。

## 二、目录与命名

```
途越/
├─ playwright.config.ts
└─ e2e/
   ├─ api/      health.spec.ts            后端可用性冒烟
   ├─ web/      activities.spec.ts        官网前台
   │            dealers.spec.ts
   └─ admin/    dashboard.spec.ts         CMS 后台
```

- 一个业务域一个文件，文件名用业务名词，不要用 `test1.spec.ts`。
- 用例标题写**用户行为 + 期望结果**，例如「点击地图标记与点击门店卡片双向联动」，不要写「测试 select 方法」。
- 目录决定跑在哪个应用上：`e2e/web/*` 走 `localhost:5173`，`e2e/admin/*` 走 `localhost:5174`，`e2e/api/*` 直达后端。

## 三、本地运行

**本地不需要下载任何浏览器。** 配置里 `channel: 'chrome'` 直接驱动系统已装的 Google Chrome（没装 Chrome 就改成 `'msedge'`，Windows 自带）。只有 CI 才用 Playwright 自带的 chromium。

```bash
cd 途越
pnpm install       # 只需装依赖
```

日常运行：

```bash
pnpm test:e2e              # 跑全部，自动拉起 api/web/admin 三个服务
pnpm test:e2e:ui           # 可视化界面，可单步重放，调试用
pnpm test:e2e -- web       # 只跑前台用例
pnpm test:e2e:report       # 打开上一次的 HTML 报告
```

已手动跑着 `pnpm dev` 时不会起重复服务（`reuseExistingServer`），直接复用。全部 9 条用例冷启动约 15 秒。

### 三处环境坑（踩过，别再踩）

**① 地址分两套，不能混。**

| 用途 | 地址 | 原因 |
| ---- | ---- | ---- |
| 浏览器访问（`baseURL`） | `http://localhost:517x` | 后端 CORS 白名单只含 `localhost`，换成 IP 会让 fetch 被拦 |
| 服务就绪探测（`webServer.url`） | `http://127.0.0.1:517x` | Playwright 的探测走 IPv4 |

**② vite 必须固定 IPv4。** 默认 `host: 'localhost'` 在本机会只解析到 `::1`，而探测走 `127.0.0.1`，两者对不上，表现为 `Timed out waiting 120000ms from config.webServer`。所以 `apps/web/vite.config.ts` 和 `apps/admin/vite.config.ts` 里都写了 `host: '127.0.0.1'`，**不要删**。

**③ webServer 只写一条 `pnpm dev`。** 拆成 api/web/admin 三条时，本机会出现第三条子进程拉不起来、干等 120 秒假超时。交给 pnpm 的 `--parallel` 统一编排最稳。

另外**不录视频**（`video` 关闭）：录像依赖 ffmpeg 二进制，本地没装会导致 browser context 直接创建失败，症状是「所有用例都报 ffmpeg 不存在」。排查靠 trace + 失败截图已经够用。

## 四、现有用例

| 文件 | 用例 | 守的是什么 |
| ---- | ---- | ---- |
| `api/health.spec.ts` | 健康检查返回统一结构 | 服务起来 + `SuccessResponseInterceptor` 生效 |
| `api/health.spec.ts` | 未知接口返回 JSON 而非裸 HTML | `UnifiedExceptionFilter` 生效；漏了 `/api` 前缀会退化成 Express 的 HTML 404 |
| `web/activities.spec.ts` | 活动卡片渲染日期区间与状态 | 前台列表可用 |
| `web/activities.spec.ts` | 卡片内容来自 `/v1/activities` | **防硬编码**：断言必须与接口返回逐字一致 |
| `web/dealers.spec.ts` | 标记与卡片一一对应、带经纬度 | 地图按坐标渲染 |
| `web/dealers.spec.ts` | 点标记/点卡片双向联动 | `MapProvider` 适配层交互正确 |
| `web/dealers.spec.ts` | 门店信息完整渲染 | 名称/地址/电话/营业时间不丢字段 |
| `admin/dashboard.spec.ts` | 4 个 KPI + 热门车型渲染 | 看板结构完整 |
| `admin/dashboard.spec.ts` | KPI 数值与接口一致 | 防假数据，统计口径可追溯 |

## 五、怎么加新用例

以「CMS 车型 CRUD」为例，等 CMS 责任线交付后按下面三步补：

```ts
// e2e/admin/cars.spec.ts
import { expect, test } from '@playwright/test';

test.describe('CMS 车型管理', () => {
  test('新建车型后前台能看到同一台车', async ({ page }) => {
    // 1. 后台录入
    await page.goto('/cars');
    await page.getByRole('button', { name: '新增车型' }).click();
    await page.getByLabel('车型名称').fill('E2E 测试车型');
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText('E2E 测试车型')).toBeVisible();

    // 2. 前台验证 —— 这是 M1 的退出条件，一条用例守住
    await page.goto('http://localhost:5173/cars');
    await expect(page.getByText('E2E 测试车型')).toBeVisible();
  });
});
```

写法约定：

1. **选择器优先级**：`getByRole` / `getByLabel` / `getByText` > `data-testid` > CSS 类名。业务页面尽量补 `aria-label` 或角色，别让测试绑死在 class 上。
2. **不要 `waitForTimeout`**。Playwright 的 `expect(locator)` 自带自动重试，等元素、等文本、等网络请求都有对应 API（`waitForResponse`）。
3. **不要断言 mock 的固定数字**，改成「与接口返回一致」。数据一换，用例不该跟着改。
4. **需要造数据时**先看有没有对应接口，能用接口造就别点 UI 造；UI 只用来验证用户操作路径本身。
5. 涉及登录的流程，用 `test.use({ storageState })` 复用登录态，不要每条用例都点一遍登录。

## 六、CI 集成

`.github/workflows/ci.yml` 里的 `e2e` job 与 `quality` job 并行：

```yaml
- run: pnpm exec playwright install --with-deps chromium
- run: pnpm test:e2e
- uses: actions/upload-artifact@v4   # 失败也能下载 playwright-report
```

- CI 下 `retries=2`、`forbidOnly=true`（防止 `.only` 被误合并）、`workers=2`。
- 每次 PR 都会跑；失败时到 Actions 页面下载 `playwright-report` 压缩包，里面含截图、录屏和 trace，可直接 `npx playwright show-trace` 回放。

## 七、当前待补（等对应责任线交付）

这些路径现在还是占位页，写了也必定失败，**不要提前写**，等模块合入 `main` 后再补：

| 待补用例 | 阻塞在 |
| ---- | ---- |
| 后台登录 → 按角色看到不同菜单 | 权限责任线（真实 JWT） |
| 新增/编辑/发布车型，前台同步可见 | CMS 责任线 |
| AI 对话流式返回 | AI 责任线 |
| 加入对比 → 对比表参数对齐 | 对比选配责任线 |
| 在线选配 → 生成报价 | 对比选配责任线 |

补之前请先确认对应页面已经不再渲染 `ModulePage` 占位组件。
