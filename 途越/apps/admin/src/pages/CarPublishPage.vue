<script setup lang="ts">
import { CarStatusAction, PublishStatus, type AdminCarListItem } from '@tuyue/contracts';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import { statusLabel, useCarStatusStore } from '../features/car-status/car-status.store';

/**
 * US-CAR-13 车型上下架。
 *
 * 与 `/cars`（US-CAR-10 车型 CRUD）刻意分成两个页面：
 * 上下架是高频、低风险的运营动作，编辑车型是低频、高风险的改数据动作，
 * 混在一张表里容易点错按钮把在售车型改坏。
 */
const store = useCarStatusStore();
const logDialogVisible = ref(false);
const logDialogCar = ref<AdminCarListItem | null>(null);
const logLoading = ref(false);

/** 操作人：US-SYS-01 落地前先用本地登录名兜底，落地后换成 Token 里的用户名。 */
const actor = computed(() => {
  try {
    return globalThis.localStorage?.getItem('tuyue.admin.username') ?? 'web-admin';
  } catch {
    return 'web-admin';
  }
});

onMounted(() => void store.load());

function formatPrice(minCents: number, maxCents: number): string {
  const min = (minCents / 1_000_000).toFixed(2);
  const max = (maxCents / 1_000_000).toFixed(2);
  return min === max ? `${min} 万` : `${min} – ${max} 万`;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('zh-CN', { hour12: false });
}

async function publish(car: AdminCarListItem): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `上架后「${car.name}」会立即出现在官网车型列表中，确认上架？`,
      '确认上架',
      { confirmButtonText: '上架', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }

  try {
    await store.changeStatus(car.id, CarStatusAction.PUBLISH, { actor: actor.value });
    ElMessage.success(`「${car.name}」已上架`);
  } catch (error) {
    ElMessage.error(store.describeError(error));
  }
}

async function offline(car: AdminCarListItem): Promise<void> {
  const reason = await ElMessageBox.prompt(
    `下架后「${car.name}」将从官网消失，历史链接会返回 404。请填写下架原因，便于后续追溯。`,
    '确认下架',
    {
      confirmButtonText: '确认下架',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：改款停产 / 价格调整中',
      inputValidator: (value) => (value?.trim() ? true : '请填写下架原因'),
    },
  )
    .then((result) => result.value.trim())
    .catch(() => null);

  // 用户点「取消」时 prompt 会 reject，这里必须止住，不能继续调接口
  if (reason === null) return;

  try {
    await store.changeStatus(car.id, CarStatusAction.OFFLINE, {
      actor: actor.value,
      reason,
    });
    ElMessage.success(`「${car.name}」已下架`);
  } catch (error) {
    ElMessage.error(store.describeError(error));
  }
}

async function openLogs(car: AdminCarListItem): Promise<void> {
  logDialogCar.value = car;
  logDialogVisible.value = true;
  logLoading.value = true;
  try {
    await store.loadLogs(car.id);
  } catch (error) {
    ElMessage.error(store.describeError(error));
  } finally {
    logLoading.value = false;
  }
}

function statusTagType(status: PublishStatus): 'success' | 'info' | 'warning' {
  if (status === PublishStatus.PUBLISHED) return 'success';
  if (status === PublishStatus.PENDING_REVIEW) return 'warning';
  return 'info';
}
</script>

<template>
  <section>
    <h1>车型上下架</h1>
    <p class="hint">下架即刻从官网消失，历史详情链接返回 404；每次上架/下架都会写入操作留痕。</p>

    <div class="toolbar">
      <el-tag type="success" effect="plain" disable-transitions
        >已上架 {{ store.publishedCount }} 台</el-tag
      >
      <el-tag type="info" effect="plain" disable-transitions
        >未上架 {{ store.offlineCount }} 台</el-tag
      >
      <div class="toolbar__spacer" />
      <el-input
        v-model="store.keyword"
        class="toolbar__search"
        placeholder="搜索车型 / 系列"
        clearable
      />
      <el-select v-model="store.statusFilter" class="toolbar__select">
        <el-option label="全部状态" value="all" />
        <el-option label="已上架" :value="PublishStatus.PUBLISHED" />
        <el-option label="已下架" :value="PublishStatus.OFFLINE" />
        <el-option label="草稿" :value="PublishStatus.DRAFT" />
        <el-option label="待审核" :value="PublishStatus.PENDING_REVIEW" />
      </el-select>
      <el-button :loading="store.status === 'loading'" @click="store.load()">刷新</el-button>
    </div>

    <el-alert
      v-if="store.status === 'error'"
      :title="store.errorMessage || '车型列表加载失败'"
      type="error"
      :closable="false"
      show-icon
    />

    <p v-if="store.status === 'loading'" class="hint">车型列表加载中…</p>

    <div class="table-scroll">
      <el-table
        :data="store.visibleItems"
        row-key="id"
        class="car-table"
        empty-text="没有符合条件的车型"
      >
        <el-table-column label="车型" min-width="180">
          <template #default="{ row }">
            <p class="car-name">{{ row.name }}</p>
            <p class="car-series">{{ row.series }} · {{ row.id }}</p>
          </template>
        </el-table-column>
        <el-table-column label="能源" width="86">
          <template #default="{ row }">{{ row.energyType }}</template>
        </el-table-column>
        <el-table-column label="指导价" width="132">
          <template #default="{ row }">{{
            formatPrice(row.priceMinCents, row.priceMaxCents)
          }}</template>
        </el-table-column>
        <el-table-column label="状态" width="96">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.publishStatus)" effect="light" disable-transitions>
              {{ statusLabel(row.publishStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="留痕" width="78">
          <template #default="{ row }">
            <el-button link type="primary" @click="openLogs(row)"
              >{{ row.auditLogCount }} 条</el-button
            >
          </template>
        </el-table-column>
        <el-table-column label="最近更新" width="150">
          <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="112">
          <template #default="{ row }">
            <el-button
              v-if="row.publishStatus !== PublishStatus.PUBLISHED"
              type="primary"
              size="small"
              :loading="store.pendingCarId === row.id"
              @click="publish(row)"
            >
              上架
            </el-button>
            <el-button
              v-else
              type="danger"
              size="small"
              plain
              :loading="store.pendingCarId === row.id"
              @click="offline(row)"
            >
              下架
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="logDialogVisible" title="操作留痕" width="640px">
      <p class="dialog-subtitle">{{ logDialogCar?.name }}（{{ logDialogCar?.id }}）</p>
      <p v-if="logLoading" class="hint">留痕加载中…</p>
      <el-empty
        v-else-if="store.logsOf(logDialogCar?.id ?? '').length === 0"
        description="暂无操作留痕"
      />
      <el-table v-else :data="store.logsOf(logDialogCar?.id ?? '')" size="small">
        <el-table-column label="时间" width="180">
          <template #default="{ row }">{{ formatTime(row.occurredAt) }}</template>
        </el-table-column>
        <el-table-column label="动作" width="80">
          <template #default="{ row }">
            <el-tag
              :type="row.action === CarStatusAction.PUBLISH ? 'success' : 'info'"
              size="small"
              disable-transitions
            >
              {{ row.action === CarStatusAction.PUBLISH ? '上架' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态变化" width="150">
          <template #default="{ row }">
            {{ statusLabel(row.fromStatus) }} → {{ statusLabel(row.toStatus) }}
          </template>
        </el-table-column>
        <el-table-column label="操作人" width="110" prop="actor" />
        <el-table-column label="原因" min-width="140">
          <template #default="{ row }">{{ row.reason ?? '—' }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </section>
</template>

<style scoped>
/* 后台表格信息密度高，允许比全局 section 更宽，避免列被挤掉 */
section {
  max-width: 1240px;
}
/* 七列合计约 840px，容器更窄时让它横向滚动，而不是把最后几列裁掉 */
.table-scroll {
  overflow-x: auto;
}
.hint {
  color: #6b7280;
  margin-bottom: 16px;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.toolbar__spacer {
  flex: 1;
}
.toolbar__search {
  width: 200px;
}
.toolbar__select {
  width: 140px;
}
.car-table {
  min-width: 840px;
}
.car-name {
  margin: 0;
  font-weight: 600;
}
.car-series {
  margin: 2px 0 0;
  color: #9ca3af;
  font-size: 12px;
}
.dialog-subtitle {
  margin: 0 0 12px;
  color: #6b7280;
}
</style>
