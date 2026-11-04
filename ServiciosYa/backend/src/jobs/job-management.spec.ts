import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobManagementService } from './job-management.service';

const futuro = () => new Date(Date.now() + 3600000);
const crear = (
  trabajo: Record<string, unknown> | null,
  counts: { update?: number; delete?: number } = {},
) => {
  const tx = {
    trabajo: {
      updateMany: jest.fn().mockResolvedValue({ count: counts.update ?? 1 }),
    },
    postulacion: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
  };
  const prisma = {
    trabajo: {
      findUnique: jest.fn().mockResolvedValue(trabajo),
      updateMany: jest.fn().mockResolvedValue({ count: counts.update ?? 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: counts.delete ?? 1 }),
    },
    $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
  };
  return {
    prisma,
    tx,
    service: new JobManagementService(prisma as unknown as PrismaService),
  };
};
const propia = {
  id: 'trabajo',
  propietarioId: 'cliente',
  estado: 'PUBLICADO',
  venceEn: futuro(),
  servicioOrigenId: null,
};

describe('Gestión de publicaciones por el dueño', () => {
  it('solo el dueño gestiona su publicación', async () => {
    const { service, prisma } = crear(propia);
    for (const accion of [
      'pausar',
      'reanudar',
      'cancelar',
      'eliminar',
    ] as const)
      await expect(service[accion]('otro', 'trabajo')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    expect(prisma.trabajo.updateMany).not.toHaveBeenCalled();
    expect(prisma.trabajo.deleteMany).not.toHaveBeenCalled();
  });

  it('publicación inexistente devuelve 404', async () => {
    const { service } = crear(null);
    await expect(service.pausar('cliente', 'x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('las contrataciones derivadas no se gestionan aquí', async () => {
    const { service } = crear({ ...propia, servicioOrigenId: 'servicio' });
    await expect(service.cancelar('cliente', 'trabajo')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('pausar condiciona el cambio a PUBLICADO', async () => {
    const { service, prisma } = crear(propia);
    await expect(service.pausar('cliente', 'trabajo')).resolves.toMatchObject({
      status: 'PAUSADO',
    });
    expect(prisma.trabajo.updateMany).toHaveBeenCalledWith({
      where: { id: 'trabajo', propietarioId: 'cliente', estado: 'PUBLICADO' },
      data: { estado: 'PAUSADO' },
    });
  });

  it('no pausa una publicación vencida ni una ya asignada', async () => {
    await expect(
      crear({ ...propia, venceEn: new Date(0) }).service.pausar(
        'cliente',
        'trabajo',
      ),
    ).rejects.toThrow('La publicación ya venció.');
    await expect(
      crear(propia, { update: 0 }).service.pausar('cliente', 'trabajo'),
    ).rejects.toThrow('Solo se pueden pausar publicaciones activas.');
  });

  it('reanudar exige estar pausada y sin vencer', async () => {
    await expect(
      crear(propia).service.reanudar('cliente', 'trabajo'),
    ).rejects.toThrow('La publicación no está pausada.');
    const { service, prisma } = crear({ ...propia, estado: 'PAUSADO' });
    await service.reanudar('cliente', 'trabajo');
    const [[{ where }]] = prisma.trabajo.updateMany.mock.calls as [
      [{ where: Record<string, unknown> }],
    ];
    expect(where).toMatchObject({ estado: 'PAUSADO' });
    expect(where.venceEn).toEqual({ gt: expect.any(Date) as Date });
    await expect(
      crear({ ...propia, estado: 'PAUSADO' }, { update: 0 }).service.reanudar(
        'cliente',
        'trabajo',
      ),
    ).rejects.toThrow(/venció mientras estaba pausada/);
  });

  it('cancelar solo sin trabajador elegido y rechaza pendientes en la misma transacción', async () => {
    const { service, tx } = crear(propia);
    await expect(service.cancelar('cliente', 'trabajo')).resolves.toMatchObject(
      { status: 'CANCELADO', rejectedApplications: 2 },
    );
    expect(tx.trabajo.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'trabajo',
        propietarioId: 'cliente',
        estado: { in: ['PUBLICADO', 'PAUSADO'] },
      },
      data: { estado: 'CANCELADO' },
    });
    expect(tx.postulacion.updateMany).toHaveBeenCalledWith({
      where: { trabajoId: 'trabajo', estado: 'PENDIENTE' },
      data: { estado: 'RECHAZADA' },
    });
    const asignada = crear({ ...propia, estado: 'ASIGNADO' }, { update: 0 });
    await expect(
      asignada.service.cancelar('cliente', 'trabajo'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(asignada.tx.postulacion.updateMany).not.toHaveBeenCalled();
  });

  it('eliminar borra en una sola condición sin postulaciones activas', async () => {
    const { service, prisma } = crear(propia);
    await expect(service.eliminar('cliente', 'trabajo')).resolves.toMatchObject(
      { message: 'Publicación eliminada.' },
    );
    expect(prisma.trabajo.deleteMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'trabajo',
        propietarioId: 'cliente',
        conversacion: { is: null },
        postulaciones: {
          none: { estado: { in: ['PENDIENTE', 'ACEPTADA'] } },
        },
      }) as object,
    });
  });

  it('eliminar explica por qué no pudo borrar', async () => {
    const motivo = (counts: object, estado = 'PUBLICADO') => {
      const c = crear(propia, { delete: 0 });
      c.prisma.trabajo.findUnique
        .mockResolvedValueOnce(propia)
        .mockResolvedValueOnce({
          estado,
          _count: {
            postulaciones: 0,
            ofertasServicio: 0,
            contrataciones: 0,
            ...counts,
          },
        });
      return c.service.eliminar('cliente', 'trabajo');
    };
    await expect(motivo({ postulaciones: 1 })).rejects.toThrow(
      /postulaciones activas/,
    );
    await expect(motivo({ ofertasServicio: 1 })).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(motivo({}, 'EN_PROCESO')).rejects.toThrow(
      /sin trabajador elegido/,
    );
  });
});
