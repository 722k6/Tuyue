<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  EnergyType,
  PublishStatus,
  type CarSummary,
} from '@tuyue/contracts';
import { computed, onMounted, ref } from 'vue';
import { ApiRequestError, carsApi, resolveAssetUrl } from '../../api';
import CarFormDialog from './CarFormDialog.vue';
import CarImagesDrawer from './CarImagesDrawer.vue';
import CarParametersDrawer from './CarParametersDrawer.vue';

const ENERGY_LABEL: Record<EnergyType, string> = {
  [EnergyType.GASOLINE]: '燃油',
  [EnergyType.HYBRID]: '混动',
  [EnergyType.ELECTRIC]: '纯电',
};

const STATUS_META: Record<PublishStatus, { label: string; type: 'info' | 'warning' | 'success' }> = {
  [PublishStatus.DRAFT]: { label: '草稿', type: 'info' },
  [PublishStatus.PENDING_REVIEW]: { label: '待审核', type: 'warning' },
  [PublishStatus.PUBLISHED]: { label: '已发布', type: 'success' },
  [PublishStatus.OFFLINE]: { label: '已下线', type: 'info' },
};

const statusOptions = Object.values(PublishStatus);

const cars = ref<CarSummary[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const keyword = ref('');
const status = ref('');
const loading = ref(false);
const formVisible = ref(false);
const formCarId = ref<string | null>(null);
const imagesVisible = ref(false);
const imagesCar = ref<CarSummary | null>(null);
const parametersVisible = ref(false);
const parametersCar = ref<CarSummary | null>(null);

const isEmpty = computed(() => !loading.value && cars.value.length === 0);

function formatWan(cents: number): string {
  return (cents / 1_000_000).toFixed(2);
}

function formatPriceRange(minCents: number, maxCents: number): string {
  return `${formatWan(minCents)}-${formatWan(maxCents)} 万`;
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const result = await carsApi.list({
      ...(keyword.value.trim() ? { keyword: keyword.value.trim() } : {}),
      ...(status.value ? { status: status.value } : {}),
      page: page.value,
      pageSize: pageSize.value,
    });
    cars.value = result.items;
    total.value = result.total;
  } catch (error) {
    ElMessage.error(error instanceof ApiRequestError ? error.message : '车型列表加载失败');
  } finally {
    loading.value = false;
  }
}

function search(): void {
  page.value = 1;
  void load();
}

function reset(): void {
  keyword.value = '';
  status.value = '';
  page.value = 1;
  void load();
}

function openCreate(): void {
  formCarId.value = null;
  formVisible.value = true;
}

function openEdit(row: CarSummary): void {
  formCarId.value = row.id;
  formVisible.value = true;
}

function openImages(row: CarSummary): void {
  imagesCar.value = row;
  imagesVisible.value = true;
}

function openParameters(row: CarSummary): void {
  parametersCar.value = row;
  parametersVisible.value = true;
}

async function remove(row: CarSummary): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确认删除车型「${row.name}」吗？删除后不可恢复。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' },
    );
  } catch {
    return;
  }
  try {
    await carsApi.remove(row.id);
    ElMessage.success('车型已删除');
    if (cars.value.length === 1 && page.value > 1) page.value -= 1;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof ApiRequestError ? error.message : '删除失败');
  }
}

onMounted(load);
</script>

<template>
  <section class="cars-page">
    <header class="page-header">
      <h1>车型管理</h1>
      <el-button type="primary" @click="openCreate">新增车型</el-button>
    </header>

    <div class="toolbar">
      <el-input
        v-model="keyword"
        class="keyword"
        placeholder="搜索车型名称 / 系列 / 卖点"
        clearable
        @keyup.enter="search"
      />
      <el-select v-model="status" class="status" placeholder="全部状态" clearable>
        <el-option
          v-for="item in statusOptions"
          :key="item"
          :label="STATUS_META[item].label"
          :value="item"
        />
      </el-select>
      <el-button type="primary" plain @click="search">查询</el-button>
      <el-button @click="reset">重置</el-button>
    </div>

    <el-table v-loading="loading" :data="cars" border stripe style="width: 100%">
      <el-table-column label="主图" width="72">
        <template #default="{ row }">
          <el-image
            v-if="row.thumbnailUrl"
            :src="resolveAssetUrl(row.thumbnailUrl)"
            :preview-src-list="[resolveAssetUrl(row.thumbnailUrl)]"
            preview-teleported
            fit="cover"
            class="thumb"
          >
            <template #error><span class="thumb placeholder">无图</span></template>
          </el-image>
          <span v-else class="thumb placeholder">无图</span>
        </template>
      </el-table-column>
      <el-table-column label="车型" min-width="140">
        <template #default="{ row }">
          <div class="car-name">{{ row.name }}</div>
          <div class="car-meta">
            {{ row.series }} · {{ ENERGY_LABEL[row.energyType as EnergyType] }}
          </div>
        </template>
      </el-table-column>
      <el-table-column label="指导价" min-width="112">
        <template #default="{ row }">
          <span class="price">{{ formatPriceRange(row.priceMinCents, row.priceMaxCents) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="92">
        <template #default="{ row }">
          <el-tag :type="STATUS_META[row.publishStatus as PublishStatus].type" disable-transitions>
            {{ STATUS_META[row.publishStatus as PublishStatus].label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="openParameters(row)">参数</el-button>
          <el-button link type="primary" @click="openImages(row)">图片</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :description="isEmpty ? '暂无车型，点击右上角新增' : '没有匹配的车型'" />
      </template>
    </el-table>

    <footer class="pager">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="load"
        @size-change="search"
      />
    </footer>

    <CarFormDialog v-model="formVisible" :car-id="formCarId" @saved="load" />
    <CarImagesDrawer
      v-model="imagesVisible"
      :car-id="imagesCar?.id ?? null"
      :car-name="imagesCar?.name ?? ''"
    />
    <CarParametersDrawer
      v-model="parametersVisible"
      :car-id="parametersCar?.id ?? null"
      :car-name="parametersCar?.name ?? ''"
      @saved="load"
    />
  </section>
</template>

<style scoped>
.cars-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-header h1 {
  margin: 0;
  font-size: 20px;
}
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
}
.keyword {
  width: 260px;
}
.status {
  width: 140px;
}
.thumb {
  width: 60px;
  height: 40px;
  border-radius: 4px;
  display: block;
}
.thumb.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.price {
  white-space: nowrap;
}
.car-name {
  font-weight: 500;
  line-height: 1.4;
}
.car-meta {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}
.pager {
  display: flex;
  justify-content: flex-end;
}
</style>
