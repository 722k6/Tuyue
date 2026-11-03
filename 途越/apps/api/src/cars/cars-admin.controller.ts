import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import {
  CAR_LIMITS,
  PublishStatus,
  type CarDetail,
  type CarDraftInput,
  type CarImage,
  type CarImageInput,
  type CarSummary,
  type PaginatedResponse,
} from '@tuyue/contracts';
import { CarStore, type CarListQuery } from './car-store.js';
import {
  buildStoredFilename,
  isSupportedImageType,
  removeStoredFile,
  toPublicUrl,
  uploadDir,
} from './image-storage.js';

function carNotFound(): NotFoundException {
  return new NotFoundException({ code: 'CAR_NOT_FOUND', message: '车型不存在' });
}

@Controller('v1/admin/cars')
export class CarsAdminController {
  constructor(@Inject(CarStore) private readonly store: CarStore) {}

  @Get()
  listCars(@Query() query: CarListQuery): PaginatedResponse<CarSummary> {
    const status = query.status?.trim();
    if (status && !Object.values(PublishStatus).includes(status as PublishStatus)) {
      throw new BadRequestException({
        code: 'CAR_STATUS_INVALID',
        message: '发布状态取值无效',
      });
    }
    return this.store.list({
      ...(query.keyword === undefined ? {} : { keyword: query.keyword }),
      ...(status ? { status } : {}),
      page: Number(query.page ?? 1),
      pageSize: Number(query.pageSize ?? 10),
    });
  }

  @Get(':id')
  getCar(@Param('id') id: string): CarDetail {
    const car = this.store.find(id);
    if (!car) throw carNotFound();
    return car;
  }

  @Post()
  createCar(@Body() input: CarDraftInput): CarDetail {
    return this.store.create(input);
  }

  @Put(':id')
  updateCar(@Param('id') id: string, @Body() input: CarDraftInput): CarDetail {
    const car = this.store.update(id, input);
    if (!car) throw carNotFound();
    return car;
  }

  @Delete(':id')
  removeCar(@Param('id') id: string): { id: string } {
    const car = this.store.find(id);
    if (!car) throw carNotFound();
    void Promise.all(car.images.map((image) => removeStoredFile(image.url)));
    this.store.remove(id);
    return { id };
  }

  @Post(':id/images')
  @UseInterceptors(
    FilesInterceptor('files', CAR_LIMITS.images.max, {
      storage: diskStorage({
        destination: uploadDir,
        filename: (_request, file, callback) => callback(null, buildStoredFilename(file.originalname)),
      }),
      limits: { fileSize: CAR_LIMITS.imageBytes, files: CAR_LIMITS.images.max },
      fileFilter: (_request, file, callback) => {
        if (!isSupportedImageType(file.mimetype)) {
          callback(
            new BadRequestException({
              code: 'CAR_IMAGE_TYPE_UNSUPPORTED',
              message: '仅支持 JPG、PNG、WebP 格式的图片',
            }),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ): Promise<CarImage[]> {
    const car = this.store.find(id);
    const cleanup = (): Promise<void[]> =>
      Promise.all(files.map((file) => removeStoredFile(toPublicUrl(file.filename))));
    if (!car) {
      await cleanup();
      throw carNotFound();
    }
    if (files.length === 0) {
      throw new BadRequestException({
        code: 'CAR_IMAGE_REQUIRED',
        message: '请至少选择一张图片',
      });
    }
    try {
      return this.store.addImages(
        id,
        files.map((file) => toPublicUrl(file.filename)),
      )!;
    } catch (error) {
      await cleanup();
      throw error;
    }
  }

  @Put(':id/images')
  saveImages(@Param('id') id: string, @Body() body: { images?: CarImageInput[] }): CarImage[] {
    const car = this.store.find(id);
    if (!car) throw carNotFound();
    if (!Array.isArray(body.images)) {
      throw new BadRequestException({
        code: 'CAR_IMAGE_PAYLOAD_INVALID',
        message: '请提交按顺序排列的图片列表',
      });
    }
    const next = this.store.setImages(id, body.images);
    if (!next) throw carNotFound();
    const keptUrls = new Set(next.map((image) => image.url));
    const removed = car.images.filter((image) => !keptUrls.has(image.url));
    void Promise.all(removed.map((image) => removeStoredFile(image.url)));
    return next;
  }

  @Delete(':id/images/:imageId')
  removeImage(@Param('id') id: string, @Param('imageId') imageId: string): CarImage[] {
    const car = this.store.find(id);
    if (!car) throw carNotFound();
    const target = car.images.find((image) => image.id === imageId);
    if (!target) {
      throw new NotFoundException({ code: 'CAR_IMAGE_NOT_FOUND', message: '图片不存在' });
    }
    const next = this.store.removeImage(id, imageId);
    if (!next) throw carNotFound();
    void removeStoredFile(target.url);
    return next;
  }
}
