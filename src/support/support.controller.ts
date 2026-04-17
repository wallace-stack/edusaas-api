import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { School } from '../schools/school.entity';
import * as bcrypt from 'bcrypt';

@Controller('support')
export class SupportController {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(School)
    private schoolsRepository: Repository<School>,
  ) {}

  @Post('access')
  async createSupportAccess(
    @Body() body: { masterKey: string; schoolId: number; supportEmail: string },
  ) {
    // Valida chave master via variável de ambiente
    if (body.masterKey !== process.env.SUPPORT_MASTER_KEY) {
      throw new UnauthorizedException('Chave inválida.');
    }

    const school = await this.schoolsRepository.findOne({ where: { id: body.schoolId } });
    if (!school) throw new UnauthorizedException('Escola não encontrada.');

    const tempPassword = 'Suporte@' + Math.random().toString(36).slice(-6).toUpperCase();
    const hashed = await bcrypt.hash(tempPassword, 10);

    // Cria ou atualiza usuário de suporte na escola
    let supportUser = await this.usersRepository.findOne({
      where: { email: body.supportEmail, schoolId: body.schoolId },
    });

    if (supportUser) {
      supportUser.password = hashed;
      supportUser.isActive = true;
      await this.usersRepository.save(supportUser);
    } else {
      supportUser = this.usersRepository.create({
        name: 'Suporte EduSaaS',
        email: body.supportEmail,
        password: hashed,
        role: UserRole.SECRETARY,
        schoolId: body.schoolId,
        isActive: true,
      });
      await this.usersRepository.save(supportUser);
    }

    return {
      message: `Acesso criado na escola "${school.name}"`,
      email: body.supportEmail,
      password: tempPassword,
      schoolId: body.schoolId,
      expiresIn: '24h — lembre de desativar após o suporte',
    };
  }
}
