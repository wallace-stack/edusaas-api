import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator';
import { Transform } from 'class-transformer';

// ─── Validador de CNPJ com dígitos verificadores ─────────────────────────
@ValidatorConstraint({ name: 'isCnpj', async: false })
export class IsCnpjConstraint implements ValidatorConstraintInterface {
  validate(cnpj: string) {
    const nums = (cnpj || '').replace(/\D/g, '');
    if (nums.length !== 14) return false;
    if (/^(\d)\1+$/.test(nums)) return false;

    const calc = (n: string, len: number) => {
      let sum = 0;
      let pos = len - 7;
      for (let i = len; i >= 1; i--) {
        sum += parseInt(n[len - i]) * pos--;
        if (pos < 2) pos = 9;
      }
      const r = sum % 11;
      return r < 2 ? 0 : 11 - r;
    };

    const d1 = calc(nums, 12);
    const d2 = calc(nums, 13);
    return d1 === parseInt(nums[12]) && d2 === parseInt(nums[13]);
  }

  defaultMessage() {
    return 'CNPJ inválido.';
  }
}

// ─── DTO ──────────────────────────────────────────────────────────────────
export class RegisterSchoolDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome da escola é obrigatório.' })
  @MinLength(3, { message: 'Nome da escola deve ter ao menos 3 caracteres.' })
  schoolName: string;

  @IsString()
  @IsNotEmpty({ message: 'CNPJ é obrigatório.' })
  // Remove máscara caso ainda venha formatado
  @Transform(({ value }) => (value as string).replace(/\D/g, ''))
  @Validate(IsCnpjConstraint)
  cnpj: string;

  @IsEmail({}, { message: 'E-mail da escola inválido.' })
  schoolEmail: string;

  @IsString()
  @IsNotEmpty({ message: 'Nome do diretor é obrigatório.' })
  @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres.' })
  directorName: string;

  @IsEmail({}, { message: 'E-mail do diretor inválido.' })
  directorEmail: string;

  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres.' })
  @Matches(/[A-Z]/, { message: 'Senha deve ter ao menos uma letra maiúscula.' })
  @Matches(/[0-9]/, { message: 'Senha deve ter ao menos um número.' })
  password: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10,11}$/, {
    message: 'Telefone inválido. Informe apenas números (10 ou 11 dígitos).',
  })
  // Remove máscara antes de salvar
  @Transform(({ value }) => value?.replace(/\D/g, '') || undefined)
  phone?: string;
}