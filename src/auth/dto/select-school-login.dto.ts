import { IsEmail, IsInt, IsString, Min, MinLength } from 'class-validator';

export class SelectSchoolLoginDto {
  @IsEmail({}, { message: 'E-mail inválido.' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres.' })
  password: string;

  @IsInt({ message: 'schoolId deve ser um número inteiro.' })
  @Min(1)
  schoolId: number;
}
