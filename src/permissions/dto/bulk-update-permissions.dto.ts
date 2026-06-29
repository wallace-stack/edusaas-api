import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdatePermissionDto } from './update-permission.dto';

export class BulkUpdatePermissionsDto {
  @IsArray({ message: 'O campo "permissions" deve ser um array.' })
  @ValidateNested({ each: true })
  @Type(() => UpdatePermissionDto)
  permissions: UpdatePermissionDto[];
}
