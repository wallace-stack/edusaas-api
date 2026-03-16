// Importa os decorators do TypeORM necessários para criar entidades
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

// Importa a entidade School para criar relacionamento
import { School } from '../schools/school.entity';

/**
 * Enum que define os tipos de usuários do sistema.
 * Controla permissões dentro da aplicação.
 */
export enum UserRole {
  DIRECTOR = 'director',       // diretor da escola
  COORDINATOR = 'coordinator', // coordenador pedagógico
  TEACHER = 'teacher',         // professor
  STUDENT = 'student',         // aluno
}

/**
 * Entidade que representa a tabela "users" no banco de dados.
 * Cada registro representa um usuário do sistema.
 */
@Entity()
export class User {

  /**
   * ID único do usuário.
   * Gerado automaticamente pelo banco.
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Nome completo do usuário.
   */
  @Column()
  name: string;

  /**
   * Email do usuário.
   * Marcado como UNIQUE para impedir duplicação.
   */
  @Column({ unique: true })
  email: string;

  /**
   * Senha do usuário (hash).
   * IMPORTANTE: nunca salvar senha em texto puro.
   * Deve ser armazenada criptografada com bcrypt ou argon2.
   */
  @Column()
  password: string;

  /**
   * Papel do usuário dentro do sistema.
   * Define permissões e acessos.
   */
  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  /**
   * Telefone do usuário.
   * Campo opcional.
   */
  @Column({ nullable: true })
  phone: string;

  /**
   * Documento do usuário (CPF, RG ou matrícula).
   * Pode ser usado para identificação.
   */
  @Column({ nullable: true })
  document: string;

  /**
   * Data de nascimento do usuário.
   */
  @Column({ nullable: true })
  birthDate: Date;

  /**
   * Indica se o usuário está ativo.
   * Permite desativar sem apagar do banco.
   */
  @Column({ default: true })
  isActive: boolean;

  /**
   * Relacionamento MANY TO ONE com School.
   * Muitos usuários pertencem a uma escola.
   */
  @ManyToOne(() => School, { eager: false })
  @JoinColumn({ name: 'school_id' })
  school: School;

  /**
   * ID da escola associada ao usuário.
   * Mantido separado para facilitar queries.
   */
  @Column()
  schoolId: number;

  /**
   * Data automática de criação do registro.
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Data automática da última atualização.
   */
  @UpdateDateColumn()
  updatedAt: Date;
}