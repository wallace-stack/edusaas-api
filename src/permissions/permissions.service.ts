import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserPermission,
  PermissionKey,
  ALL_PERMISSION_KEYS,
  DEFAULT_PERMISSIONS,
} from './user-permission.entity';
import { UserRole } from '../users/user.entity';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(UserPermission)
    private permRepo: Repository<UserPermission>,
  ) {}

  /**
   * Cria as 16 permissões padrão para um usuário recém-criado.
   * Chamado automaticamente em UsersService.create().
   * Idempotente: usa upsert para evitar duplicatas.
   */
  async createDefaultPermissions(
    userId: number,
    role: UserRole,
    schoolId: number,
  ): Promise<void> {
    const defaults = DEFAULT_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS['teacher'];

    const entities = ALL_PERMISSION_KEYS.map((key) =>
      this.permRepo.create({
        userId,
        schoolId,
        permissionKey: key,
        granted: defaults[key] ?? false,
        updatedBy: null as any,
      }),
    );

    // Upsert: atualiza granted se o registro já existir (ex: seed re-executado)
    await this.permRepo
      .createQueryBuilder()
      .insert()
      .into(UserPermission)
      .values(entities)
      .orUpdate(['granted', 'updatedBy'], ['userId', 'permissionKey'])
      .execute();
  }

  /**
   * Retorna todas as 16 permissões de um usuário.
   * Se alguma linha estiver faltando no banco (usuário antigo), retorna o padrão do role.
   */
  async getUserPermissions(
    userId: number,
    role?: UserRole,
  ): Promise<UserPermission[]> {
    const rows = await this.permRepo.find({ where: { userId } });

    // Usuários criados antes desta feature podem não ter linhas — preenche defaults
    if (rows.length < ALL_PERMISSION_KEYS.length && role) {
      const existing = new Set(rows.map((r) => r.permissionKey));
      const defaults = DEFAULT_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS['teacher'];
      const missing = ALL_PERMISSION_KEYS.filter((k) => !existing.has(k));

      if (missing.length > 0) {
        const schoolId = rows[0]?.schoolId ?? 0;
        const fillers = missing.map((key) =>
          this.permRepo.create({
            userId,
            schoolId,
            permissionKey: key,
            granted: defaults[key] ?? false,
          }),
        );
        const saved = await this.permRepo.save(fillers);
        rows.push(...saved);
      }
    }

    // Garante ordem consistente
    return rows.sort((a, b) =>
      ALL_PERMISSION_KEYS.indexOf(a.permissionKey) -
      ALL_PERMISSION_KEYS.indexOf(b.permissionKey),
    );
  }

  /**
   * Verifica se o usuário tem uma permissão específica.
   * DIRECTOR sempre retorna true, independente do banco.
   */
  async hasPermission(
    userId: number,
    role: UserRole,
    permissionKey: PermissionKey,
  ): Promise<boolean> {
    if (role === UserRole.DIRECTOR) return true;

    const record = await this.permRepo.findOne({
      where: { userId, permissionKey },
    });

    // Se não há registro, usa o padrão do role (retrocompatibilidade)
    if (!record) {
      const defaults = DEFAULT_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS['teacher'];
      return defaults[permissionKey] ?? false;
    }

    return record.granted;
  }

  /**
   * Atualiza uma permissão de um usuário.
   * Nunca permite alterar permissões de um DIRECTOR.
   */
  async updatePermission(
    targetUserId: number,
    targetRole: UserRole,
    dto: UpdatePermissionDto,
    updatedByUserId: number,
  ): Promise<UserPermission> {
    if (targetRole === UserRole.DIRECTOR) {
      throw new ForbiddenException(
        'As permissões de um diretor não podem ser alteradas.',
      );
    }

    let record = await this.permRepo.findOne({
      where: { userId: targetUserId, permissionKey: dto.permissionKey },
    });

    if (!record) {
      throw new NotFoundException(
        'Registro de permissão não encontrado. Tente recriar as permissões padrão do usuário.',
      );
    }

    record.granted = dto.granted;
    record.updatedBy = updatedByUserId;
    return this.permRepo.save(record);
  }

  /**
   * Atualiza várias permissões de uma vez.
   * Nunca permite alterar permissões de um DIRECTOR.
   */
  async bulkUpdatePermissions(
    targetUserId: number,
    targetRole: UserRole,
    permissions: UpdatePermissionDto[],
    updatedByUserId: number,
  ): Promise<UserPermission[]> {
    if (targetRole === UserRole.DIRECTOR) {
      throw new ForbiddenException(
        'As permissões de um diretor não podem ser alteradas.',
      );
    }

    const results: UserPermission[] = [];
    for (const perm of permissions) {
      const record = await this.permRepo.findOne({
        where: { userId: targetUserId, permissionKey: perm.permissionKey },
      });

      if (record) {
        record.granted = perm.granted;
        record.updatedBy = updatedByUserId;
        results.push(await this.permRepo.save(record));
      }
    }
    return results;
  }
}
