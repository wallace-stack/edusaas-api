import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MetricsService } from './metrics.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  // Dashboard do diretor
  @Get('director')
  @Roles(UserRole.DIRECTOR)
  getDirectorDashboard(@CurrentUser() user: any) {
    return this.metricsService.getDirectorDashboard(user.schoolId);
  }

  // Dashboard do coordenador
  @Get('coordinator')
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR)
  getCoordinatorDashboard(@CurrentUser() user: any) {
    return this.metricsService.getCoordinatorDashboard(user.schoolId);
  }

  // Dashboard do professor
  @Get('teacher')
  @Roles(UserRole.TEACHER)
  getTeacherDashboard(@CurrentUser() user: any) {
    return this.metricsService.getTeacherDashboard(user.userId, user.schoolId);
  }
}