import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum PermissionKey {
  CRIAR_AVISO_GLOBAL = 'criar_aviso_global',
  CRIAR_AVISO_TURMA = 'criar_aviso_turma',
  EDITAR_NOTAS = 'editar_notas',
  LANCAR_FINANCEIRO = 'lancar_financeiro',
  VER_RELATORIOS_FINANCEIROS = 'ver_relatorios_financeiros',
  MATRICULAR_ALUNO = 'matricular_aluno',
  EDITAR_ALUNO = 'editar_aluno',
  CRIAR_TURMA = 'criar_turma',
  NOMEAR_TURMA = 'nomear_turma',
  GERENCIAR_PROFESSORES_TURMA = 'gerenciar_professores_turma',
  EDITAR_MATERIAS_TURMA = 'editar_materias_turma',
  VER_CHAMADAS_OUTRAS_TURMAS = 'ver_chamadas_outras_turmas',
  RECEBER_CADERNO_PLANEJAMENTO = 'receber_caderno_planejamento',
  CONFIGURAR_MODULO_INFANTIL = 'configurar_modulo_infantil',
  EDITAR_USUARIO = 'editar_usuario',
  EXCLUIR_USUARIO = 'excluir_usuario',
}

export const ALL_PERMISSION_KEYS = Object.values(PermissionKey);

/** Permissões padrão por role ao criar um usuário. */
export const DEFAULT_PERMISSIONS: Record<string, Record<PermissionKey, boolean>> = {
  director: Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, true])) as Record<PermissionKey, boolean>,

  coordinator: {
    [PermissionKey.CRIAR_AVISO_GLOBAL]: true,
    [PermissionKey.CRIAR_AVISO_TURMA]: true,
    [PermissionKey.EDITAR_NOTAS]: true,
    [PermissionKey.LANCAR_FINANCEIRO]: false,
    [PermissionKey.VER_RELATORIOS_FINANCEIROS]: false,
    [PermissionKey.MATRICULAR_ALUNO]: true,
    [PermissionKey.EDITAR_ALUNO]: true,
    [PermissionKey.CRIAR_TURMA]: true,
    [PermissionKey.NOMEAR_TURMA]: true,
    [PermissionKey.GERENCIAR_PROFESSORES_TURMA]: true,
    [PermissionKey.EDITAR_MATERIAS_TURMA]: true,
    [PermissionKey.VER_CHAMADAS_OUTRAS_TURMAS]: true,
    [PermissionKey.RECEBER_CADERNO_PLANEJAMENTO]: true,
    [PermissionKey.CONFIGURAR_MODULO_INFANTIL]: true,
    [PermissionKey.EDITAR_USUARIO]: false,
    [PermissionKey.EXCLUIR_USUARIO]: false,
  },

  secretary: {
    [PermissionKey.CRIAR_AVISO_GLOBAL]: true,
    [PermissionKey.CRIAR_AVISO_TURMA]: true,
    [PermissionKey.EDITAR_NOTAS]: false,
    [PermissionKey.LANCAR_FINANCEIRO]: true,
    [PermissionKey.VER_RELATORIOS_FINANCEIROS]: true,
    [PermissionKey.MATRICULAR_ALUNO]: true,
    [PermissionKey.EDITAR_ALUNO]: true,
    [PermissionKey.CRIAR_TURMA]: false,
    [PermissionKey.NOMEAR_TURMA]: false,
    [PermissionKey.GERENCIAR_PROFESSORES_TURMA]: false,
    [PermissionKey.EDITAR_MATERIAS_TURMA]: false,
    [PermissionKey.VER_CHAMADAS_OUTRAS_TURMAS]: false,
    [PermissionKey.RECEBER_CADERNO_PLANEJAMENTO]: true,
    [PermissionKey.CONFIGURAR_MODULO_INFANTIL]: true,
    [PermissionKey.EDITAR_USUARIO]: false,
    [PermissionKey.EXCLUIR_USUARIO]: false,
  },

  teacher: Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, false])) as Record<PermissionKey, boolean>,
  student: Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, false])) as Record<PermissionKey, boolean>,
};

/**
 * Permissão granular de um usuário específico.
 * Cada linha = uma das 16 chaves de permissão para um dado usuário.
 */
@Entity('user_permission')
@Unique('UQ_user_permission_userId_key', ['userId', 'permissionKey'])
export class UserPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  schoolId: number;

  @Column({ type: 'enum', enum: PermissionKey })
  permissionKey: PermissionKey;

  @Column({ default: true })
  granted: boolean;

  /** Quem fez a última alteração (id do diretor). Null = seed automático. */
  @Column({ nullable: true })
  updatedBy: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
