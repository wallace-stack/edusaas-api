import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SchoolsService } from '../schools/schools.service';
import { LoginDto } from './dto/login.dto';
import { RegisterSchoolDto } from './dto/register-school.dto';
import { UserRole } from '../users/user.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private schoolsService: SchoolsService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterSchoolDto) {
    const existingUser = await this.usersService.findByEmail(dto.directorEmail);
    if (existingUser) throw new ConflictException('E-mail já cadastrado.');

    const school = await this.schoolsService.create({
      name: dto.schoolName,
      cnpj: dto.cnpj.replace(/\D/g, ''),
      email: dto.schoolEmail,
      phone: dto.phone,
    });

    const director = await this.usersService.create({
      name: dto.directorName,
      email: dto.directorEmail,
      password: dto.password,
      role: UserRole.DIRECTOR,
      schoolId: school.id,
    });

    try {
      await this.mailService.sendWelcome(school.name, director.email, director.name);
    } catch (e) {
      console.error('[Mail] Erro boas-vindas:', e);
    }

    const token = this.generateToken(director, school.id);
    return {
      message: 'Escola cadastrada com sucesso! Trial de 14 dias iniciado.',
      access_token: token,
      school: { id: school.id, name: school.name },
      user: { id: director.id, name: director.name, email: director.email, role: director.role },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    const dummyHash = '$2b$10$invalidhashforcomparison000000000000000000000000000';
    const passwordMatch = user
      ? await bcrypt.compare(loginDto.password, user.password)
      : await bcrypt.compare(loginDto.password, dummyHash);

    if (!user || !passwordMatch) throw new UnauthorizedException('Credenciais inválidas.');
    if (!user.isActive) throw new UnauthorizedException('Usuário inativo.');

    const token = this.generateToken(user, user.schoolId);
    return {
      access_token: token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, schoolId: user.schoolId },
    };
  }

  // Solicita recuperação de senha — gera token e envia e-mail
  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    // Sempre retorna sucesso para não revelar se o e-mail existe
    if (!user) {
      return { message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.' };
    }

    // Gera token seguro de 32 bytes
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.usersService.setResetToken(user.id, resetToken, resetTokenExpiry);

    try {
      await this.mailService.sendPasswordReset(user.email, user.name, resetToken);
    } catch (e) {
      console.error('[Mail] Erro reset senha:', e);
    }

    return { message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.' };
  }

  // Redefine a senha usando o token recebido por e-mail
  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);

    if (!user) throw new BadRequestException('Token inválido ou expirado.');
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Token expirado. Solicite uma nova recuperação de senha.');
    }

    await this.usersService.updatePassword(user.id, newPassword);
    return { message: 'Senha redefinida com sucesso! Faça login com sua nova senha.' };
  }

  private generateToken(user: any, schoolId: number) {
    return this.jwtService.sign({ sub: user.id, email: user.email, role: user.role, schoolId });
  }
}