<script setup lang="ts">
import {
  CarParameterGroupLabel,
  CarParameterGroupOrder,
  CarReviewAction,
  type AdminCarListItem,
  type CarDetail,
  type CarReviewLog,
} from '@tuyue/contracts';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import { ApiRequestError, carsApi } from '../../api';
import {
  CarReviewApiError,
  fetchPendingReviews,
  fetchReviewLogs,
  submitReview,
} from '../../features/car-review/car-review.api';

const items = ref<AdminCarListItem[]>([]);
const loading = ref(false);
const actingId = ref<string | null>(null);

const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<CarDetail | null>(null);
const reviewLogs = ref<CarReviewLog[]>([]);

const groupedParameters = computed(() => {
  const car = detail.value;
  if (!car) return [];
  return CarParameterGroupOrder.map((group) => ({
    group,
    label: CarParameterGroupLabel[group],
    rows: car.parameters.filter((parameter) => (parameter.group ?? 'other') === group),
  })).filter((entry) => entry.rows.length > 0);
});

const actionLabels: Record<CarReviewAction, string> = {
  [CarReviewAction.SUBMIT]: '提交审核',
  [CarReviewAction.APPROVE]: '审核通过',
  [CarReviewAction.REJECT]: '审核驳回',
};

function describeError(error: unknown): string {
  if (error instanceof CarReviewApiError || error instanceof ApiRequestError) {
    return error.message;
  }
  return '操作失败，请稍后重试';
}

function actionLabel(action: CarReviewAction): string {
  return actionLabels[action] ?? action;
}

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

async function load(): Promise<void> {
  loading.value = true;
  try {
    items.value = await fetchPendingReviews();
  } catch (error) {
    ElMessage.error(describeError(error));
  } finally {
    loading.value = false;
  }
}

async function openDetail(row: AdminCarListItem): Promise<void> {
  detailVisible.value = true;
  detailLoading.value = true;
  detail.value = null;
  reviewLogs.value = [];
  try {
    const [car, logs] = await Promise.all([
      carsApi.detail(row.id),
      fetchReviewLogs(row.id),
    ]);
    detail.value = car;
    reviewLogs.value = logs;
  } catch (error) {
    ElMessage.error(describeError(error));
    detailVisible.value = false;
  } finally {
    detailLoading.value = false;
  }
}

async function approve(row: AdminCarListItem): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `通过后「${row.name}」将立即发布到官网，确认通过？`,
      '确认审核通过',
      { type: 'warning', confirmButtonText: '通过发布', cancelButtonText: '取消' },
    );
  } catch {
    return;
  }

  actingId.value = row.id;
  try {
    await submitReview(row.id, CarReviewAction.APPROVE);
    ElMessage.success(`「${row.name}」已发布`);
    detailVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(describeError(error));
  } finally {
    actingId.value = null;
  }
}

async function reject(row: AdminCarListItem): Promise<void> {
  const comment = await ElMessageBox.prompt(
    `请填写驳回「${row.name}」的原因，编辑会看到这条意见。`,
    '审核驳回',
    {
      confirmButtonText: '确认驳回',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: '例如：参数缺失、描述与配置不符',
      inputValidator: (value) => (value?.trim() ? true : '请填写审核意见'),
    },
  )
    .then((result) => result.value.trim())
    .catch(() => null);

  if (comment === null) return;

  actingId.value = row.id;
  try {
    await submitReview(row.id, CarReviewAction.REJECT, comment);
    ElMessage.success(`「${row.name}」已驳回`);
    detailVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(describeError(error));
  } finally {
    actingId.value = null;
  }
}

onMounted(load);
</script>

<template>
  <section class="review-page">
    <header class="page-header">
      <div>
        <h1>内容审核</h1>
        <p class="hint">
          审核队列只展示「待审核」车型。通过后立即发布到官网；驳回必须填写意见，车型回到草稿状态。
        </p>
      </div>
      <el-button :loading="loading" @click="load">刷新队列</el-button>
    </header>

    <el-alert
      v-if="items.length === 0 && !loading"
      title="当前没有待审核的车型。编辑在车型管理中提交审核后会出现在这里。"
      type="success"
      :closable="false"
      show-icon
    />

    <el-table
      v-loading="loading"
      :data="items"
      row-key="id"
      border
      stripe
      class="review-table"
      empty-text="暂无待审核车型"
    >
      <el-table-column label="车型" min-width="180">
        <template #default="{ row }">
          <p class="car-name">{{ row.name }}</p>
          <p class="car-meta">{{ row.series }} · {{ row.id }}</p>
        </template>
      </el-table-column>
      <el-table-column label="能源" width="86" prop="energyType" />
      <el-table-column label="指导价" width="132">
        <template #default="{ row }">
          {{ formatPrice(row.priceMinCents, row.priceMaxCents) }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="96">
        <template #default>
          <el-tag type="warning" effect="light" disable-transitions> 待审核 </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="170">
        <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">查看</el-button>
          <el-button
            link
            type="success"
            :loading="actingId === row.id"
            @click="approve(row)"
          >
            通过
          </el-button>
          <el-button
            link
            type="danger"
            :loading="actingId === row.id"
            @click="reject(row)"
          >
            驳回
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-drawer
      v-model="detailVisible"
      :title="detail ? `审核详情 · ${detail.name}` : '审核详情'"
      size="640px"
    >
      <div v-loading="detailLoading" class="detail-body">
        <template v-if="detail">
          <h3>基础信息</h3>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="系列">{{ detail.series }}</el-descriptions-item>
            <el-descriptions-item label="能源">{{ detail.energyType }}</el-descriptions-item>
            <el-descriptions-item label="指导价" :span="2">
              {{ formatPrice(detail.priceMinCents, detail.priceMaxCents) }}
            </el-descriptions-item>
            <el-descriptions-item label="卖点" :span="2">
              {{ detail.tagline }}
            </el-descriptions-item>
            <el-descriptions-item label="描述" :span="2">
              {{ detail.description }}
            </el-descriptions-item>
          </el-descriptions>

          <h3>车型参数</h3>
          <el-empty
            v-if="groupedParameters.length === 0"
            description="该车型尚未录入参数"
            :image-size="64"
          />
          <div v-for="entry in groupedParameters" :key="entry.group" class="parameter-group">
            <h4>{{ entry.label }}</h4>
            <el-table :data="entry.rows" size="small" border>
              <el-table-column label="参数" prop="label" min-width="120" />
              <el-table-column label="值" min-width="100">
                <template #default="{ row }">{{ row.value }}{{ row.unit ?? '' }}</template>
              </el-table-column>
            </el-table>
          </div>

          <h3>审核记录</h3>
          <el-empty
            v-if="reviewLogs.length === 0"
            description="暂无审核记录"
            :image-size="64"
          />
          <el-table v-else :data="reviewLogs" size="small">
            <el-table-column label="时间" width="160">
              <template #default="{ row }">{{ formatTime(row.occurredAt) }}</template>
            </el-table-column>
            <el-table-column label="动作" width="90">
              <template #default="{ row }">{{ actionLabel(row.action) }}</template>
            </el-table-column>
            <el-table-column label="操作人" width="110" prop="actor" />
            <el-table-column label="意见" min-width="140">
              <template #default="{ row }">{{ row.comment ?? '—' }}</template>
            </el-table-column>
          </el-table>
        </template>
      </div>
    </el-drawer>
  </section>
</template>

<style scoped>
.review-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.page-header h1 {
  margin: 0 0 6px;
  font-size: 20px;
}
.hint {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.6;
}
.review-table {
  width: 100%;
}
.car-name {
  margin: 0;
  font-weight: 500;
}
.car-meta {
  margin: 2px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.detail-body h3 {
  margin: 20px 0 10px;
  font-size: 15px;
}
.detail-body h3:first-child {
  margin-top: 0;
}
.detail-body h4 {
  margin: 12px 0 8px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.parameter-group + .parameter-group {
  margin-top: 4px;
}
</style>
