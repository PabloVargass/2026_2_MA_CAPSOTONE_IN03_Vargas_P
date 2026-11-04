import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GuardarPreferenciasDto } from './preferencias.dto';
import { PreferenciasService } from './preferencias.service';

type AuthenticatedRequest = Request & { user: { sub: string } };

// Cada usuario solo lee y modifica sus propias preferencias, identificado por el JWT.
@Controller('users/me/preferencias')
@UseGuards(JwtAuthGuard)
export class PreferenciasController {
  constructor(private readonly preferenciasService: PreferenciasService) {}

  @Get()
  obtener(@Req() request: AuthenticatedRequest) {
    return this.preferenciasService.obtener(request.user.sub);
  }

  @Put()
  guardar(
    @Req() request: AuthenticatedRequest,
    @Body() dto: GuardarPreferenciasDto,
  ) {
    return this.preferenciasService.guardar(request.user.sub, dto);
  }

  @Post('omitir')
  omitir(@Req() request: AuthenticatedRequest) {
    return this.preferenciasService.omitir(request.user.sub);
  }
}
