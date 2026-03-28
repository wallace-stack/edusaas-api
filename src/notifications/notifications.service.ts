import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationTarget, NotificationType } from './notification.entity';
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
      .where('n.schoolId = :schoolId', { schoolId })
      .orderBy('n.createdAt', 'DESC')
      .take(50);

    if (role === UserRole.STUDENT) {
      const enrollment = await this.enrollmentService.getStudentClass(userId, schoolId);
      const classId = enrollment?.classId ?? null;
      qb.andWhere(
        '(n.target = :allStudents OR (n.target = :student AND n.targetUserId = :userId)' +
        (classId ? ' OR (n.target = :class AND n.classId = :classId)' : '') + ')',
        { allStudents: NotificationTarget.ALL_STUDENTS, student: NotificationTarget.STUDENT, userId, class: NotificationTarget.CLASS, classId },
      );
    } else if (role === UserRole.TEACHER) {
      qb.andWhere(
        '(n.target = :class AND n.createdById = :userId)',
        { class: NotificationTarget.CLASS, userId },
      );
    } else {
      // director / coordinator / secretary
      qb.andWhere(
        '(n.target = :director OR n.target = :allAdmins OR (n.target = :specific AND n.targetUserId = :userId))',
        {
          director: NotificationTarget.DIRECTOR,
          allAdmins: NotificationTarget.ALL_ADMINS,
          specific: NotificationTarget.SPECIFIC,
          userId,
        },
      );
    }

    return qb.getMany();
  }

  async markAsRead(id: number, schoolId: number): Promise<void> {
    await this.notificationsRepository.update({ id, schoolId }, { isRead: true });
  }

  async markAllAsRead(userId: number, schoolId: number): Promise<void> {
    await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('schoolId = :schoolId AND (targetUserId = :userId OR targetUserId IS NULL)', { schoolId, userId })
      .execute();
  }

  async countUnread(userId: number, schoolId: number): Promise<number> {
    return this.notificationsRepository
      .createQueryBuilder('n')
      .where('n.schoolId = :schoolId AND n.isRead = false', { schoolId })
      .andWhere('(n.targetUserId = :userId OR n.targetUserId IS NULL)', { userId })
      .getCount();
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
