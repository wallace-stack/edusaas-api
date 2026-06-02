import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TeachingPlan,
  TeachingPlanStatus,
} from './teaching-plan.entity';
import { CreateTeachingPlanDto } from './dto/create-teaching-plan.dto';
import { UpdateTeachingPlanDto } from './dto/update-teaching-plan.dto';
import { FilterTeachingPlansDto } from './dto/filter-teaching-plans.dto';

@Injectable()
export class TeachingPlansService {
  constructor(
    @InjectRepository(TeachingPlan)
    private readonly repo: Repository<TeachingPlan>,
  ) {}

  // ── Professor ────────────────────────────────────────────────────────────

  /** Cria rascunho */
  async create(dto: CreateTeachingPlanDto, teacherId: number, schoolId: number): Promise<TeachingPlan> {
    const plan = this.repo.create({
      ...dto,
      teacherId,
      schoolId,
      status: TeachingPlanStatus.DRAFT,
    });
    return this.repo.save(plan);
  }

  /** Edita — apenas enquanto status = 'sent' e readAt IS NULL (ou status = 'draft') */
  async update(id: number, dto: UpdateTeachingPlanDto, teacherId: number, schoolId: number): Promise<TeachingPlan> {
    const plan = await this.repo.findOne({ where: { id, teacherId, schoolId } });
    if (!plan) throw new NotFoundException('Planejamento não encontrado');

    const canEdit =
      plan.status === TeachingPlanStatus.DRAFT ||
      (plan.status === TeachingPlanStatus.SENT && plan.readAt === null);

    if (!canEdit) {
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

  /** Lista do próprio professor com relações */
  async findMine(teacherId: number, schoolId: number): Promise<TeachingPlan[]> {
    return this.repo.find({
      where: { teacherId, schoolId },
      relations: ['schoolClass', 'subject', 'readByUser', 'reviewedByUser'],
      order: { referenceDate: 'DESC', createdAt: 'DESC' },
    });
  }

  // ── Gestão ────────────────────────────────────────────────────────────────

  /** Lista todos da escola com filtros opcionais */
  async findAll(schoolId: number, filters: FilterTeachingPlansDto): Promise<TeachingPlan[]> {
    const qb = this.repo
      .createQueryBuilder('tp')
      .leftJoinAndSelect('tp.teacher', 'teacher')
      .leftJoinAndSelect('tp.schoolClass', 'schoolClass')
      .leftJoinAndSelect('tp.subject', 'subject')
      .leftJoinAndSelect('tp.readByUser', 'readByUser')
      .leftJoinAndSelect('tp.reviewedByUser', 'reviewedByUser')
      .where('tp.schoolId = :schoolId', { schoolId })
      .orderBy('tp.referenceDate', 'DESC')
      .addOrderBy('tp.createdAt', 'DESC');

    if (filters.teacherId) {
      qb.andWhere('tp.teacherId = :teacherId', { teacherId: filters.teacherId });
    }
    if (filters.classId) {
      qb.andWhere('tp.classId = :classId', { classId: filters.classId });
    }
    if (filters.date) {
      qb.andWhere('tp.referenceDate = :date', { date: filters.date });
    }
    if (filters.status) {
      qb.andWhere('tp.status = :status', { status: filters.status });
    }

    return qb.getMany();
  }

  /** Visualiza um planejamento — automaticamente marca como lido */
  async findOne(id: number, readerUserId: number, schoolId: number): Promise<TeachingPlan> {
    const plan = await this.repo.findOne({
      where: { id, schoolId },
      relations: ['teacher', 'schoolClass', 'subject', 'readByUser', 'reviewedByUser'],
    });
    if (!plan) throw new NotFoundException('Planejamento não encontrado');

    // Marca como lido se ainda não foi
    if (plan.status === TeachingPlanStatus.SENT && plan.readAt === null) {
      plan.status = TeachingPlanStatus.READ;
      plan.readAt = new Date();
      plan.readBy = readerUserId;
      await this.repo.save(plan);
    }

    return plan;
  }

  /** Marca como revisado */
  async review(id: number, reviewerUserId: number, schoolId: number): Promise<TeachingPlan> {
    const plan = await this.repo.findOne({
      where: { id, schoolId },
      relations: ['teacher', 'schoolClass', 'subject', 'readByUser', 'reviewedByUser'],
    });
    if (!plan) throw new NotFoundException('Planejamento não encontrado');
    if (plan.status === TeachingPlanStatus.DRAFT) {
      throw new ForbiddenException('Planejamentos em rascunho não podem ser revisados');
    }

    plan.status = TeachingPlanStatus.REVIEWED;
    plan.reviewedAt = new Date();
    plan.reviewedBy = reviewerUserId;
    return this.repo.save(plan);
  }
}
