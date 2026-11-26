import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PagarDto } from './dto/pagar.dto';
import { PagosService } from './pagos.service';

type AuthenticatedRequest = Request & { user: { sub: string } };

@Controller('pagos')
@UseGuards(JwtAuthGuard)
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  // El cliente paga y con eso confirma el término del trabajo.
  @Post('trabajos/:id')
  pagar(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: PagarDto,
  ) {
    return this.pagos.pagarYCompletar(request.user.sub, id, dto.metodo);
  }

  @Get('billetera')
  billetera(@Req() request: AuthenticatedRequest) {
    return this.pagos.billetera(request.user.sub);
  }
}
