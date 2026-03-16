import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SchoolsService } from '../schools/schools.service';
import { LoginDto } from './dto/login.dto';
import { RegisterSchoolDto } from './dto/register-school.dto';
import { UserRole } from '../users/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private schoolsService: SchoolsService,
    private jwtService: JwtService,
  ) {}

  // Registra nova escola e cria o diretor como primeiro usuário
  async register(dto: RegisterSchoolDto) {
    const school = await this.schoolsService.create({
      name: dto.schoolName,
      cnpj: dto.cnpj,
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

    const token = this.generateToken(director, school.id);

    return {
      message: 'Escola cadastrada com sucesso! Trial de 14 dias iniciado.',
      access_token: token,
      school,
      user: { id: director.id, name: director.name, email: director.email, role: director.role },
    };
  }

  // Login de qualquer usuário
  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const passwordMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Credenciais inválidas');

    if (!user.isActive) throw new UnauthorizedException('Usuário inativo');

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

  // Gera o token JWT com as informações do usuário
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