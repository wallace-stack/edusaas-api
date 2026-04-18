import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SecretaryService } from './secretary.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { SecretaryCreateTuitionDto, SecretaryPayTuitionDto } from './dto/create-tuition.dto';
import { CreateClassDto } from '../classes/dto/create-class.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
@Roles(UserRole.DIRECTOR, UserRole.COORDINATOR, UserRole.SECRETARY)
@Controller('secretary')
export class SecretaryController {
  constructor(private readonly secretaryService: SecretaryService) {}

  // Dashboard operacional da secretária
  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.secretaryService.getDashboard(user.schoolId);
  }

  // Listar alunos com status financeiro
  @Get('students')
  listStudents(@CurrentUser() user: any) {
    return this.secretaryService.listStudents(user.schoolId);
  }

  // Exportar alunos como CSV
  @Get('students/export')
  async exportStudentsCSV(@CurrentUser() user: any, @Res() res: any) {
    const csv = await this.secretaryService.exportStudentsCSV(user.schoolId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="alunos.csv"');
    res.send(csv);
  }

  // Matricular novo aluno
  @Post('students')
  enrollStudent(@Body() dto: CreateEnrollmentDto, @CurrentUser() user: any) {
    return this.secretaryService.enrollStudent(dto, user.schoolId);
  }

  @Post('students/import')
  importStudents(
    @Body() rows: Array<{
      name: string; email: string; className: string;
      phone?: string; document?: string; birthDate?: string;
      guardianName?: string; guardianPhone?: string; password?: string;
    }>,
    @CurrentUser() user: any,
  ) {
    return this.secretaryService.importStudents(rows, user.schoolId);
  }

  // Listar alunos de uma turma com dados pessoais completos
  @Get('classes/:classId/students')
  getStudentsByClass(
    @Param('classId', ParseIntPipe) classId: number,
    @CurrentUser() user: any,
  ) {
    return this.secretaryService.getStudentsByClass(classId, user.schoolId);
  }

  // Listar turmas
  @Get('classes')
  listClasses(@CurrentUser() user: any) {
    return this.secretaryService.listClasses(user.schoolId);
  }

  // Criar nova turma
  @Post('classes')
  createClass(@Body() dto: CreateClassDto, @CurrentUser() user: any) {
    return this.secretaryService.createClass(dto, user.schoolId);
  }

  // Editar turma
  @Put('classes/:id')
  updateClass(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateClassDto>,
    @CurrentUser() user: any,
  ) {
    return this.secretaryService.updateClass(id, dto, user.schoolId);
  }

  // Relatório financeiro completo
  @Get('financial')
  getFinancialReport(
    @CurrentUser() user: any,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.secretaryService.getFinancialReport(user.schoolId, Number(month) || undefined, Number(year) || undefined);
  }

  // Mensalidades pendentes/vencidas para o modal de pagamento
  @Get('financial/pending')
  getPendingTuitions(@CurrentUser() user: any) {
    return this.secretaryService.getPendingTuitions(user.schoolId);
  }

  // Lançar mensalidade
  @Post('financial/tuition')
  createTuition(@Body() dto: SecretaryCreateTuitionDto, @CurrentUser() user: any) {
    return this.secretaryService.createTuition(dto, user.schoolId);
  }

  // Registrar pagamento
  @Post('financial/payment')
  payTuition(@Body() dto: SecretaryPayTuitionDto, @CurrentUser() user: any) {
    return this.secretaryService.payTuition(dto, user.schoolId);
  }

  // Listar apenas professores
  @Get('teachers')
  getTeachers(@CurrentUser() user: any) {
    return this.secretaryService.getTeachers(user.schoolId);
  }

  // Listar professores e coordenadores
  @Get('users')
  listStaff(@CurrentUser() user: any) {
    return this.secretaryService.listStaff(user.schoolId);
  }

  // Criar professor, coordenador ou aluno (não pode criar diretor)
  @Post('users')
  createStaff(
    @Body() dto: { name: string; email: string; password: string; role: UserRole; phone?: string },
    @CurrentUser() user: any,
  ) {
    return this.secretaryService.createStaff(dto, user.schoolId);
  }

  // Desativar usuário
  @Delete('users/:id')
  deactivateUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.secretaryService.deactivateUser(id, user.schoolId);
  }
}
