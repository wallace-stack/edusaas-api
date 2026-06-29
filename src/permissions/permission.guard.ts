import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from './permissions.service';
import { PERMISSION_KEY } from './decorators/require-permission.decorator';
import { PermissionKey } from './user-permission.entity';
import { UserRole } from '../users/user.entity';

/**
 * Guard de permissão granular.
 * Deve ser adicionado DEPOIS de AuthGuard('jwt') e RolesGuard nas rotas que o usam.
 * Se não houver @RequirePermission() na rota, o guard passa sem verificar.
 *
 * Roles que estão FORA do sistema de permissões granulares (fase 1):
 *   - DIRECTOR  → sempre tem tudo, nunca bloqueado
 *   - TEACHER   → usa apenas @Roles(), sem camada extra de permissão
 *   - STUDENT   → usa apenas @Roles(), sem camada extra de permissão
 *
 * Roles sujeitos ao check granular: COORDINATOR e SECRETARY.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<PermissionKey>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Rota sem @RequirePermission — passa sem checar
    if (!requiredPermission) return true;

    const { user } = context.switchToHttp().getRequest();

    // DIRECTOR, TEACHER e STUDENT não passam por verificação granular:
    // continuam protegidos apenas pelo @Roles() existente.
    if (
      user.role === UserRole.DIRECTOR ||
      user.role === UserRole.TEACHER ||
      user.role === UserRole.STUDENT
    ) {
      return true;
    }

    const granted = await this.permissionsService.hasPermission(
      user.userId,
      user.role as UserRole,
      requiredPermission,
    );

    if (!granted) {
      throw new ForbiddenException(
        'Você não tem permissão para realizar esta ação. Solicite ao diretor.',
      );
    }

    return true;
  }
}
