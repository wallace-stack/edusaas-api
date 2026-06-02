import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  TeachingPlan, TeachingPlanStatus, ModuleType,
  AttachmentItem,
} from './teaching-plan.entity';
import { CreateTeachingPlanDto } from './dto/create-teaching-plan.dto';
import { UpdateTeachingPlanDto } from './dto/update-teaching-plan.dto';
import { FilterTeachingPlansDto } from './dto/filter-teaching-plans.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

// ── Magic bytes — validação real de tipo de arquivo ────────────────────────

const ALLOWED_MIMES = new Set([
  'image/jpeg', 'image/png', 'application/pdf',
]);

function detectMimeType(buffer: Buffer): string | null {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg';
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 &&
    buffer[2] === 0x4E && buffer[3] === 0x47
  ) return 'image/png';
  if (
    buffer[0] === 0x25 && buffer[1] === 0x50 &&
    buffer[2] === 0x44 && buffer[3] === 0x46
  ) return 'application/pdf';
  return null;
}

const DANGEROUS_EXTS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'ps1', 'vbs', 'js',
  'py', 'php', 'rb', 'pl', 'jar', 'msi',
]);

function hasDangerousExtension(name: string): boolean {
  const parts = name.toLowerCase().split('.');
  if (parts.length < 3) return false; // extensão dupla exige ao menos 3 partes
  return DANGEROUS_EXTS.has(parts[parts.length - 1]);
}

// ── Service ────────────────────────────────────────────────────────────────

const WITH_RELATIONS = ['schoolClass', 'subject', 'teacher', 'readByUser', 'reviewedByUser'];

@Injectable()
export class TeachingPlansService {
  constructor(
    @InjectRepository(TeachingPlan)
    private readonly repo: Repository<TeachingPlan>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ── helpers ───────────────────────────────────────────────────────────────

  private canEdit(plan: TeachingPlan): boolean {
    return (
      plan.status === TeachingPlanStatus.DRAFT ||
      (plan.status === TeachingPlanStatus.SENT && plan.readAt === null)
    );
  }

  // ── Professor ────────────────────────────────────────────────────────────

  /** Cria rascunho */
  async create(
    dto: CreateTeachingPlanDto,
    teacherId: number,
    schoolId: number,
  ): Promise<TeachingPlan> {
    const plan = this.repo.create({
      ...dto,
      teacherId,
      schoolId,
      moduleType: dto.moduleType ?? ModuleType.REGULAR,
      status: TeachingPlanStatus.DRAFT,
    });
    return this.repo.save(plan);
  }

  /** Edita — apenas enquanto status = 'draft' ou 'sent' sem leitura */
  async update(
    id: number,
    dto: UpdateTeachingPlanDto,
    teacherId: number,
    schoolId: number,
  ): Promise<TeachingPlan> {
    const plan = await this.repo.findOne({ where: { id, teacherId, schoolId } });
    if (!plan) throw new NotFoundException('Planejamento não encontrado');
    if (!this.canEdit(plan)) {
      throw new ForbiddenException(
        'Este planejamento não pode mais ser editado — a gestão já o visualizou.',
      );
    }
    Object.assign(plan, dto);
    return this.repo.save(plan);
  }

  /** Envia para a gestão (draft → sent) */
  async send(id: number, teacherId: number, schoolId: number): Promise<TeachingPlan> {
    const plan = await this.repo.findOne({ where: { id, teacherId, schoolId } });
    if (!plan) throw new NotFoundException('Planejamento não encontrado');
    if (plan.status !== TeachingPlanStatus.DRAFT) {
      throw new ForbiddenException('Apenas rascunhos podem ser enviados');
    }
    plan.status = TeachingPlanStatus.SENT;
    return this.repo.save(plan);
  }

  /** Lista do próprio professor */
  async findMine(teacherId: number, schoolId: number): Promise<TeachingPlan[]> {
    return this.repo.find({
      where: { teacherId, schoolId },
      relations: WITH_RELATIONS,
      order: { createdAt: 'DESC' },
    });
  }

  // ── Anexos ────────────────────────────────────────────────────────────────

  /** Adiciona até 5 arquivos ao planejamento */
  async addAttachments(
    id: number,
    files: Express.Multer.File[],
    teacherId: number,
    schoolId: number,
  ): Promise<TeachingPlan> {
    const plan = await this.repo.findOne({ where: { id, teacherId, schoolId } });
    if (!plan) throw new NotFoundException('Planejamento não encontrado');
    if (!this.canEdit(plan)) {
      throw new ForbiddenException('Não é possível modificar este planejamento');
    }

    const current = (plan.attachments ?? []) as AttachmentItem[];
    if (current.length + files.length > 5) {
      throw new BadRequestException(
        `Limite de 5 anexos por planejamento. Você já tem ${current.length}.`,
      );
    }

    const uploaded: AttachmentItem[] = await Promise.all(
      files.map(async (file) => {
        // Valida extensões duplas perigosas
        if (hasDangerousExtension(file.originalname)) {
          throw new BadRequestException(
            `Arquivo "${file.originalname}" possui extensão inválida.`,
          );
        }

        // Valida tipo real pelo magic bytes
        const mimeType = detectMimeType(file.buffer);
        if (!mimeType || !ALLOWED_MIMES.has(mimeType)) {
          throw new BadRequestException(
            'Tipo de arquivo não permitido. Envie apenas JPG, PNG ou PDF.',
          );
        }

        // Valida tamanho (5 MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new BadRequestException('Cada arquivo deve ter no máximo 5 MB.');
        }

        const url = await this.cloudinaryService.uploadAttachment(file, mimeType);
        return {
          id:   randomUUID(),
          url,
          type: mimeType as AttachmentItem['type'],
          size: file.size,
        };
      }),
    );

    plan.attachments = [...current, ...uploaded];
    return this.repo.save(plan);
  }

  /** Remove um anexo específico pelo id interno */
  async removeAttachment(
    id: number,
    fileId: string,
    teacherId: number,
    schoolId: number,
  ): Promise<TeachingPlan> {
    const plan = await this.repo.findOne({ where: { id, teacherId, schoolId } });
    if (!plan) throw new NotFoundException('Planejamento não encontrado');
    if (!this.canEdit(plan)) {
      throw new ForbiddenException('Não é possível modificar este planejamento');
    }

    const attachments = (plan.attachments ?? []) as AttachmentItem[];
    const exists = attachments.find(a => a.id === fileId);
    if (!exists) throw new NotFoundException('Anexo não encontrado');

    plan.attachments = attachments.filter(a => a.id !== fileId);
    return this.repo.save(plan);
  }

  // ── Gestão ────────────────────────────────────────────────────────────────

  /** Lista todos da escola com filtros opcionais */
  async findAll(schoolId: number, filters: FilterTeachingPlansDto): Promise<TeachingPlan[]> {
    const qb = this.repo
      .createQueryBuilder('tp')
      .leftJoinAndSelect('tp.teacher',      'teacher')
      .leftJoinAndSelect('tp.schoolClass',  'schoolClass')
      .leftJoinAndSelect('tp.subject',      'subject')
      .leftJoinAndSelect('tp.readByUser',   'readByUser')
      .leftJoinAndSelect('tp.reviewedByUser', 'reviewedByUser')
      .where('tp.schoolId = :schoolId', { schoolId })
      .orderBy('tp.createdAt', 'DESC');

    if (filters.teacherId)  qb.andWhere('tp.teacherId = :teacherId', { teacherId: filters.teacherId });
    if (filters.classId)    qb.andWhere('tp.classId   = :classId',   { classId:   filters.classId });
    if (filters.date)       qb.andWhere('tp.referenceDate = :date',  { date:      filters.date });
    if (filters.status)     qb.andWhere('tp.status    = :status',    { status:    filters.status });
    if (filters.periodType) qb.andWhere('tp.periodType = :periodType', { periodType: filters.periodType });
    if (filters.moduleType) qb.andWhere('tp.moduleType = :moduleType', { moduleType: filters.moduleType });

    return qb.getMany();
  }

  /** Visualiza um planejamento — automaticamente marca como lido */
  async findOne(id: number, readerUserId: number, schoolId: number): Promise<TeachingPlan> {
    const plan = await this.repo.findOne({
      where: { id, schoolId },
      relations: WITH_RELATIONS,
    });
    if (!plan) throw new NotFoundException('Planejamento não encontrado');

    if (plan.status === TeachingPlanStatus.SENT && plan.readAt === null) {
      plan.status  = TeachingPlanStatus.READ;
      plan.readAt  = new Date();
      plan.readBy  = readerUserId;
      await this.repo.save(plan);
    }

    return plan;
  }

  /** Marca como revisado */
  async review(id: number, reviewerUserId: number, schoolId: number): Promise<TeachingPlan> {
    const plan = await this.repo.findOne({
      where: { id, schoolId },
      relations: WITH_RELATIONS,
    });
    if (!plan) throw new NotFoundException('Planejamento não encontrado');
    if (plan.status === TeachingPlanStatus.DRAFT) {
      throw new ForbiddenException('Planejamentos em rascunho não podem ser revisados');
    }

    plan.status      = TeachingPlanStatus.REVIEWED;
    plan.reviewedAt  = new Date();
    plan.reviewedBy  = reviewerUserId;
    return this.repo.save(plan);
  }
}
