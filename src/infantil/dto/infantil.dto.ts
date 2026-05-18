import { IsEnum, IsInt, IsOptional, IsString, IsDateString } from 'class-validator';
import { Conceito } from '../infantil-record.entity';

export class UpsertInfantilRecordDto {
  @IsInt() studentId!: number;
  @IsInt() classId!: number;
  @IsOptional() @IsInt() subjectId?: number;
  @IsInt() period!: number;
  @IsOptional() @IsEnum(Conceito) conceito?: Conceito | null;
  @IsOptional() @IsString() parecer?: string | null;
}

export class CreateDiarioBordoDto {
  @IsInt() classId!: number;
  @IsDateString() date!: string;
  @IsString() content!: string;
}

export class UpdateDiarioBordoDto {
  @IsOptional() @IsString() content?: string;
}

export class CreatePlanejamentoDiarioDto {
  @IsInt() classId!: number;
  @IsDateString() date!: string;
  @IsString() objetivos!: string;
  @IsString() atividades!: string;
  @IsOptional() @IsString() recursos?: string;
  @IsOptional() @IsString() observacoes?: string;
}

export class UpdatePlanejamentoDiarioDto {
  @IsOptional() @IsString() objetivos?: string;
  @IsOptional() @IsString() atividades?: string;
  @IsOptional() @IsString() recursos?: string;
  @IsOptional() @IsString() observacoes?: string;
}

export class UpdateClassModeDto {
  @IsEnum(['regular', 'infantil']) mode!: 'regular' | 'infantil';
  @IsOptional() infantilConfig?: {
    useConceito:     boolean;
    useParecer:      boolean;
    useDiarioBordo:  boolean;
    usePlanejamento: boolean;
  };
}
