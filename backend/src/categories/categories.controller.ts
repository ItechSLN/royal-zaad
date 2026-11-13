import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  Version,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CategoriesQueryDto,
  CreateCategoriesDto,
  UpdateCategoriesDto,
} from './dto/categories.dto';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';

const imageFilePipe = () =>
  new ParseFilePipe({
    validators: [
      new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
      new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
    ],
  });

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Version('1')
  findAll(@Query() query: CategoriesQueryDto) {
    return this.categoriesService.findAll(query, query.scope);
  }

  @Get('tree')
  @Version('1')
  findTree(@Query('visible') visible?: string) {
    return this.categoriesService.findTree(visible === 'true');
  }

  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Post()
  @Version('1')
  create(@Body() data: CreateCategoriesDto) {
    return this.categoriesService.create(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Patch(':id')
  @Version('1')
  update(@Param('id') id: string, @Body() data: UpdateCategoriesDto) {
    return this.categoriesService.update(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Post(':id/image')
  @Version('1')
  @UseInterceptors(FileInterceptor('image'))
  setImage(
    @Param('id') id: string,
    @UploadedFile(imageFilePipe()) file: Express.Multer.File,
  ) {
    return this.categoriesService.setImage(id, file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Delete(':id/image')
  @Version('1')
  clearImage(@Param('id') id: string) {
    return this.categoriesService.clearImage(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Delete(':id')
  @Version('1')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
