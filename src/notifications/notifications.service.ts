import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationTarget, NotificationType } from './notification.entity';
import { SystemMessage } from './system-message.entity';
import { UserSystemMessage } from './user-system-message.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateSystemMessageDto, UpdateSystemMessageDto } from './dto/system-message.dto';
import { EnrollmentService } from '../enrollment/enrollment.service';
import { UserRole } from '../users/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(SystemMessage)
    private systemMessageRepo: Repository<SystemMessage>,
    @InjectRepository(UserSystemMessage)
    private userSystemMessageRepo: Repository<UserSystemMessage>,
    private enrollmentService: EnrollmentService,
  ) {}

  async create(dto: CreateNotificationDto, schoolId: number, createdById: number, role: string): Promise<Notification> {
    // Professor só pode criar notificações para turmas
    if (role === UserRole.TEACHER) {
      if (dto.target !== NotificationTarget.CLASS || !dto.classId) {
        throw new BadRequestException('Professor só pode criar notificações para turmas específicas.');
      }
    }

    if (dto.target === NotificationTarget.CLASS && !dto.classId) {
      throw new BadRequestException('classId é obrigatório para target=CLASS.');
    }
    if (dto.target === NotificationTarget.STUDENT && !dto.targetUserId) {
      throw new BadRequestException('targetUserId é obrigatório para target=STUDENT.');
    }

    const notification = this.notificationsRepository.create({
      ...dto,
      // Padrão CLASS_NOTICE quando o frontend (ex: módulo infantil) não envia type
      type: dto.type ?? NotificationType.CLASS_NOTICE,
      schoolId,
      createdById,
    });
    return this.notificationsRepository.save(notification);
  }

  async findForUser(userId: number, role: string, schoolId: number): Promise<Notification[]> {
    const qb = this.notificationsRepository
      .createQueryBuilder('n')
      .leftJoinAndSelect('n.createdBy', 'createdBy')
      .where('n.schoolId = :schoolId', { schoolId })
      .orderBy('n.createdAt', 'DESC')
      .take(50);

    await this.applyRoleFilter(qb, 'n', userId, role, schoolId);

    return qb.getMany();
  }

  async markAsRead(id: number, schoolId: number): Promise<void> {
    await this.notificationsRepository.update({ id, schoolId }, { isRead: true });
  }

  async markAllAsRead(userId: number, role: string, schoolId: number): Promise<void> {
    const ids = await this.findForUser(userId, role, schoolId);
    const unreadIds = ids.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;

    await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .whereInIds(unreadIds)
      .execute();
  }

  async countUnread(userId: number, role: string, schoolId: number): Promise<number> {
    const qb = this.notificationsRepository
      .createQueryBuilder('n')
      .where('n.schoolId = :schoolId', { schoolId })
      .andWhere('n.isRead = false');

    if (role === UserRole.STUDENT) {
      const enrollment = await this.enrollmentService.getStudentClass(userId, schoolId);
      const classId = enrollment?.classId ?? null;
      qb.andWhere(
        '(n.target = :allStudents OR n.target = :allSchool OR (n.target = :student AND n.targetUserId = :userId)' +
        (classId ? ' OR (n.target = :class AND n.classId = :classId)' : '') + ')',
        { allStudents: NotificationTarget.ALL_STUDENTS, allSchool: NotificationTarget.ALL_SCHOOL, student: NotificationTarget.STUDENT, userId, class: NotificationTarget.CLASS, classId },
      );
    } else if (role === UserRole.TEACHER) {
      // SPECIFIC inclui mensagens carinhosas programadas enviadas individualmente
      qb.andWhere(
        '(n.target = :allSchool OR (n.target = :class AND n.createdById = :userId) OR (n.target = :specific AND n.targetUserId = :userId))',
        { allSchool: NotificationTarget.ALL_SCHOOL, class: NotificationTarget.CLASS, userId, specific: NotificationTarget.SPECIFIC },
      );
    } else {
      qb.andWhere(
        '(n.target = :director OR n.target = :allAdmins OR n.target = :allSchool OR (n.target = :specific AND n.targetUserId = :userId))',
        { director: NotificationTarget.DIRECTOR, allAdmins: NotificationTarget.ALL_ADMINS, allSchool: NotificationTarget.ALL_SCHOOL, specific: NotificationTarget.SPECIFIC, userId },
      );
    }

    return qb.getCount();
  }

  private async applyRoleFilter(qb: any, alias: string, userId: number, role: string, schoolId: number): Promise<void> {
    const p = alias ? `${alias}.` : '';

    if (role === UserRole.STUDENT) {
      const enrollment = await this.enrollmentService.getStudentClass(userId, schoolId);
      const classId = enrollment?.classId ?? null;
      qb.andWhere(
        `(${p}target = :allStudents OR ${p}target = :allSchool OR (${p}target = :student AND ${p}targetUserId = :userId)` +
        (classId ? ` OR (${p}target = :class AND ${p}classId = :classId)` : '') + ')',
        { allStudents: NotificationTarget.ALL_STUDENTS, allSchool: NotificationTarget.ALL_SCHOOL, student: NotificationTarget.STUDENT, userId, class: NotificationTarget.CLASS, classId },
      );
    } else if (role === UserRole.TEACHER) {
      // SPECIFIC inclui mensagens carinhosas programadas enviadas individualmente
      qb.andWhere(
        `(${p}target = :allSchool OR (${p}target = :class AND ${p}createdById = :userId) OR (${p}target = :specific AND ${p}targetUserId = :userId))`,
        { allSchool: NotificationTarget.ALL_SCHOOL, class: NotificationTarget.CLASS, userId, specific: NotificationTarget.SPECIFIC },
      );
    } else {
      // director / coordinator / secretary
      qb.andWhere(
        `(${p}target = :director OR ${p}target = :allAdmins OR ${p}target = :allSchool OR (${p}target = :specific AND ${p}targetUserId = :userId))`,
        {
          director: NotificationTarget.DIRECTOR,
          allAdmins: NotificationTarget.ALL_ADMINS,
          allSchool: NotificationTarget.ALL_SCHOOL,
          specific: NotificationTarget.SPECIFIC,
          userId,
        },
      );
    }
  }

  async update(id: number, dto: Partial<CreateNotificationDto>, schoolId: number, userId: number, role: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({ where: { id, schoolId } });
    if (!notification) throw new NotFoundException('Notificação não encontrada.');
    if (role === UserRole.TEACHER && notification.createdById !== userId) {
      throw new ForbiddenException('Sem permissão para editar esta notificação.');
    }
    Object.assign(notification, dto);
    return this.notificationsRepository.save(notification);
  }

  async remove(id: number, schoolId: number, userId: number, role: string): Promise<{ message: string }> {
    const notification = await this.notificationsRepository.findOne({ where: { id, schoolId } });
    if (!notification) throw new NotFoundException('Notificação não encontrada.');
    if (role === UserRole.TEACHER && notification.createdById !== userId) {
      throw new ForbiddenException('Sem permissão para excluir esta notificação.');
    }
    await this.notificationsRepository.remove(notification);
    return { message: 'Notificação removida com sucesso.' };
  }

  // ── CRUD de mensagens carinhosas (apenas diretor) ─────────────────────

  async listSystemMessages(): Promise<Array<SystemMessage & { sentCount: number }>> {
    const messages = await this.systemMessageRepo.find({ order: { createdAt: 'DESC' } });

    const results = await Promise.all(
      messages.map(async (msg) => {
        const sentCount = await this.userSystemMessageRepo.count({ where: { messageId: msg.id } });
        return { ...msg, sentCount };
      }),
    );

    return results;
  }

  async createSystemMessage(dto: CreateSystemMessageDto): Promise<SystemMessage> {
    const msg = this.systemMessageRepo.create({
      ...dto,
      isActive: dto.isActive ?? true,
    });
    return this.systemMessageRepo.save(msg);
  }

  async updateSystemMessage(id: number, dto: UpdateSystemMessageDto): Promise<SystemMessage> {
    const msg = await this.systemMessageRepo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Mensagem não encontrada.');
    Object.assign(msg, dto);
    return this.systemMessageRepo.save(msg);
  }

  async toggleSystemMessage(id: number): Promise<SystemMessage> {
    const msg = await this.systemMessageRepo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Mensagem não encontrada.');
    msg.isActive = !msg.isActive;
    return this.systemMessageRepo.save(msg);
  }
}
