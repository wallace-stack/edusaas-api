import { IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres.' })
  @Matches(/[A-Z]/, { message: 'Senha deve ter ao menos uma letra maiúscula.' })
  @Matches(/[0-9]/, { message: 'Senha deve ter ao menos um número.' })
  password: string;
}