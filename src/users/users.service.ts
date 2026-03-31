import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { User, UserRole } from './user.entity';
import { SchoolSubject } from '../classes/subject.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(SchoolSubject)
    private subjectsRepository: Repository<SchoolSubject>,
  ) { }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email }, relations: ['school'] });
  }

  async findOne(id: number, schoolId: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id, schoolId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async findBySchool(schoolId: number, role?: UserRole): Promise<User[] | any[]> {
    if (role === UserRole.TEACHER) {
      return this.findTeachersWithSubjects(schoolId);
    }
    const where: any = { schoolId, isActive: true };
    if (role) where.role = role;
    return this.usersRepository.find({ where });
  }

  async findTeachersWithSubjects(schoolId: number): Promise<any[]> {
    const teachers = await this.usersRepository.find({
      where: { schoolId, role: UserRole.TEACHER, isActive: true },
    });

    const subjects = await this.subjectsRepository.find({
      where: { schoolId },
      relations: ['schoolClass'],
    });

    return teachers.map(teacher => ({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      subjects: subjects
        .filter(s => s.teacherId === teacher.id)
        .map(s => ({
          subjectName: s.name,
          className: s.schoolClass?.name ?? null,
        })),
    }));
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

  async remove(id: number, schoolId: number, requestingUserId?: number): Promise<void> {
    const user = await this.findOne(id, schoolId);

    if (user.role === UserRole.DIRECTOR && user.id === requestingUserId) {
      throw new ForbiddenException('O diretor não pode excluir a si mesmo.');
    }

    user.isActive = false;
    await this.usersRepository.save(user);
  }

  async update(id: number, schoolId: number, data: Partial<{
    name: string;
    phone: string;
    document: string;
    birthDate: Date;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    addressNumber: string;
    complement: string;
    guardianName: string;
    guardianPhone: string;
    guardianRelation: string;
  }>): Promise<User> {
    const user = await this.findOne(id, schoolId);
    Object.assign(user, data);
    return this.usersRepository.save(user);
  }
}