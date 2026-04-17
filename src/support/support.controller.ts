import { Controller, Post, Body, UnauthorizedException, Req } from '@nestjs/common';
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

  private attempts = new Map<string, { count: number; firstAt: number }>();

  private checkRateLimit(ip: string) {
    const now = Date.now();
    const entry = this.attempts.get(ip);

    if (entry) {
      // Reset se passou 10 minutos
      if (now - entry.firstAt > 10 * 60 * 1000) {
        this.attempts.delete(ip);
      } else if (entry.count >= 5) {
        throw new UnauthorizedException('Muitas tentativas. Tente em 10 minutos.');
      }
    }
  }

  private registerAttempt(ip: string, success: boolean) {
    if (success) { this.attempts.delete(ip); return; }
    const entry = this.attempts.get(ip) ?? { count: 0, firstAt: Date.now() };
    entry.count++;
    this.attempts.set(ip, entry);
  }

  @Post('access')
  async createSupportAccess(
    @Req() req: any,
    @Body() body: { masterKey: string; schoolId: number; supportEmail: string },
  ) {
    const ip = req.ip ?? 'unknown';
    this.checkRateLimit(ip);

    // Valida chave master via variável de ambiente
    if (body.masterKey !== process.env.SUPPORT_MASTER_KEY) {
      this.registerAttempt(ip, false);
      throw new UnauthorizedException('Chave inválida.');
    }
    this.registerAttempt(ip, true);

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
