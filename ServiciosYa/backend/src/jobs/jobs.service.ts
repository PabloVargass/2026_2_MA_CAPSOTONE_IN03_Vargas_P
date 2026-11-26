import { resolveCategory } from './category.util';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import {
  PublicationQueryDto,
  PublicationKind,
} from './dto/publication-query.dto';

// Resumen del pago simulado que se muestra en Mis trabajos.
function resumenPago(
  pago: { metodo: string; monto: number; montoTrabajador: number } | null,
) {
  return pago
    ? {
        method: pago.metodo,
        amount: pago.monto,
        workerAmount: pago.montoTrabajador,
      }
    : null;
}

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================
  // CREAR TRABAJO
  // =====================================

  async create(ownerId: string, createJobDto: CreateJobDto) {
    const trabajo = await this.prisma.$transaction(async (tx) => {
      const owner = await tx.usuario.findUnique({
        where: { id: ownerId },
        select: {
          activo: true,
          rol: true,
          identidad: { select: { estado: true } },
        },
      });
      if (!owner?.activo)
        throw new ForbiddenException('La cuenta no está activa.');
      if (owner.rol !== 'ADMIN' && owner.identidad?.estado !== 'APROBADA')
        throw new ForbiddenException(
          'Registra tu identidad y espera la aprobación de administración antes de publicar.',
        );
      const categoriaId = await resolveCategory(tx, createJobDto.category);
      return tx.trabajo.create({
        data: {
          tipo: createJobDto.kind ?? PublicationKind.OPORTUNIDAD,
          venceEn: new Date(
            Date.now() + (createJobDto.durationMinutes ?? 1440) * 60000,
          ),
          titulo: createJobDto.title.trim(),

          descripcion: createJobDto.description.trim(),

          categoria: createJobDto.category.trim(),

          comuna: createJobDto.commune.trim(),

          presupuesto: createJobDto.budget,

          fechaTrabajo: createJobDto.scheduledAt
            ? new Date(createJobDto.scheduledAt)
            : null,

          propietarioId: ownerId,
          categoriaId,
        },

        include: {
          propietario: {
            select: {
              id: true,
              nombre: true,
              correo: true,
            },
          },
        },
      });
    });

    return {
      id: trabajo.id,

      title: trabajo.titulo,

      description: trabajo.descripcion,

      category: trabajo.categoria,

      commune: trabajo.comuna,

      budget: trabajo.presupuesto,

      scheduledAt: trabajo.fechaTrabajo,

      status: trabajo.estado,

      createdAt: trabajo.creadoEn,
      kind: trabajo.tipo,
      expiresAt: trabajo.venceEn,
      expired:
        !trabajo.servicioOrigenId &&
        trabajo.estado === 'PUBLICADO' &&
        trabajo.venceEn <= new Date(),
      serviceOriginId: trabajo.servicioOrigenId,

      updatedAt: trabajo.actualizadoEn,

      ownerId: trabajo.propietarioId,

      owner: {
        id: trabajo.propietario.id,

        name: trabajo.propietario.nombre,

        email: trabajo.propietario.correo,
      },
    };
  }

  // =====================================
  // EDITAR TRABAJO
  // =====================================

  async update(ownerId: string, jobId: string, updateJobDto: UpdateJobDto) {
    const trabajo = await this.prisma.trabajo.findUnique({
      where: {
        id: jobId,
      },
    });

    if (!trabajo) {
      throw new NotFoundException('El trabajo no existe.');
    }

    if (trabajo.propietarioId !== ownerId) {
      throw new ForbiddenException(
        'No tienes permiso para editar este trabajo.',
      );
    }

    if (
      trabajo.servicioOrigenId ||
      !['PUBLICADO', 'PAUSADO'].includes(trabajo.estado)
    ) {
      throw new BadRequestException(
        'Solo se pueden editar trabajos publicados o pausados.',
      );
    }

    const venceEn =
      updateJobDto.durationMinutes === undefined
        ? undefined
        : new Date(
            trabajo.creadoEn.getTime() + updateJobDto.durationMinutes * 60000,
          );
    if (venceEn && venceEn <= new Date())
      throw new BadRequestException(
        'La duración elegida ya terminó desde la publicación original.',
      );

    let fechaTrabajo: Date | undefined;

    if (updateJobDto.scheduledAt !== undefined) {
      const parsedDate = new Date(updateJobDto.scheduledAt);

      if (Number.isNaN(parsedDate.getTime())) {
        throw new BadRequestException('La fecha del trabajo no es válida.');
      }

      fechaTrabajo = parsedDate;
    }

    const trabajoActualizado = await this.prisma.$transaction(async (tx) => {
      const categoriaId =
        updateJobDto.category === undefined
          ? undefined
          : await resolveCategory(tx, updateJobDto.category);
      return tx.trabajo.update({
        where: {
          id: jobId,
        },

        data: {
          categoriaId,
          venceEn,
          ...(updateJobDto.title !== undefined && {
            titulo: updateJobDto.title.trim(),
          }),

          ...(updateJobDto.description !== undefined && {
            descripcion: updateJobDto.description.trim(),
          }),

          ...(updateJobDto.category !== undefined && {
            categoria: updateJobDto.category.trim(),
          }),

          ...(updateJobDto.commune !== undefined && {
            comuna: updateJobDto.commune.trim(),
          }),

          ...(updateJobDto.budget !== undefined && {
            presupuesto: updateJobDto.budget,
          }),

          ...(fechaTrabajo !== undefined && {
            fechaTrabajo,
          }),
        },

        include: {
          propietario: {
            select: {
              id: true,
              nombre: true,
              correo: true,
            },
          },
        },
      });
    });

    return {
      message: 'El trabajo fue actualizado correctamente.',

      job: {
        id: trabajoActualizado.id,

        title: trabajoActualizado.titulo,

        description: trabajoActualizado.descripcion,

        category: trabajoActualizado.categoria,

        commune: trabajoActualizado.comuna,

        budget: trabajoActualizado.presupuesto,

        scheduledAt: trabajoActualizado.fechaTrabajo,

        status: trabajoActualizado.estado,

        createdAt: trabajoActualizado.creadoEn,
        kind: trabajoActualizado.tipo,
        expiresAt: trabajoActualizado.venceEn,

        updatedAt: trabajoActualizado.actualizadoEn,

        ownerId: trabajoActualizado.propietarioId,

        owner: {
          id: trabajoActualizado.propietario.id,

          name: trabajoActualizado.propietario.nombre,

          email: trabajoActualizado.propietario.correo,
        },
      },
    };
  }

  // =====================================
  // OBTENER TRABAJOS DISPONIBLES
  // =====================================

  async findAll(query: PublicationQueryDto = {}) {
    const trabajos = await this.prisma.trabajo.findMany({
      where: {
        estado: 'PUBLICADO',
        oculto: false,
        servicioOrigenId: null,
        tipo: query.kind ?? PublicationKind.OPORTUNIDAD,
        venceEn: { gt: new Date() },
        ...(query.ownerId ? { propietarioId: query.ownerId } : {}),
        propietario: { activo: true },
      },

      orderBy: {
        creadoEn: 'desc',
      },

      include: {
        propietario: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    return trabajos.map((trabajo) => ({
      id: trabajo.id,

      title: trabajo.titulo,

      description: trabajo.descripcion,

      category: trabajo.categoria,

      commune: trabajo.comuna,

      budget: trabajo.presupuesto,

      scheduledAt: trabajo.fechaTrabajo,

      status: trabajo.estado,

      createdAt: trabajo.creadoEn,
      kind: trabajo.tipo,
      expiresAt: trabajo.venceEn,
      expired:
        !trabajo.servicioOrigenId &&
        trabajo.estado === 'PUBLICADO' &&
        trabajo.venceEn <= new Date(),
      serviceOriginId: trabajo.servicioOrigenId,

      updatedAt: trabajo.actualizadoEn,

      ownerId: trabajo.propietarioId,

      owner: {
        id: trabajo.propietario.id,

        name: trabajo.propietario.nombre,
      },
    }));
  }

  async categories() {
    const categories = await this.prisma.categoria.findMany({
      where: { activo: true },
      select: { nombre: true },
      orderBy: { nombre: 'asc' },
    });
    return categories.map((category) => category.nombre);
  }

  // =====================================
  // OBTENER TRABAJO POR ID
  // =====================================

  async findOne(id: string, usuarioId?: string) {
    const trabajo = await this.prisma.trabajo.findUnique({
      where: {
        id,
      },

      include: {
        propietario: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    if (!trabajo) {
      return null;
    }
    // Ocultos, pausados, cancelados y contrataciones solo los ven el dueño y quienes postularon.
    if (
      (trabajo.oculto ||
        trabajo.servicioOrigenId ||
        ['PAUSADO', 'CANCELADO'].includes(trabajo.estado)) &&
      trabajo.propietarioId !== usuarioId
    ) {
      if (!usuarioId) return null;
      const participacion = await this.prisma.postulacion.findFirst({
        where: { trabajoId: id, usuarioId },
        select: { id: true },
      });
      if (!participacion) return null;
    }

    return {
      id: trabajo.id,

      title: trabajo.titulo,

      description: trabajo.descripcion,

      category: trabajo.categoria,

      commune: trabajo.comuna,

      budget: trabajo.presupuesto,

      scheduledAt: trabajo.fechaTrabajo,

      status: trabajo.estado,

      createdAt: trabajo.creadoEn,
      kind: trabajo.tipo,
      expiresAt: trabajo.venceEn,
      expired:
        !trabajo.servicioOrigenId &&
        trabajo.estado === 'PUBLICADO' &&
        trabajo.venceEn <= new Date(),
      serviceOriginId: trabajo.servicioOrigenId,

      updatedAt: trabajo.actualizadoEn,

      ownerId: trabajo.propietarioId,

      owner: {
        id: trabajo.propietario.id,

        name: trabajo.propietario.nombre,
      },
    };
  }

  // =====================================
  // MIS TRABAJOS
  // =====================================

  async misTrabajos(usuarioId: string) {
    const trabajosPublicados = await this.prisma.trabajo.findMany({
      where: {
        propietarioId: usuarioId,
      },

      orderBy: {
        creadoEn: 'desc',
      },

      include: {
        propietario: { select: { id: true, nombre: true } },
        pago: { select: { metodo: true, monto: true, montoTrabajador: true } },
        _count: {
          select: {
            postulaciones: {
              where: { estado: { not: 'CANCELADA' } },
            },
          },
        },

        conversacion: {
          select: {
            id: true,
            trabajador: { select: { id: true, nombre: true } },
          },
        },
      },
    });

    const postulaciones = await this.prisma.postulacion.findMany({
      where: {
        usuarioId,
      },

      orderBy: {
        creadoEn: 'desc',
      },

      include: {
        trabajo: {
          include: {
            propietario: {
              select: {
                id: true,
                nombre: true,
              },
            },

            conversacion: {
              select: {
                id: true,
                postulacionId: true,
              },
            },
            pago: {
              select: { metodo: true, monto: true, montoTrabajador: true },
            },
          },
        },
      },
    });

    // El chat del trabajo solo pertenece a la postulación que lo originó.
    const chatPropio = (postulacion: (typeof postulaciones)[number]) =>
      postulacion.trabajo.conversacion?.postulacionId === postulacion.id
        ? postulacion.trabajo.conversacion.id
        : null;

    // =====================================
    // PUBLICADOS
    // =====================================

    const publicados = trabajosPublicados.map((trabajo) => ({
      id: trabajo.id,

      title: trabajo.titulo,

      description: trabajo.descripcion,

      category: trabajo.categoria,

      commune: trabajo.comuna,

      budget: trabajo.presupuesto,

      scheduledAt: trabajo.fechaTrabajo,

      status: trabajo.estado,

      createdAt: trabajo.creadoEn,
      kind: trabajo.tipo,
      expiresAt: trabajo.venceEn,
      expired:
        !trabajo.servicioOrigenId &&
        trabajo.estado === 'PUBLICADO' &&
        trabajo.venceEn <= new Date(),
      serviceOriginId: trabajo.servicioOrigenId,

      applicantsCount: trabajo._count.postulaciones,
      startRequestedAt: trabajo.inicioSolicitadoEn,
      finishRequestedAt: trabajo.terminoSolicitadoEn,

      conversationId: trabajo.conversacion?.id ?? null,
    }));

    // =====================================
    // POSTULADOS
    // =====================================

    const postulados = postulaciones.map((postulacion) => ({
      applicationId: postulacion.id,

      applicationStatus: postulacion.estado,

      appliedAt: postulacion.creadoEn,

      job: {
        id: postulacion.trabajo.id,

        title: postulacion.trabajo.titulo,

        description: postulacion.trabajo.descripcion,

        category: postulacion.trabajo.categoria,

        commune: postulacion.trabajo.comuna,

        budget: postulacion.trabajo.presupuesto,

        scheduledAt: postulacion.trabajo.fechaTrabajo,

        status: postulacion.trabajo.estado,

        owner: {
          id: postulacion.trabajo.propietario.id,

          name: postulacion.trabajo.propietario.nombre,
        },
      },

      conversationId: chatPropio(postulacion),
    }));

    // =====================================
    // ASIGNADOS / EN PROCESO
    // =====================================

    const asignadosComoTrabajador = postulaciones
      .filter(
        (postulacion) =>
          postulacion.estado === 'ACEPTADA' &&
          (postulacion.trabajo.estado === 'ASIGNADO' ||
            postulacion.trabajo.estado === 'EN_PROCESO'),
      )
      .map((postulacion) => ({
        applicationId: postulacion.id,

        id: postulacion.trabajo.id,

        title: postulacion.trabajo.titulo,

        description: postulacion.trabajo.descripcion,

        category: postulacion.trabajo.categoria,

        commune: postulacion.trabajo.comuna,

        budget: postulacion.trabajo.presupuesto,

        scheduledAt: postulacion.trabajo.fechaTrabajo,

        status: postulacion.trabajo.estado,
        startRequestedAt: postulacion.trabajo.inicioSolicitadoEn,
        finishRequestedAt: postulacion.trabajo.terminoSolicitadoEn,

        owner: {
          id: postulacion.trabajo.propietario.id,

          name: postulacion.trabajo.propietario.nombre,
        },

        conversationId: chatPropio(postulacion),
        payment: resumenPago(postulacion.trabajo.pago),
      }));

    // =====================================
    // COMPLETADOS
    // =====================================

    const completadosComoTrabajador = postulaciones
      .filter(
        (postulacion) =>
          postulacion.estado === 'ACEPTADA' &&
          postulacion.trabajo.estado === 'COMPLETADO',
      )
      .map((postulacion) => ({
        applicationId: postulacion.id,

        id: postulacion.trabajo.id,

        title: postulacion.trabajo.titulo,

        description: postulacion.trabajo.descripcion,

        category: postulacion.trabajo.categoria,

        commune: postulacion.trabajo.comuna,

        budget: postulacion.trabajo.presupuesto,

        scheduledAt: postulacion.trabajo.fechaTrabajo,

        status: postulacion.trabajo.estado,

        owner: {
          id: postulacion.trabajo.propietario.id,

          name: postulacion.trabajo.propietario.nombre,
        },

        conversationId: chatPropio(postulacion),
        payment: resumenPago(postulacion.trabajo.pago),
      }));

    const asignadosComoCliente = trabajosPublicados
      .filter(
        (trabajo) =>
          trabajo.estado === 'ASIGNADO' || trabajo.estado === 'EN_PROCESO',
      )
      .map((trabajo) => ({
        id: trabajo.id,
        applicationId: null,
        title: trabajo.titulo,
        description: trabajo.descripcion,
        category: trabajo.categoria,
        commune: trabajo.comuna,
        budget: trabajo.presupuesto,
        scheduledAt: trabajo.fechaTrabajo,
        status: trabajo.estado,
        startRequestedAt: trabajo.inicioSolicitadoEn,
        finishRequestedAt: trabajo.terminoSolicitadoEn,
        owner: { id: trabajo.propietario.id, name: trabajo.propietario.nombre },
        participant: trabajo.conversacion
          ? {
              id: trabajo.conversacion.trabajador.id,
              name: trabajo.conversacion.trabajador.nombre,
            }
          : null,
        conversationId: trabajo.conversacion?.id ?? null,
        payment: resumenPago(trabajo.pago),
      }));
    const asignados = [...asignadosComoCliente, ...asignadosComoTrabajador];

    const completadosComoCliente = trabajosPublicados
      .filter((trabajo) => trabajo.estado === 'COMPLETADO')
      .map((trabajo) => ({
        id: trabajo.id,
        applicationId: null,
        title: trabajo.titulo,
        description: trabajo.descripcion,
        category: trabajo.categoria,
        commune: trabajo.comuna,
        budget: trabajo.presupuesto,
        scheduledAt: trabajo.fechaTrabajo,
        status: trabajo.estado,
        owner: { id: trabajo.propietario.id, name: trabajo.propietario.nombre },
        participant: trabajo.conversacion
          ? {
              id: trabajo.conversacion.trabajador.id,
              name: trabajo.conversacion.trabajador.nombre,
            }
          : null,
        conversationId: trabajo.conversacion?.id ?? null,
        payment: resumenPago(trabajo.pago),
      }));
    const completados = [
      ...completadosComoCliente,
      ...completadosComoTrabajador,
    ];

    return {
      publicados,
      postulados,
      asignados,
      completados,

      resumen: {
        publicados: publicados.length,

        postulados: postulados.length,

        asignados: asignados.length,

        completados: completados.length,
      },
    };
  }

  // =====================================
  // INICIAR Y COMPLETAR CON DOBLE CONFIRMACIÓN
  // El trabajador avisa (llegada o término) y el cliente dueño confirma.
  // Recién con la confirmación cambia el estado del trabajo.
  // =====================================

  async iniciarTrabajo(usuarioId: string, trabajoId: string) {
    return this.avanzarConConfirmacion(usuarioId, trabajoId, 'inicio');
  }

  async completarTrabajo(usuarioId: string, trabajoId: string) {
    return this.avanzarConConfirmacion(usuarioId, trabajoId, 'termino');
  }

  private async avanzarConConfirmacion(
    usuarioId: string,
    trabajoId: string,
    paso: 'inicio' | 'termino',
  ) {
    const esInicio = paso === 'inicio';
    const estadoRequerido = esInicio ? 'ASIGNADO' : 'EN_PROCESO';
    const estadoSiguiente = esInicio ? 'EN_PROCESO' : 'COMPLETADO';
    const campo = esInicio ? 'inicioSolicitadoEn' : 'terminoSolicitadoEn';
    const accion = esInicio ? 'iniciar' : 'completar';

    const trabajo = await this.prisma.trabajo.findUnique({
      where: { id: trabajoId },
      include: { conversacion: true },
    });

    if (!trabajo) {
      throw new NotFoundException('El trabajo no existe.');
    }
    if (!trabajo.conversacion) {
      throw new BadRequestException(
        'Este trabajo todavía no tiene un trabajador asignado.',
      );
    }

    const esPropietario = trabajo.propietarioId === usuarioId;
    const esTrabajador = trabajo.conversacion.trabajadorId === usuarioId;
    if (!esPropietario && !esTrabajador) {
      throw new ForbiddenException(
        `No tienes permiso para ${accion} este trabajo.`,
      );
    }
    if (trabajo.estado !== estadoRequerido) {
      throw new BadRequestException(
        esInicio
          ? 'Solo se pueden iniciar trabajos que estén asignados.'
          : 'Solo se pueden completar trabajos que estén en proceso.',
      );
    }

    const solicitado = trabajo[campo];

    if (esTrabajador) {
      if (solicitado) {
        throw new BadRequestException(
          esInicio
            ? 'Ya avisaste tu llegada. Falta que el cliente la confirme.'
            : 'Ya avisaste el término. Falta que el cliente lo confirme.',
        );
      }
      // La condición en el where evita dos avisos simultáneos.
      const { count } = await this.prisma.trabajo.updateMany({
        where: { id: trabajoId, estado: estadoRequerido, [campo]: null },
        data: { [campo]: new Date() },
      });
      if (count === 0) {
        throw new BadRequestException(
          'El trabajo cambió mientras se procesaba. Actualiza e inténtalo de nuevo.',
        );
      }
      return {
        message: esInicio
          ? 'Avisaste tu llegada. El trabajo iniciará cuando el cliente lo confirme.'
          : 'Avisaste el término. El trabajo se completará cuando el cliente lo confirme.',
        trabajo: {
          id: trabajo.id,
          title: trabajo.titulo,
          status: estadoRequerido,
          awaitingConfirmation: true,
        },
      };
    }

    // Cliente dueño: solo confirma lo que el trabajador ya avisó.
    // El término se confirma pagando (POST /pagos/trabajos/:id).
    if (!esInicio && solicitado) {
      throw new BadRequestException(
        'Para confirmar el término, paga el servicio desde la app.',
      );
    }
    if (!solicitado) {
      throw new BadRequestException(
        esInicio
          ? 'El trabajador todavía no avisa su llegada.'
          : 'El trabajador todavía no avisa el término del trabajo.',
      );
    }
    const { count } = await this.prisma.trabajo.updateMany({
      where: { id: trabajoId, estado: estadoRequerido, [campo]: { not: null } },
      data: { estado: estadoSiguiente },
    });
    if (count === 0) {
      throw new BadRequestException(
        'El trabajo cambió mientras se procesaba. Actualiza e inténtalo de nuevo.',
      );
    }
    return {
      message: esInicio
        ? 'Confirmaste la llegada. El trabajo está en proceso.'
        : 'Confirmaste el término. El trabajo fue completado.',
      trabajo: {
        id: trabajo.id,
        title: trabajo.titulo,
        status: estadoSiguiente,
        awaitingConfirmation: false,
      },
    };
  }
}
