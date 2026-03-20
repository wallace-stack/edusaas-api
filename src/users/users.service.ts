import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, LessThan } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email }, relations: ['school'] });
  }

  async findOne(id: number, schoolId: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id, schoolId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async findBySchool(schoolId: number, role?: UserRole): Promise<User[]> {
    const where: any = { schoolId, isActive: true };
    if (role) where.role = role;
    return this.usersRepository.find({ where });
  }

  async create(data: Partial<User>): Promise<User> {
    try {
      const hashedPassword = await bcrypt.hash(data.password!, 10);
      const user = this.usersRepository.create({ ...data, password: hashedPassword });
      return await this.usersRepository.save(user);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') throw new ConflictException('E-mail já cadastrado.');
      throw error;
    }
  }

  async createWithRunner(data: Partial<User>, queryRunner: QueryRunner): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password!, 10);
    const user = queryRunner.manager.create(User, { ...data, password: hashedPassword });
    return await queryRunner.manager.save(User, user);
  }

  // Salva o token de reset e sua expiração
  async setResetToken(userId: number, token: string, expiry: Date): Promise<void> {
    await this.usersRepository.update(userId, {
      resetToken: token,
      resetTokenExpiry: expiry,
    });
  }

  // Busca usuário pelo token de reset (válido e não expirado)
  async findByResetToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: {
        resetToken: token,
      },
    });
  }

  // Atualiza a senha e limpa o token de reset
  async updatePassword(userId: number, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.update(userId, {
      password: hashedPassword,
      resetToken: null as any,
      resetTokenExpiry: null as any,
    });
  }

  async remove(id: number, schoolId: number): Promise<void> {
    const user = await this.findOne(id, schoolId);
    user.isActive = false;
    await this.usersRepository.save(user);
  }
}