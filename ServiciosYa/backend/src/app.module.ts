import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { IdentityModule } from './identity/identity.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { JobsModule } from './jobs/jobs.module';
import { PostulacionesModule } from './postulaciones/postulaciones.module';
import { ConversacionesModule } from './conversaciones/conversaciones.module';
import { ResenasModule } from './resenas/resenas.module';
import { PreferenciasModule } from './preferencias/preferencias.module';
import { PagosModule } from './pagos/pagos.module';

@Module({
  imports: [
    // Límite por IP para rutas de autenticación; se aplica con ThrottlerGuard en cada controlador.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 10 }],
      errorMessage:
        'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
    }),
    AdminModule,
    IdentityModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    JobsModule,
    PostulacionesModule,
    PagosModule,
    ConversacionesModule,
    ResenasModule,
    PreferenciasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
