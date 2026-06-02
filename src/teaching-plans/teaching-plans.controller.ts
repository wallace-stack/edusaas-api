import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  ParseIntPipe, UseGuards, Query,
  UseInterceptors, UploadedFiles,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TeachingPlansService } from './teaching-plans.service';
import { CreateTeachingPlanDto } from './dto/create-teaching-plan.dto';
import { UpdateTeachingPlanDto } from './dto/update-teaching-plan.dto';
import { FilterTeachingPlansDto } from './dto/filter-teaching-plans.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

const MANAGEMENT_ROLES = [
  UserRole.COORDINATOR,
  UserRole.SECRETARY,
  UserRole.DIRECTOR,
];

@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
@Controller('teaching-plans')
export class TeachingPlansController {
  constructor(private readonly teachingPlansService: TeachingPlansService) {}

  // ── Professor ─────────────────────────────────────────────────────────────

  /** Cria rascunho */
  @Post()
  @Roles(UserRole.TEACHER)
  create(@Body() dto: CreateTeachingPlanDto, @CurrentUser() user: any) {
    return this.teachingPlansService.create(dto, user.userId, user.schoolId);
  }

  /** Lista meus planejamentos */
  @Get('my')
  @Roles(UserRole.TEACHER)
  findMine(@CurrentUser() user: any) {
    return this.teachingPlansService.findMine(user.userId, user.schoolId);
  }

  /** Edita rascunho / enviado não lido */
  @Patch(':id')
  @Roles(UserRole.TEACHER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeachingPlanDto,
    @CurrentUser() user: any,
  ) {
    return this.teachingPlansService.update(id, dto, user.userId, user.schoolId);
  }

  /** Envia para gestão (draft → sent) */
  @Patch(':id/send')
  @Roles(UserRole.TEACHER)
  send(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.teachingPlansService.send(id, user.userId, user.schoolId);
  }

  /** Upload de anexos (máx 5 arquivos, 5 MB cada) */
  @Post(':id/attachments')
  @Roles(UserRole.TEACHER)
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      // Validação básica pelo nome — magic bytes é feita no service
      fileFilter: (_req, file, cb) => {
        const ext = file.originalname.toLowerCase().split('.').pop();
        if (['jpg', 'jpeg', 'png', 'pdf'].includes(ext ?? '')) {
          cb(null, true);
        } else {
          cb(new Error('Apenas arquivos JPG, PNG e PDF são aceitos'), false);
        }
      },
    }),
  )
  addAttachments(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: any,
  ) {
    return this.teachingPlansService.addAttachments(id, files, user.userId, user.schoolId);
  }

  /** Remove um anexo específico */
  @Delete(':id/attachments/:fileId')
  @Roles(UserRole.TEACHER)
  removeAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    return this.teachingPlansService.removeAttachment(id, fileId, user.userId, user.schoolId);
  }

  // ── Gestão ────────────────────────────────────────────────────────────────

  /** Lista todos com filtros */
  @Get()
  @Roles(...MANAGEMENT_ROLES)
  findAll(@CurrentUser() user: any, @Query() filters: FilterTeachingPlansDto) {
    return this.teachingPlansService.findAll(user.schoolId, filters);
  }

  /** Visualiza (auto-marca como lido) */
  @Get(':id')
  @Roles(...MANAGEMENT_ROLES)
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.teachingPlansService.findOne(id, user.userId, user.schoolId);
  }

  /** Marca como revisado */
  @Patch(':id/review')
  @Roles(...MANAGEMENT_ROLES)
  review(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.teachingPlansService.review(id, user.userId, user.schoolId);
  }
}
