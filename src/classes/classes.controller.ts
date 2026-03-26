import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR, UserRole.SECRETARY)
  createClass(@Body() dto: CreateClassDto, @CurrentUser() user: any) {
    return this.classesService.createClass(dto, user.schoolId);
  }

  @Get()
  findAllClasses(@CurrentUser() user: any) {
    return this.classesService.findAllClasses(user.schoolId);
  }

  @Get('my')
  getMyClasses(@Request() req) {
    return this.classesService.findByTeacher(req.user.userId, req.user.schoolId);
  }

  @Get(':id')
  findOneClass(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.classesService.findOneClass(id, user.schoolId);
  }

  @Post('subjects')
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR, UserRole.SECRETARY)
  createSubject(@Body() dto: CreateSubjectDto, @CurrentUser() user: any) {
    return this.classesService.createSubject(dto, user.schoolId);
  }

  @Get(':id/subjects')
  findSubjects(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.classesService.findSubjectsByClass(id, user.schoolId);
  }
}