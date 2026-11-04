import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PreferenciasController } from './preferencias.controller';
import { PreferenciasService } from './preferencias.service';

@Module({
  imports: [AuthModule],
  controllers: [PreferenciasController],
  providers: [PreferenciasService, JwtAuthGuard],
})
export class PreferenciasModule {}
