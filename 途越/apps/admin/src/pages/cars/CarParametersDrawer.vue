<script setup lang="ts">
import { ElMessage } from 'element-plus';
import {
  CAR_PARAMETER_LIMITS,
  CarParameterGroup,
  CarParameterGroupLabel,
  CarParameterGroupOrder,
  validateCarParameters,
  type CarParameter,
} from '@tuyue/contracts';
import { computed, reactive, ref, watch } from 'vue';
import { ApiRequestError, carsApi } from '../../api';

const props = defineProps<{ modelValue: boolean; carId: string | null; carName: string }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>();

interface ParameterRow {
  key: string;
  code: string;
  label: string;
  value: string;
  unit: string;
}

type GroupRows = Record<CarParameterGroup, ParameterRow[]>;

const TOTAL_MAX = CAR_PARAMETER_LIMITS.max;
const CODE_MAX = CAR_PARAMETER_LIMITS.code.max;
const LABEL_MAX = CAR_PARAMETER_LIMITS.label.max;
const VALUE_MAX = CAR_PARAMETER_LIMITS.value.max;
const UNIT_MAX = CAR_PARAMETER_LIMITS.unit.max;

const activeGroup = ref<CarParameterGroup>(CarParameterGroup.POWER);
const loading = ref(false);
const saving = ref(false);
const errors = reactive<Record<string, string>>({});
let keySeed = 0;

function emptyRows(): GroupRows {
  return {
    [CarParameterGroup.POWER]: [],
    [CarParameterGroup.SIZE]: [],
    [CarParameterGroup.SAFETY]: [],
    [CarParameterGroup.SMART]: [],
    [CarParameterGroup.OTHER]: [],
  };
}

const rows = reactive<GroupRows>(emptyRows());

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const totalCount = computed(() =>
  CarParameterGroupOrder.reduce((sum, group) => sum + rows[group].length, 0),
);

function nextKey(): string {
  keySeed += 1;
  return `param-${keySeed}`;
}

function clearErrors(): void {
  for (const key of Object.keys(errors)) delete errors[key];
}

function resetRows(): void {
  const empty = emptyRows();
  for (const group of CarParameterGroupOrder) {
    rows[group].splice(0, rows[group].length, ...empty[group]);
  }
}

function addRow(group: CarParameterGroup): void {
  rows[group].push({ key: nextKey(), code: '', label: '', value: '', unit: '' });
}

function removeRow(group: CarParameterGroup, index: number): void {
  rows[group].splice(index, 1);
}

function moveRow(group: CarParameterGroup, index: number, offset: number): void {
  const target = index + offset;
  const list = rows[group];
  if (target < 0 || target >= list.length) return;
  const current = list[index];
  const next = list[target];
  if (!current || !next) return;
  list.splice(index, 1, next);
  list.splice(target, 1, current);
}

function buildParameters(): { parameters: CarParameter[]; keys: string[] } {
  const parameters: CarParameter[] = [];
  const keys: string[] = [];
  for (const group of CarParameterGroupOrder) {
    for (const row of rows[group]) {
      const isEmpty =
        !row.code.trim() && !row.label.trim() && !row.value.trim() && !row.unit.trim();
      if (isEmpty) continue;
      parameters.push({
        code: row.code,
        label: row.label,
        value: row.value,
        unit: row.unit,
        group,
      });
      keys.push(row.key);
    }
  }
  return { parameters, keys };
}

async function load(id: string): Promise<void> {
  loading.value = true;
  clearErrors();
  resetRows();
  try {
    const car = await carsApi.detail(id);
    for (const parameter of car.parameters) {
      const group = parameter.group ?? CarParameterGroup.OTHER;
      rows[group].push({
        key: nextKey(),
        code: parameter.code,
        label: parameter.label,
        value: parameter.value,
        unit: parameter.unit ?? '',
      });
    }
  } catch (error) {
    ElMessage.error(error instanceof ApiRequestError ? error.message : '车型参数加载失败');
    visible.value = false;
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open || !props.carId) return;
    activeGroup.value = CarParameterGroup.POWER;
    void load(props.carId);
  },
);

async function submit(): Promise<void> {
  if (!props.carId) return;
  clearErrors();
  const { parameters, keys } = buildParameters();

  const clientErrors = validateCarParameters(parameters);
  for (const item of clientErrors) {
    const match = /^parameters\[(\d+)\]\.(\w+)$/.exec(item.field);
    if (!match) {
      errors.parameters = item.message;
      continue;
    }
    const rowKey = keys[Number(match[1])];
    if (rowKey) errors[`${rowKey}.${match[2]}`] = item.message;
  }
  if (clientErrors.length > 0) {
    ElMessage.warning('请先修正参数中的提示项');
    return;
  }

  saving.value = true;
  try {
    await carsApi.saveParameters(props.carId, parameters);
    ElMessage.success('车型参数已保存');
    visible.value = false;
    emit('saved');
  } catch (error) {
    ElMessage.error(error instanceof ApiRequestError ? error.message : '参数保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <el-drawer
    v-model="visible"
    :title="`车型参数 · ${carName}`"
    size="760px"
    :close-on-click-modal="false"
  >
    <div v-loading="loading" class="parameters-body">
      <p class="hint">
        按动力 / 尺寸 / 安全 / 智能 / 其他分组维护；同一车型的参数代码不能重复，最多
        {{ TOTAL_MAX }} 条。保存后前台详情与对比模块立即生效。
      </p>
      <el-alert
        v-if="errors.parameters"
        :title="errors.parameters"
        type="error"
        :closable="false"
        show-icon
      />

      <el-form label-position="top" @submit.prevent>
        <el-tabs v-model="activeGroup">
          <el-tab-pane
            v-for="group in CarParameterGroupOrder"
            :key="group"
            :name="group"
            :label="`${CarParameterGroupLabel[group]}（${rows[group].length}）`"
          >
            <div class="group-toolbar">
              <el-button type="primary" plain size="small" @click="addRow(group)">
                新增参数
              </el-button>
            </div>

            <el-empty
              v-if="rows[group].length === 0"
              description="该分组暂无参数"
              :image-size="72"
            />

            <div v-for="(row, index) in rows[group]" :key="row.key" class="parameter-row">
              <div class="row-head">
                <span class="row-title">参数 {{ index + 1 }}</span>
                <div class="row-actions">
                  <el-button
                    link
                    :disabled="index === 0"
                    @click="moveRow(group, index, -1)"
                  >
                    上移
                  </el-button>
                  <el-button
                    link
                    :disabled="index === rows[group].length - 1"
                    @click="moveRow(group, index, 1)"
                  >
                    下移
                  </el-button>
                  <el-button link type="danger" @click="removeRow(group, index)">
                    删除
                  </el-button>
                </div>
              </div>
              <div class="row-grid">
                <el-form-item label="代码" :error="errors[`${row.key}.code`]">
                  <el-input
                    v-model="row.code"
                    placeholder="例如 power"
                    :maxlength="CODE_MAX"
                  />
                </el-form-item>
                <el-form-item label="名称" :error="errors[`${row.key}.label`]">
                  <el-input
                    v-model="row.label"
                    placeholder="例如 最大功率"
                    :maxlength="LABEL_MAX"
                  />
                </el-form-item>
                <el-form-item label="参数值" :error="errors[`${row.key}.value`]">
                  <el-input
                    v-model="row.value"
                    placeholder="例如 185"
                    :maxlength="VALUE_MAX"
                  />
                </el-form-item>
                <el-form-item label="单位" :error="errors[`${row.key}.unit`]">
                  <el-input
                    v-model="row.unit"
                    placeholder="例如 kW"
                    :maxlength="UNIT_MAX"
                  />
                </el-form-item>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-form>
    </div>

    <template #footer>
      <div class="footer">
        <span class="count">共 {{ totalCount }} 条参数</span>
        <div>
          <el-button @click="visible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submit">保存参数</el-button>
        </div>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.parameters-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.hint {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.6;
}
.group-toolbar {
  margin-bottom: 8px;
}
.parameter-row {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 10px;
}
.row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.row-title {
  font-size: 13px;
  font-weight: 500;
}
.row-actions {
  display: flex;
  align-items: center;
}
.row-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0 12px;
}
.row-grid :deep(.el-form-item) {
  margin-bottom: 8px;
}
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.count {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
