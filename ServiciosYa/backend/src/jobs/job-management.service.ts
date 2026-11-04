import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

// Acciones del dueño sobre su publicación antes de elegir trabajador.
// Cada cambio de estado se condiciona al estado esperado para no pisar
// una aceptación o postulación que ocurra al mismo tiempo.
@Injectable()
export class JobManagementService {
  constructor(private readonly prisma: PrismaService) {}

  private async propia(ownerId: string, jobId: string) {
    const trabajo = await this.prisma.trabajo.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        propietarioId: true,
        estado: true,
        venceEn: true,
        servicioOrigenId: true,
      },
    });
    if (!trabajo) throw new NotFoundException('El trabajo no existe.');
    if (trabajo.propietarioId !== ownerId)
      throw new ForbiddenException(
        'No tienes permiso para gestionar esta publicación.',
      );
    if (trabajo.servicioOrigenId)
      throw new BadRequestException(
        'Las contrataciones se gestionan desde Mis trabajos y el chat.',
      );
    return trabajo;
  }

  async pausar(ownerId: string, jobId: string) {
    const trabajo = await this.propia(ownerId, jobId);
    if (trabajo.venceEn <= new Date())
      throw new BadRequestException('La publicación ya venció.');
    const { count } = await this.prisma.trabajo.updateMany({
      where: { id: jobId, propietarioId: ownerId, estado: 'PUBLICADO' },
      data: { estado: 'PAUSADO' },
    });
    if (count !== 1)
      throw new BadRequestException(
        'Solo se pueden pausar publicaciones activas.',
      );
    return { message: 'Publicación pausada.', id: jobId, status: 'PAUSADO' };
  }

  async reanudar(ownerId: string, jobId: string) {
    const trabajo = await this.propia(ownerId, jobId);
    if (trabajo.estado !== 'PAUSADO')
      throw new BadRequestException('La publicación no está pausada.');
    const { count } = await this.prisma.trabajo.updateMany({
      where: {
        id: jobId,
        propietarioId: ownerId,
        estado: 'PAUSADO',
        venceEn: { gt: new Date() },
      },
      data: { estado: 'PUBLICADO' },
    });
    if (count !== 1)
      throw new BadRequestException(
        'La publicación venció mientras estaba pausada. Publícala de nuevo.',
      );
    return {
      message: 'Publicación reanudada.',
      id: jobId,
      status: 'PUBLICADO',
    };
  }

  // Solo antes de elegir trabajador. Las postulaciones pendientes se rechazan.
  async cancelar(ownerId: string, jobId: string) {
    await this.propia(ownerId, jobId);
    const rechazadas = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.trabajo.updateMany({
        where: {
          id: jobId,
          propietarioId: ownerId,
          estado: { in: ['PUBLICADO', 'PAUSADO'] },
        },
        data: { estado: 'CANCELADO' },
      });
      if (count !== 1)
        throw new BadRequestException(
          'Solo se pueden cancelar publicaciones sin trabajador elegido.',
        );
      const postulaciones = await tx.postulacion.updateMany({
        where: { trabajoId: jobId, estado: 'PENDIENTE' },
        data: { estado: 'RECHAZADA' },
      });
      return postulaciones.count;
    });
    return {
      message: 'Publicación cancelada.',
      id: jobId,
      status: 'CANCELADO',
      rejectedApplications: rechazadas,
    };
  }

  // Borrado definitivo, solo sin postulaciones activas ni contrataciones.
  async eliminar(ownerId: string, jobId: string) {
    await this.propia(ownerId, jobId);
    const { count } = await this.prisma.trabajo.deleteMany({
      where: {
        id: jobId,
        propietarioId: ownerId,
        estado: { in: ['PUBLICADO', 'PAUSADO', 'CANCELADO'] },
        conversacion: { is: null },
        postulaciones: {
          none: { estado: { in: ['PENDIENTE', 'ACEPTADA'] } },
        },
        ofertasServicio: { none: {} },
        contrataciones: { none: {} },
      },
    });
    if (count === 1) return { message: 'Publicación eliminada.', id: jobId };

    const motivo = await this.prisma.trabajo.findUnique({
      where: { id: jobId },
      select: {
        estado: true,
        _count: {
          select: {
            postulaciones: {
              where: { estado: { in: ['PENDIENTE', 'ACEPTADA'] } },
            },
            ofertasServicio: true,
            contrataciones: true,
          },
        },
      },
    });
    if (!motivo) throw new NotFoundException('El trabajo no existe.');
    if (motivo._count.postulaciones > 0)
      throw new ConflictException(
        'Tiene postulaciones activas. Recházalas o cancela la publicación antes de eliminarla.',
      );
    if (motivo._count.ofertasServicio > 0 || motivo._count.contrataciones > 0)
      throw new ConflictException(
        'Este servicio tiene solicitudes o contrataciones y no puede eliminarse.',
      );
    throw new BadRequestException(
      'Solo se pueden eliminar publicaciones sin trabajador elegido.',
    );
  }
}
