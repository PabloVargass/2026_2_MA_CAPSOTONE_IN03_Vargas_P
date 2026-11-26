import { Module } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

@Module({
  controllers: [PagosController],
  providers: [PagosService, JwtAuthGuard],
})
export class PagosModule {}
