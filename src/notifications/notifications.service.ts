import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationTarget } from './notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { EnrollmentService } from '../enrollment/enrollment.service';
import { UserRole } from '../users/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
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
      qb.andWhere(
        '(n.target = :allSchool OR (n.target = :class AND n.createdById = :userId))',
        { allSchool: NotificationTarget.ALL_SCHOOL, class: NotificationTarget.CLASS, userId },
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
      qb.andWhere(
        `(${p}target = :allSchool OR (${p}target = :class AND ${p}createdById = :userId))`,
        { allSchool: NotificationTarget.ALL_SCHOOL, class: NotificationTarget.CLASS, userId },
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
}
