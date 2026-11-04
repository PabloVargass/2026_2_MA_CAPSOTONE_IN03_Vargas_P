import { Injectable } from '@nestjs/common';

import type { PreferenciaUsuario } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GuardarPreferenciasDto } from './preferencias.dto';

@Injectable()
export class PreferenciasService {
  constructor(private readonly prisma: PrismaService) {}

  async obtener(usuarioId: string) {
    const preferencia = await this.prisma.preferenciaUsuario.findUnique({
      where: { usuarioId },
    });
    return this.respuesta(preferencia);
  }

  async guardar(usuarioId: string, dto: GuardarPreferenciasDto) {
    const datos = {
      objetivo: dto.goal,
      // Evita repetir la misma categoría escrita con otras mayúsculas.
      categorias: [
        ...new Map(
          dto.categories.map((categoria) => [
            categoria.toLocaleLowerCase('es'),
            categoria,
          ]),
        ).values(),
      ],
      regionId: dto.regionId ?? null,
      comuna: dto.commune ?? null,
      rangoPresupuesto: dto.budgetRange ?? null,
      disponibilidad: dto.availability,
      completadoEn: new Date(),
      omitidoEn: null,
    };
    const preferencia = await this.prisma.preferenciaUsuario.upsert({
      where: { usuarioId },
      create: { usuarioId, ...datos },
      update: datos,
    });
    return this.respuesta(preferencia);
  }

  // Omitir no borra respuestas anteriores; solo evita volver a mostrar el cuestionario.
  async omitir(usuarioId: string) {
    const ahora = new Date();
    const preferencia = await this.prisma.preferenciaUsuario.upsert({
      where: { usuarioId },
      create: { usuarioId, omitidoEn: ahora },
      update: { omitidoEn: ahora },
    });
    return this.respuesta(preferencia);
  }

  private respuesta(preferencia: PreferenciaUsuario | null) {
    const completed = Boolean(preferencia?.completadoEn);
    return {
      completed,
      skipped: Boolean(preferencia?.omitidoEn),
      preferences:
        preferencia && completed
          ? {
              goal: preferencia.objetivo,
              categories: preferencia.categorias,
              regionId: preferencia.regionId,
              commune: preferencia.comuna,
              budgetRange: preferencia.rangoPresupuesto,
              availability: preferencia.disponibilidad,
              updatedAt: preferencia.actualizadoEn,
            }
          : null,
    };
  }
}
