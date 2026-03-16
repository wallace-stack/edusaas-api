import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationTarget } from './notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) {}

  // Cria uma notificação
  async create(dto: CreateNotificationDto, schoolId: number, createdById: number): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      ...dto,
      schoolId,
      createdById,
    });
    return this.notificationsRepository.save(notification);
  }

  // Busca notificações do usuário (feed)
  async findForUser(userId: number, role: string, schoolId: number): Promise<Notification[]> {
    return this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.schoolId = :schoolId', { schoolId })
      .andWhere(
        '(notification.target = :all OR notification.targetUserId = :userId OR notification.target = :role)',
        { all: NotificationTarget.ALL, userId, role },
      )
      .orderBy('notification.createdAt', 'DESC')
      .take(50)
      .getMany();
  }

  // Marca notificação como lida
  async markAsRead(id: number, schoolId: number): Promise<void> {
    await this.notificationsRepository.update(
      { id, schoolId },
      { isRead: true },
    );
  }

  // Marca todas como lidas
  async markAllAsRead(userId: number, schoolId: number): Promise<void> {
    await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('schoolId = :schoolId AND (targetUserId = :userId OR targetUserId IS NULL)', { schoolId, userId })
      .execute();
  }

  // Conta notificações não lidas
  async countUnread(userId: number, schoolId: number): Promise<number> {
    return this.notificationsRepository.count({
      where: { schoolId, isRead: false },
    });
  }
}