<script setup lang="ts">
import { ElMessage } from 'element-plus';
import type { UploadRequestOptions } from 'element-plus';
import { CAR_IMAGE_TYPES, CAR_LIMITS, type CarImage } from '@tuyue/contracts';
import { computed, ref, watch } from 'vue';
import { ApiRequestError, carsApi, resolveAssetUrl } from '../../api';

const props = defineProps<{ modelValue: boolean; carId: string | null; carName: string }>();
const emit = defineEmits<{ 'update:modelValue': [boolean] }>();

const images = ref<CarImage[]>([]);
const loading = ref(false);
const uploading = ref(false);
const saving = ref(false);
const dragIndex = ref<number | null>(null);

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});
const canUploadMore = computed(() => images.value.length < CAR_LIMITS.images.max);

watch(
  () => props.modelValue,
  async (open) => {
    if (!open || !props.carId) return;
    loading.value = true;
    images.value = [];
    try {
      const car = await carsApi.detail(props.carId);
      images.value = car.images;
    } catch (error) {
      ElMessage.error(error instanceof ApiRequestError ? error.message : '图片加载失败');
      visible.value = false;
    } finally {
      loading.value = false;
    }
  },
);

function beforeUpload(file: File): boolean {
  if (!(CAR_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    ElMessage.error('仅支持 JPG、PNG、WebP 格式的图片');
    return false;
  }
  if (file.size > CAR_LIMITS.imageBytes) {
    ElMessage.error(`单张图片不能超过 ${CAR_LIMITS.imageBytes / 1024 / 1024}MB`);
    return false;
  }
  if (!canUploadMore.value) {
    ElMessage.warning(`最多保留 ${CAR_LIMITS.images.max} 张图片`);
    return false;
  }
  return true;
}

async function customUpload(options: UploadRequestOptions): Promise<void> {
  if (!props.carId) return;
  uploading.value = true;
  try {
    images.value = await carsApi.uploadImages(props.carId, [options.file]);
    ElMessage.success('图片已上传');
  } catch (error) {
    ElMessage.error(error instanceof ApiRequestError ? error.message : '图片上传失败');
    throw error;
  } finally {
    uploading.value = false;
  }
}

async function persist(next: CarImage[], successText: string): Promise<void> {
  if (!props.carId) return;
  saving.value = true;
  try {
    images.value = await carsApi.saveImages(
      props.carId,
      next.map((image) => ({ id: image.id, url: image.url, isCover: image.isCover })),
    );
    ElMessage.success(successText);
  } catch (error) {
    ElMessage.error(error instanceof ApiRequestError ? error.message : '保存失败');
  } finally {
    saving.value = false;
  }
}

async function setCover(index: number): Promise<void> {
  const next = images.value.map((image, current) => ({ ...image, isCover: current === index }));
  await persist(next, '主图已更新');
}

async function removeAt(index: number): Promise<void> {
  const target = images.value[index];
  if (!target) return;
  const next = images.value.filter((_, current) => current !== index);
  await persist(next, '图片已删除');
}

function onDragStart(index: number): void {
  dragIndex.value = index;
}

function hideBroken(event: Event): void {
  const image = event.target as HTMLImageElement | null;
  if (image) image.style.visibility = 'hidden';
}

async function onDrop(index: number): Promise<void> {
  const from = dragIndex.value;
  dragIndex.value = null;
  if (from === null || from === index) return;
  const next = [...images.value];
  const [moved] = next.splice(from, 1);
  if (!moved) return;
  next.splice(index, 0, moved);
  images.value = next;
  await persist(next, '排序已保存');
}
</script>

<template>
  <el-drawer v-model="visible" :title="`图片管理 · ${carName}`" size="620px">
    <div v-loading="loading" class="drawer-body">
      <div class="upload-bar">
        <el-upload
          :show-file-list="false"
          :http-request="customUpload"
          :before-upload="beforeUpload"
          :disabled="!canUploadMore || uploading"
          accept="image/jpeg,image/png,image/webp"
          multiple
        >
          <el-button type="primary" :loading="uploading" :disabled="!canUploadMore">
            上传图片
          </el-button>
        </el-upload>
        <span class="hint">
          支持 JPG/PNG/WebP，单张 ≤ {{ CAR_LIMITS.imageBytes / 1024 / 1024 }}MB，最多
          {{ CAR_LIMITS.images.max }} 张；拖动卡片可调整顺序
        </span>
      </div>

      <el-empty v-if="!loading && images.length === 0" description="还没有上传图片" />

      <div v-else class="image-grid">
        <div
          v-for="(image, index) in images"
          :key="image.id"
          class="image-card"
          :class="{ 'is-cover': image.isCover }"
          draggable="true"
          @dragstart="onDragStart(index)"
          @dragover.prevent
          @drop="onDrop(index)"
        >
          <div class="thumb-wrap">
            <span class="thumb-fallback">图片缺失</span>
            <img :src="resolveAssetUrl(image.url)" :alt="`车型图片 ${index + 1}`" @error="hideBroken" />
          </div>
          <span v-if="image.isCover" class="cover-badge">主图</span>
          <span class="order-badge">{{ index + 1 }}</span>
          <div class="card-actions">
            <el-button size="small" :disabled="image.isCover || saving" @click="setCover(index)">
              设为主图
            </el-button>
            <el-button size="small" type="danger" plain :disabled="saving" @click="removeAt(index)">
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.drawer-body {
  min-height: 240px;
}
.upload-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.image-card {
  position: relative;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  overflow: hidden;
  background: var(--el-fill-color-blank);
  cursor: grab;
  transition: border-color 0.2s ease;
}
.image-card.is-cover {
  border-color: var(--el-color-primary);
}
.thumb-wrap {
  position: relative;
  height: 108px;
  background: var(--el-fill-color-light);
}
.thumb-wrap img {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 108px;
  object-fit: cover;
  display: block;
}
.thumb-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.cover-badge,
.order-badge {
  position: absolute;
  top: 6px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 18px;
  color: #fff;
}
.cover-badge {
  left: 6px;
  background: var(--el-color-primary);
}
.order-badge {
  right: 6px;
  background: rgb(0 0 0 / 45%);
}
.card-actions {
  display: flex;
  gap: 6px;
  padding: 8px;
}
</style>
