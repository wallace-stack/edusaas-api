import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateSystemMessageDto, UpdateSystemMessageDto } from './dto/system-message.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Diretor, coordenador, secretaria e professor criam notificações
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
    return this.notificationsService.countUnread(user.userId, user.role, user.schoolId);
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
    return this.notificationsService.markAllAsRead(user.userId, user.role, user.schoolId);
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

  // ── Mensagens carinhosas programadas (apenas diretor) ─────────────────

  @Get('system-messages')
  @Roles(UserRole.DIRECTOR)
  listSystemMessages() {
    return this.notificationsService.listSystemMessages();
  }

  @Post('system-messages')
  @Roles(UserRole.DIRECTOR)
  createSystemMessage(@Body() dto: CreateSystemMessageDto) {
    return this.notificationsService.createSystemMessage(dto);
  }

  @Patch('system-messages/:id')
  @Roles(UserRole.DIRECTOR)
  updateSystemMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSystemMessageDto,
  ) {
    return this.notificationsService.updateSystemMessage(id, dto);
  }

  @Patch('system-messages/:id/toggle')
  @Roles(UserRole.DIRECTOR)
  toggleSystemMessage(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.toggleSystemMessage(id);
  }
}