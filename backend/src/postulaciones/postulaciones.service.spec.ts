import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostulacionesService } from './postulaciones.service';

describe('PostulacionesService', () => {
  let service: PostulacionesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostulacionesService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<PostulacionesService>(PostulacionesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('no permite rechazar una contratación con el endpoint de postulaciones', async () => {
    const update = jest.fn();
    const prisma = {
      postulacion: {
        findUnique: jest.fn().mockResolvedValue({
          estado: 'PENDIENTE',
          trabajo: { propietarioId: 'cliente', servicioOrigenId: 'servicio' },
        }),
        update,
      },
    };
    const offers = new PostulacionesService(prisma as unknown as PrismaService);
    await expect(
      offers.rechazar('cliente', 'postulacion'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  describe('retirar', () => {
    const crear = (postulacion: unknown, count = 1) => {
      const updateMany = jest.fn().mockResolvedValue({ count });
      const prisma = {
        postulacion: {
          findUnique: jest.fn().mockResolvedValue(postulacion),
          updateMany,
        },
      };
      return {
        updateMany,
        service: new PostulacionesService(prisma as unknown as PrismaService),
      };
    };
    const pendiente = {
      id: 'postulacion',
      usuarioId: 'trabajador',
      estado: 'PENDIENTE',
      trabajo: { servicioOrigenId: null },
    };

    it('el trabajador retira su postulación pendiente', async () => {
      const { service, updateMany } = crear(pendiente);
      await expect(
        service.retirar('trabajador', 'postulacion'),
      ).resolves.toMatchObject({
        postulacion: { id: 'postulacion', estado: 'CANCELADA' },
      });
      expect(updateMany).toHaveBeenCalledWith({
        where: {
          id: 'postulacion',
          usuarioId: 'trabajador',
          estado: 'PENDIENTE',
        },
        data: { estado: 'CANCELADA' },
      });
    });

    it('otro usuario no puede retirarla', async () => {
      const { service, updateMany } = crear(pendiente);
      await expect(
        service.retirar('otro', 'postulacion'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(updateMany).not.toHaveBeenCalled();
    });

    it('una postulación inexistente devuelve 404', async () => {
      const { service } = crear(null);
      await expect(
        service.retirar('trabajador', 'postulacion'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('una contratación de servicio se gestiona desde el chat', async () => {
      const { service, updateMany } = crear({
        ...pendiente,
        trabajo: { servicioOrigenId: 'servicio' },
      });
      await expect(
        service.retirar('trabajador', 'postulacion'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(updateMany).not.toHaveBeenCalled();
    });

    it('si ya no está pendiente (aceptada, rechazada o en paralelo) se rechaza', async () => {
      const { service } = crear({ ...pendiente, estado: 'ACEPTADA' }, 0);
      await expect(
        service.retirar('trabajador', 'postulacion'),
      ).rejects.toThrow('Solo puedes retirar una postulación pendiente.');
    });
  });

  it('aceptar no procesa una postulación retirada en paralelo', async () => {
    const tx = {
      postulacion: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      trabajo: { update: jest.fn() },
      conversacion: { create: jest.fn() },
    };
    const prisma = {
      postulacion: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'postulacion',
          estado: 'PENDIENTE',
          trabajoId: 'trabajo',
          usuarioId: 'trabajador',
          usuario: { id: 'trabajador', nombre: 'Trabajador' },
          trabajo: {
            propietarioId: 'cliente',
            oculto: false,
            estado: 'PUBLICADO',
            servicioOrigenId: null,
            venceEn: new Date(Date.now() + 60_000),
          },
        }),
      },
      $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
    };
    const service = new PostulacionesService(
      prisma as unknown as PrismaService,
    );
    await expect(
      service.aceptar('cliente', 'postulacion'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.trabajo.update).not.toHaveBeenCalled();
    expect(tx.conversacion.create).not.toHaveBeenCalled();
  });
});
