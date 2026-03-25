import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FeedService } from './feed.service';
import { CreateFeedPostDto } from './dto/create-feed-post.dto';
import { UpdateFeedPostDto } from './dto/update-feed-post.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';
import { FeedPostType } from './feed-post.entity';
import { memoryStorage } from 'multer';

@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  // Criar post — director, coordinator, secretary e teacher
  @Post()
  @Roles(UserRole.DIRECTOR, UserRole.COORDINATOR, UserRole.SECRETARY, UserRole.TEACHER)
  create(@Body() dto: CreateFeedPostDto, @CurrentUser() user: any) {
    return this.feedService.create(dto, user);
  }

  // Listar feed paginado — todos os autenticados
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('type') type?: FeedPostType,
  ) {
    return this.feedService.findAll(user.schoolId, user.userId, user.role, page, limit, type);
  }

  // Detalhe de um post — todos autenticados
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.feedService.findOne(id, user.schoolId);
  }

  // Editar post — autor ou director
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFeedPostDto, @CurrentUser() user: any) {
    return this.feedService.update(id, dto, user);
  }

  // Desativar post — autor ou director
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.feedService.remove(id, user);
  }

  // Upload de imagens — autor do post (max 2 arquivos, max 5MB cada)
  @Post(':id/images')
  @UseInterceptors(
    FilesInterceptor('images', 2, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
          return cb(new Error('Apenas imagens são permitidas.'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: any,
  ) {
    return this.feedService.uploadImages(id, files, user);
  }
}
