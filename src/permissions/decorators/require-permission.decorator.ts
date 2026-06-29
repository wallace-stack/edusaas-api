import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from '../user-permission.entity';

export const PERMISSION_KEY = 'require_permission';

/**
 * Decorator que exige uma permissão granular para acessar a rota.
 * Usado em conjunto com @Roles() (não substitui).
 * DIRECTOR sempre passa; demais roles são checados via PermissionsService.
 *
 * Exemplo:
 *   @RequirePermission(PermissionKey.EDITAR_NOTAS)
 *   @Roles(UserRole.TEACHER, UserRole.COORDINATOR)
 *   async create(...) {}
 */
export const RequirePermission = (key: PermissionKey) =>
  SetMetadata(PERMISSION_KEY, key);
