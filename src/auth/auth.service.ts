import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SchoolsService } from '../schools/schools.service';
import { LoginDto } from './dto/login.dto';
import { RegisterSchoolDto } from './dto/register-school.dto';
import { UserRole } from '../users/user.entity';
import * as bcrypt from 'bcrypt';
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
    // Verifica e-mail duplicado
    const existingUser = await this.usersService.findByEmail(dto.directorEmail);
    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado.');
    }

    // Cria escola
    const school = await this.schoolsService.create({
      name: dto.schoolName,
      cnpj: dto.cnpj.replace(/\D/g, ''),
      email: dto.schoolEmail,
      phone: dto.phone,
    });

    // Cria diretor
    const director = await this.usersService.create({
      name: dto.directorName,
      email: dto.directorEmail,
      password: dto.password,
      role: UserRole.DIRECTOR,
      schoolId: school.id,
    });

    // Envia e-mail após criar usuário — falha não derruba o cadastro
    try {
      await this.mailService.sendWelcome(school.name, director.email, director.name);
    } catch (mailError) {
      console.error('[MailService] Falha ao enviar e-mail de boas-vindas:', mailError);
    }

    const token = this.generateToken(director, school.id);

    return {
      message: 'Escola cadastrada com sucesso! Trial de 14 dias iniciado.',
      access_token: token,
      school: { id: school.id, name: school.name },
      user: {
        id: director.id,
        name: director.name,
        email: director.email,
        role: director.role,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    const dummyHash = '$2b$10$invalidhashforcomparison000000000000000000000000000';
    const passwordMatch = user
      ? await bcrypt.compare(loginDto.password, user.password)
      : await bcrypt.compare(loginDto.password, dummyHash);

    if (!user || !passwordMatch) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuário inativo. Entre em contato com o suporte.');
    }

    const token = this.generateToken(user, user.schoolId);

    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      },
    };
  }

  private generateToken(user: any, schoolId: number) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      schoolId,
    };
    return this.jwtService.sign(payload);
  }
}