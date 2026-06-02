import {
  IsEnum, IsNotEmpty, IsNumber, IsOptional,
  IsString, IsObject, IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PeriodType, ModuleType } from '../teaching-plan.entity';

export class CreateTeachingPlanDto {
  // ── Módulo ────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsEnum(ModuleType)
  moduleType?: ModuleType;

  // ── Turma / disciplina ────────────────────────────────────────────────────
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  classId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  subjectId?: number;

  // ── Identificação ─────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  ageGroup?: string;

  @IsOptional()
  @IsString()
  gradeLevel?: string;

  // ── Período ───────────────────────────────────────────────────────────────
  @IsOptional()
  @IsDateString()
  referenceDate?: string;

  @IsOptional()
  @IsEnum(PeriodType)
  periodType?: PeriodType;

  @IsOptional()
  @IsDateString()
  weekStart?: string;

  @IsOptional()
  @IsDateString()
  weekEnd?: string;

  // ── Conteúdo geral / regular ──────────────────────────────────────────────
  @IsOptional()
  @IsString()
  content?: string;

  // ── BNCC ──────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  generalObjective?: string;

  @IsOptional()
  @IsObject()
  bncFields?: { fields: string[]; codes: string[] };

  @IsOptional()
  @IsObject()
  bnccSkills?: { codes: string[] };

  // ── Desenvolvimento — Infantil ────────────────────────────────────────────
  @IsOptional()
  @IsString()
  welcome?: string;

  @IsOptional()
  @IsString()
  mainActivity?: string;

  @IsOptional()
  @IsString()
  playActivity?: string;

  @IsOptional()
  @IsString()
  closure?: string;

  // ── Desenvolvimento — Ambos ───────────────────────────────────────────────
  @IsOptional()
  @IsString()
  methodology?: string;

  @IsOptional()
  @IsString()
  assessment?: string;

  @IsOptional()
  @IsString()
  resources?: string;
}
