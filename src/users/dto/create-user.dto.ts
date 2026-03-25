import { IsEmail, IsString, IsEnum, IsOptional, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { UserRole } from '../user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório.' })
  @MinLength(2, { message: 'Nome deve ter ao menos 2 caracteres.' })
  name!: string;

  @IsEmail({}, { message: 'E-mail inválido.' })
  @IsNotEmpty({ message: 'E-mail é obrigatório.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres.' })
  @Matches(/[A-Z]/, { message: 'Senha deve conter ao menos uma letra maiúscula.' })
  @Matches(/[0-9]/, { message: 'Senha deve conter ao menos um número.' })
  password!: string;

  @IsEnum(UserRole, { message: 'Papel inválido.' })
  role!: UserRole;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  document?: string;
}