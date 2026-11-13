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
  UploadedFiles,
  UseInterceptors,
  Version,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreateProductDto, ProductsQueryDto, UpdateProductDto } from './dto/products.dto';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { isStaffUser } from '../auth/roles.constants';

const imageFilePipe = () =>
  new ParseFilePipe({
    validators: [
      new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
      new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
    ],
    fileIsRequired: false,
  });

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Version('1')
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Query() query: ProductsQueryDto,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    return this.productsService.findAll(query, isStaffUser(user));
  }

  // Declared before ':id' so it isn't swallowed as an id param.
  @Get('best-selling')
  @Version('1')
  findBestSelling(@Query('limit') limit?: string) {
    return this.productsService.findBestSelling(limit ? Number(limit) : 8);
  }

  @Get(':id')
  @Version('1')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    return this.productsService.findOneForViewer(
      id,
      isStaffUser(user),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Post()
  @Version('1')
  @UseInterceptors(FilesInterceptor('images', 10))
  create(
    @Body() dto: CreateProductDto,
    @UploadedFiles(imageFilePipe()) files: Express.Multer.File[] = [],
  ) {
    return this.productsService.create(dto, files);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Patch(':id')
  @Version('1')
  @UseInterceptors(FilesInterceptor('images', 10))
  update(
    @Param('id') id: string,
    @Body() data: UpdateProductDto,
    @UploadedFiles(imageFilePipe()) files: Express.Multer.File[] = [],
  ) {
    return this.productsService.update(id, data, files);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Delete(':id')
  @Version('1')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
