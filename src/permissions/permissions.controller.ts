import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsService } from './permissions.service';
import { BulkUpdatePermissionsDto } from './dto/bulk-update-permissions.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';

@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Lista as 16 permissões de um usuário.
   * Acesso: DIRECTOR (ver qualquer um) ou o próprio usuário (ver as suas).
   */
  @Get('user/:userId')
  async getUserPermissions(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() currentUser: any,
  ) {
    const isDirector = currentUser.role === UserRole.DIRECTOR;
    const isSelf = currentUser.userId === userId;

    if (!isDirector && !isSelf) {
      throw new ForbiddenException(
        'Apenas o diretor pode visualizar permissões de outros usuários.',
      );
    }

    const target = await this.usersService.findOne(userId, currentUser.schoolId);
    if (!target) throw new NotFoundException('Usuário não encontrado.');

    const permissions = await this.permissionsService.getUserPermissions(
      userId,
      target.role,
    );

    return {
      userId,
      name: target.name,
      role: target.role,
      isDirector: target.role === UserRole.DIRECTOR,
      permissions,
    };
  }

  /**
   * Atualiza uma permissão específica de um usuário.
   * Acesso: apenas DIRECTOR.
   */
  @Patch('user/:userId')
  @Roles(UserRole.DIRECTOR)
  async updatePermission(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdatePermissionDto,
    @CurrentUser() currentUser: any,
  ) {
    const target = await this.usersService.findOne(userId, currentUser.schoolId);
    if (!target) throw new NotFoundException('Usuário não encontrado.');

    return this.permissionsService.updatePermission(
      userId,
      target.role,
      dto,
      currentUser.userId,
    );
  }

  /**
   * Atualiza várias permissões de um usuário de uma vez.
   * Acesso: apenas DIRECTOR.
   */
  @Patch('user/:userId/bulk')
  @Roles(UserRole.DIRECTOR)
  async bulkUpdatePermissions(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: BulkUpdatePermissionsDto,
    @CurrentUser() currentUser: any,
  ) {
    const target = await this.usersService.findOne(userId, currentUser.schoolId);
    if (!target) throw new NotFoundException('Usuário não encontrado.');

    const updated = await this.permissionsService.bulkUpdatePermissions(
      userId,
      target.role,
      dto.permissions,
      currentUser.userId,
    );

    return {
      updated: updated.length,
      permissions: updated,
    };
  }
}
