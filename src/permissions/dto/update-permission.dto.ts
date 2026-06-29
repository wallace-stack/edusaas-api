import { IsEnum, IsBoolean } from 'class-validator';
import { PermissionKey } from '../user-permission.entity';

export class UpdatePermissionDto {
  @IsEnum(PermissionKey, { message: 'Chave de permissão inválida.' })
  permissionKey: PermissionKey;

  @IsBoolean({ message: 'O campo "granted" deve ser verdadeiro ou falso.' })
  granted: boolean;
}
