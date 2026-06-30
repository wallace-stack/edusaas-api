import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SelectSchoolLoginDto } from './dto/select-school-login.dto';
import { RegisterSchoolDto } from './dto/register-school.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  register(@Body() dto: RegisterSchoolDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Segunda etapa do login multi-escola.
   * Chamado quando POST /auth/login retorna { requiresSchoolSelection: true }.
   * Recebe email + password + schoolId escolhido e retorna o access_token final.
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login/select-school')
  loginSelectSchool(@Body() dto: SelectSchoolLoginDto) {
    return this.authService.loginSelectSchool(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }
}