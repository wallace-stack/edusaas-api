import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  Matches,
  IsDateString,
} from 'class-validator';

export class CreateEnrollmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome do aluno é obrigatório.' })
  @MinLength(2, { message: 'Nome deve ter ao menos 2 caracteres.' })
  name!: string;

  @IsEmail({}, { message: 'E-mail inválido.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres.' })
  @Matches(/[A-Z]/, { message: 'Senha deve conter ao menos uma letra maiúscula.' })
  @Matches(/[0-9]/, { message: 'Senha deve conter ao menos um número.' })
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10,11}$/, { message: 'Telefone inválido. Informe apenas números (10 ou 11 dígitos).' })
  phone?: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;
}
