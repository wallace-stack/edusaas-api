import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Diretor, coordenador, secretária e professor criam notificações
  @Post()
  @Roles(UserRole.DIRECTOR, UserRole.COORDINATOR, UserRole.SECRETARY, UserRole.TEACHER)
  create(@Body() dto: CreateNotificationDto, @CurrentUser() user: any) {
    return this.notificationsService.create(dto, user.schoolId, user.userId, user.role);
  }

  // Feed de notificações do usuário logado
  @Get()
  findMyNotifications(@CurrentUser() user: any) {
    return this.notificationsService.findForUser(user.userId, user.role, user.schoolId);
  }

  // Conta não lidas
  @Get('unread-count')
  countUnread(@CurrentUser() user: any) {
    return this.notificationsService.countUnread(user.userId, user.schoolId);
  }

  // Marca uma como lida
  @Patch(':id/read')
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.markAsRead(id, user.schoolId);
  }

  // Marca todas como lidas
  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.userId, user.schoolId);
  }

  // Editar notificação
  @Patch(':id')
  @Roles(UserRole.DIRECTOR, UserRole.COORDINATOR, UserRole.SECRETARY, UserRole.TEACHER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateNotificationDto>,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.update(id, dto, user.schoolId, user.userId, user.role);
  }

  // Remover notificação
  @Delete(':id')
  @Roles(UserRole.DIRECTOR, UserRole.COORDINATOR, UserRole.SECRETARY, UserRole.TEACHER)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.remove(id, user.schoolId, user.userId, user.role);
  }
}