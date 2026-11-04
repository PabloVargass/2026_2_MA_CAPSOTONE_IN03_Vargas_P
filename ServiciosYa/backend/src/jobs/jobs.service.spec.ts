import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from './jobs.service';

describe('JobsService', () => {
  let service: JobsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobsService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  it('el detalle público no consulta ni devuelve el correo del propietario', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'trabajo',
      propietarioId: 'dueño',
      estado: 'PUBLICADO',
      venceEn: new Date(Date.now() + 60000),
      propietario: {
        id: 'dueño',
        nombre: 'Dueño',
        correo: 'privado@example.invalid',
      },
    });
    const jobs = new JobsService({
      trabajo: { findUnique },
    } as unknown as PrismaService);
    const result = await jobs.findOne('trabajo');
    expect(result?.owner).toEqual({ id: 'dueño', name: 'Dueño' });
    const calls = findUnique.mock.calls as unknown as unknown[][];
    const query = calls[0][0] as {
      include: { propietario: { select: object } };
    };
    expect(query.include.propietario.select).toEqual({
      id: true,
      nombre: true,
    });
  });
  it('publica únicamente nombres de categorías activas sin datos administrativos', async () => {
    const findMany = jest.fn().mockResolvedValue([{ nombre: 'Limpieza' }]);
    const jobs = new JobsService({
      categoria: { findMany },
    } as unknown as PrismaService);
    expect(await jobs.categories()).toEqual(['Limpieza']);
    expect(findMany).toHaveBeenCalledWith({
      where: { activo: true },
      select: { nombre: true },
      orderBy: { nombre: 'asc' },
    });
  });
  it('impide publicar sin identidad aprobada aunque el cliente envíe una petición directa', async () => {
    const create = jest.fn();
    const tx = {
      usuario: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ activo: true, rol: 'USUARIO', identidad: null }),
      },
      trabajo: { create },
    };
    const prisma = {
      $transaction: (callback: (value: typeof tx) => unknown) => callback(tx),
    };
    const jobs = new JobsService(prisma as unknown as PrismaService);
    await expect(
      jobs.create('user', {
        title: 'Prueba',
        description: 'Prueba ficticia',
        category: 'Limpieza',
        commune: 'Santiago',
        budget: 10000,
      }),
    ).rejects.toThrow('Registra tu identidad');
    expect(create).not.toHaveBeenCalled();
  });

  it('el trabajador solo ve el chat de su propia postulación', async () => {
    const trabajo = (id: string, postulacionId: string | null) => ({
      id,
      estado: 'ASIGNADO',
      titulo: id,
      descripcion: 'Servicio ficticio',
      categoria: 'Limpieza',
      comuna: 'Santiago',
      presupuesto: 20000,
      fechaTrabajo: null,
      propietario: { id: 'cliente', nombre: 'Cliente' },
      conversacion: postulacionId ? { id: `chat-${id}`, postulacionId } : null,
    });
    const prisma = {
      trabajo: { findMany: jest.fn().mockResolvedValue([]) },
      postulacion: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'mia',
            estado: 'ACEPTADA',
            creadoEn: new Date(),
            trabajo: trabajo('elegido', 'mia'),
          },
          {
            id: 'retirada',
            estado: 'CANCELADA',
            creadoEn: new Date(),
            trabajo: trabajo('de-otro', 'postulacion-de-otro'),
          },
          {
            id: 'pendiente',
            estado: 'PENDIENTE',
            creadoEn: new Date(),
            trabajo: trabajo('sin-chat', null),
          },
        ]),
      },
    };
    const jobs = new JobsService(prisma as unknown as PrismaService);
    const result = await jobs.misTrabajos('trabajador');
    expect(
      result.postulados.map((p) => [p.applicationId, p.conversationId]),
    ).toEqual([
      ['mia', 'chat-elegido'],
      ['retirada', null],
      ['pendiente', null],
    ]);
    expect(result.asignados[0]).toMatchObject({
      id: 'elegido',
      conversationId: 'chat-elegido',
    });
  });

  it('incluye completados del cliente y del trabajador, sin postulaciones rechazadas', async () => {
    const job = (id: string, estado: string) => ({
      id,
      estado,
      titulo: id,
      descripcion: 'Servicio ficticio',
      categoria: 'Limpieza',
      comuna: 'Santiago',
      presupuesto: 20000,
      fechaTrabajo: null,
      creadoEn: new Date(),
      propietario: { id: 'cliente', nombre: 'Cliente' },
      conversacion: {
        id: `chat-${id}`,
        trabajador: { id: 'trabajador', nombre: 'Trabajador' },
      },
      _count: { postulaciones: 1 },
    });
    const prisma = {
      trabajo: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            job('propio', 'COMPLETADO'),
            job('activo', 'PUBLICADO'),
          ]),
      },
      postulacion: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'aceptada',
            estado: 'ACEPTADA',
            trabajo: job('ajeno', 'COMPLETADO'),
          },
          {
            id: 'rechazada',
            estado: 'RECHAZADA',
            trabajo: job('sin-participar', 'COMPLETADO'),
          },
        ]),
      },
    };
    const jobs = new JobsService(prisma as unknown as PrismaService);
    const result = await jobs.misTrabajos('cliente');
    expect(result.completados.map((item) => item.id)).toEqual([
      'propio',
      'ajeno',
    ]);
    expect(result.resumen.completados).toBe(2);
    expect(result.completados[0]).toMatchObject({
      participant: { name: 'Trabajador' },
      conversationId: 'chat-propio',
    });
    expect(prisma.trabajo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { propietarioId: 'cliente' } }),
    );
    expect(prisma.postulacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuarioId: 'cliente' } }),
    );
  });
});
