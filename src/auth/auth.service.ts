import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
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
    private dataSource: DataSource,
  ) {}

  // Registra nova escola e cria o diretor dentro de uma transação
  async register(dto: RegisterSchoolDto) {
    // Normaliza CNPJ — remove máscara antes de salvar
    const cnpjClean = dto.cnpj.replace(/\D/g, '');

    // Verifica duplicatas antes de iniciar a transação
    const existingSchool = await this.schoolsService.findByCnpj(cnpjClean);
    if (existingSchool) {
      throw new ConflictException('CNPJ já cadastrado.');
    }

    const existingUser = await this.usersService.findByEmail(dto.directorEmail);
    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado.');
    }

    // Usa transação para garantir consistência: ou cria tudo ou não cria nada
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const school = await this.schoolsService.createWithRunner(
        {
          name: dto.schoolName,
          cnpj: cnpjClean,
          email: dto.schoolEmail,
          phone: dto.phone,
        },
        queryRunner,
      );

      const director = await this.usersService.createWithRunner(
        {
          name: dto.directorName,
          email: dto.directorEmail,
          password: dto.password,
          role: UserRole.DIRECTOR,
          schoolId: school.id,
        },
        queryRunner,
      );

      await queryRunner.commitTransaction();

      // Envia e-mail APÓS commit — falha no e-mail não reverte o cadastro
      try {
        await this.mailService.sendWelcome(school.name, director.email, director.name);
      } catch (mailError) {
        // Log do erro mas não interrompe o fluxo — usuário já foi criado
        console.error('[MailService] Falha ao enviar e-mail de boas-vindas:', mailError);
      }

      const token = this.generateToken(director, school.id);

      return {
        message: 'Escola cadastrada com sucesso! Trial de 14 dias iniciado.',
        access_token: token,
        school: { id: school.id, name: school.name, cnpj: school.cnpj },
        user: {
          id: director.id,
          name: director.name,
          email: director.email,
          role: director.role,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof ConflictException) throw error;

      throw new InternalServerErrorException(
        'Erro ao cadastrar escola. Tente novamente.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  // Login de qualquer usuário
  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    // Sempre compara hash para evitar timing attack
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