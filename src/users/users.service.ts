import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // Busca usuário por email — usado no login
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['school'],
    });
  }

  // Busca usuário por ID
  async findOne(id: number, schoolId: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id, schoolId },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  // Lista usuários por escola e papel
  async findBySchool(schoolId: number, role?: UserRole): Promise<User[]> {
    const where: any = { schoolId, isActive: true };
    if (role) where.role = role;
    return this.usersRepository.find({ where });
  }

  // Cria um novo usuário com senha criptografada
  async create(data: Partial<User>): Promise<User> {
    try {
      const hashedPassword = await bcrypt.hash(data.password!, 10);
      const user = this.usersRepository.create({
        ...data,
        password: hashedPassword,
      });
      return await this.usersRepository.save(user);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Email já cadastrado');
      }
      throw error;
    }
  }

  // Remove um usuário (soft delete — apenas desativa)
  async remove(id: number, schoolId: number): Promise<void> {
    const user = await this.findOne(id, schoolId);
    user.isActive = false;
    await this.usersRepository.save(user);
  }
}