import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { AuthService } from './auth.service';

import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';

// Máximo 10 solicitudes por minuto e IP en cada ruta; 5 en las de códigos y contraseña.
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // =====================================
  // REGISTRO
  // =====================================

  @Post('register')
  register(
    @Body()
    registerDto: RegisterDto,
  ) {
    return this.authService.register(
      registerDto,
    );
  }

  // =====================================
  // INICIO DE SESIÓN
  // =====================================

  @Post('login')
  login(
    @Body()
    loginDto: LoginDto,
  ) {
    return this.authService.login(
      loginDto,
    );
  }

  // =====================================
  // GOOGLE
  // =====================================

  @Post('google')
  googleLogin(
    @Body()
    googleLoginDto: GoogleLoginDto,
  ) {
    return this.authService.googleLogin(
      googleLoginDto,
    );
  }

  // =====================================
  // VERIFICAR CORREO
  // =====================================

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify-email')
  verifyEmail(
    @Body()
    verifyEmailDto: VerifyEmailDto,
  ) {
    return this.authService.verifyEmail(
      verifyEmailDto,
    );
  }

  // =====================================
  // REENVIAR VERIFICACIÓN
  // =====================================

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('resend-verification')
  resendVerification(
    @Body()
    resendVerificationDto: ResendVerificationDto,
  ) {
    return this.authService.resendVerification(
      resendVerificationDto,
    );
  }

  // =====================================
  // OLVIDÉ MI CONTRASEÑA
  // =====================================

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  forgotPassword(
    @Body()
    forgotPasswordDto: ForgotPasswordDto,
  ) {
    return this.authService.forgotPassword(
      forgotPasswordDto,
    );
  }

  // =====================================
  // VERIFICAR CÓDIGO DE RECUPERACIÓN
  // =====================================

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify-reset-code')
  verifyResetCode(
    @Body()
    verifyResetCodeDto: VerifyResetCodeDto,
  ) {
    return this.authService.verifyResetCode(
      verifyResetCodeDto,
    );
  }

  // =====================================
  // CAMBIAR CONTRASEÑA
  // =====================================

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  resetPassword(
    @Body()
    resetPasswordDto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(
      resetPasswordDto,
    );
  }
}