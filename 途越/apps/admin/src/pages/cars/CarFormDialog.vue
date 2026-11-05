<script setup lang="ts">
import { ElMessage } from 'element-plus';
import {
  CAR_LIMITS,
  EnergyType,
  PublishStatus,
  validateCarDraft,
  type CarDraftInput,
} from '@tuyue/contracts';
import { computed, reactive, ref, watch } from 'vue';
import { ApiRequestError, carsApi } from '../../api';

const props = defineProps<{ modelValue: boolean; carId: string | null }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>();

const WAN = 1_000_000;

const energyOptions = [
  { value: EnergyType.GASOLINE, label: '燃油' },
  { value: EnergyType.HYBRID, label: '混动' },
  { value: EnergyType.ELECTRIC, label: '纯电' },
];
const statusOptions = [
  { value: PublishStatus.DRAFT, label: '草稿' },
  { value: PublishStatus.PENDING_REVIEW, label: '待审核' },
  { value: PublishStatus.PUBLISHED, label: '已发布' },
  { value: PublishStatus.OFFLINE, label: '已下线' },
];

function emptyDraft(): CarDraftInput {
  return {
    name: '',
    series: '',
    energyType: EnergyType.GASOLINE,
    tagline: '',
    description: '',
    priceMinCents: 0,
    priceMaxCents: 0,
    publishStatus: PublishStatus.DRAFT,
  };
}

const draft = reactive<CarDraftInput>(emptyDraft());
const minWan = ref(0);
const maxWan = ref(0);
const errors = reactive<Record<string, string>>({});
const loading = ref(false);
const saving = ref(false);

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});
const title = computed(() => (props.carId ? '编辑车型' : '新增车型'));
const maxWanLimit = computed(() => CAR_LIMITS.priceCents.max / WAN);

function clearErrors(): void {
  for (const key of Object.keys(errors)) delete errors[key];
}

function applyServerErrors(details: unknown): void {
  if (!Array.isArray(details)) return;
  for (const item of details) {
    if (typeof item === 'object' && item !== null) {
      const field = (item as { field?: unknown }).field;
      const message = (item as { message?: unknown }).message;
      if (typeof field === 'string' && typeof message === 'string') errors[field] = message;
    }
  }
}

async function loadCar(id: string): Promise<void> {
  loading.value = true;
  try {
    const car = await carsApi.detail(id);
    draft.name = car.name;
    draft.series = car.series;
    draft.energyType = car.energyType;
    draft.tagline = car.tagline;
    draft.description = car.description;
    draft.publishStatus = car.publishStatus;
    minWan.value = car.priceMinCents / WAN;
    maxWan.value = car.priceMaxCents / WAN;
  } catch (error) {
    ElMessage.error(error instanceof ApiRequestError ? error.message : '车型加载失败');
    visible.value = false;
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    clearErrors();
    if (props.carId) {
      void loadCar(props.carId);
      return;
    }
    Object.assign(draft, emptyDraft());
    minWan.value = 0;
    maxWan.value = 0;
  },
);

async function submit(): Promise<void> {
  const input: CarDraftInput = {
    ...draft,
    priceMinCents: Math.round((minWan.value || 0) * WAN),
    priceMaxCents: Math.round((maxWan.value || 0) * WAN),
  };
  clearErrors();
  const clientErrors = validateCarDraft(input);
  for (const item of clientErrors) errors[item.field] = item.message;
  if (clientErrors.length > 0) {
    ElMessage.warning('请先修正表单中的提示项');
    return;
  }

  saving.value = true;
  try {
    if (props.carId) await carsApi.update(props.carId, input);
    else await carsApi.create(input);
    ElMessage.success('车型已保存');
    visible.value = false;
    emit('saved');
  } catch (error) {
    if (error instanceof ApiRequestError) {
      applyServerErrors(error.details);
      ElMessage.error(error.message);
    } else {
      ElMessage.error('保存失败，请稍后重试');
    }
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <el-dialog v-model="visible" :title="title" width="560px" :close-on-click-modal="false">
    <el-form v-loading="loading" label-width="96px" @submit.prevent>
      <el-form-item label="车型名称" :error="errors.name">
        <el-input
          v-model="draft.name"
          :maxlength="CAR_LIMITS.name.max"
          show-word-limit
          placeholder="例如：途越远行"
        />
      </el-form-item>
      <el-form-item label="所属系列" :error="errors.series">
        <el-input
          v-model="draft.series"
          :maxlength="CAR_LIMITS.series.max"
          show-word-limit
          placeholder="例如：远行系列"
        />
      </el-form-item>
      <el-form-item label="能源类型" :error="errors.energyType">
        <el-select v-model="draft.energyType" placeholder="请选择能源类型">
          <el-option
            v-for="item in energyOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="一句话卖点" :error="errors.tagline">
        <el-input
          v-model="draft.tagline"
          :maxlength="CAR_LIMITS.tagline.max"
          show-word-limit
          placeholder="例如：从容应对每一段旅程"
        />
      </el-form-item>
      <el-form-item label="车型描述" :error="errors.description">
        <el-input
          v-model="draft.description"
          type="textarea"
          :rows="4"
          :maxlength="CAR_LIMITS.description.max"
          show-word-limit
          placeholder="用于前台详情页的车型介绍"
        />
      </el-form-item>
      <el-form-item label="指导价" :error="errors.priceMinCents ?? errors.priceMaxCents">
        <div class="price-row">
          <el-input-number
            v-model="minWan"
            :min="0"
            :max="maxWanLimit"
            :precision="2"
            :step="0.5"
            controls-position="right"
          />
          <span class="price-sep">—</span>
          <el-input-number
            v-model="maxWan"
            :min="0"
            :max="maxWanLimit"
            :precision="2"
            :step="0.5"
            controls-position="right"
          />
          <span class="price-unit">万元</span>
        </div>
      </el-form-item>
      <el-form-item label="发布状态" :error="errors.publishStatus">
        <el-select v-model="draft.publishStatus" placeholder="请选择发布状态">
          <el-option
            v-for="item in statusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.price-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.price-sep {
  color: var(--el-text-color-secondary);
}
.price-unit {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
