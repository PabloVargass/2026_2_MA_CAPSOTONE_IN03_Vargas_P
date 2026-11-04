import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  JobEvidenceService,
  MAX_EVIDENCE_PHOTOS,
} from './job-evidence.service';

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]);
const archivo = (buffer = png, mimetype = 'image/png') => ({
  buffer,
  mimetype,
  size: buffer.length,
});

const crear = (
  estado = 'EN_PROCESO',
  total = 0,
  usuario: { rol: string; activo: boolean } = { rol: 'USUARIO', activo: true },
) => {
  const tx = {
    evidenciaTrabajo: {
      count: jest.fn().mockResolvedValue(total),
      create: jest.fn().mockResolvedValue({ id: 'e1', creadoEn: new Date() }),
    },
  };
  const prisma = {
    trabajo: {
      findUnique: jest.fn().mockResolvedValue({
        estado,
        propietarioId: 'cliente',
        conversacion: { trabajadorId: 'trabajador' },
      }),
    },
    usuario: { findUnique: jest.fn().mockResolvedValue(usuario) },
    evidenciaTrabajo: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  return {
    prisma,
    tx,
    service: new JobEvidenceService(prisma as unknown as PrismaService),
  };
};

describe('Evidencias del trabajo', () => {
  it('cliente y trabajador suben fotos en proceso o completado', async () => {
    for (const usuario of ['cliente', 'trabajador'])
      for (const estado of ['EN_PROCESO', 'COMPLETADO']) {
        const { service, tx } = crear(estado);
        await service.subir(usuario, 'trabajo', archivo());
        expect(tx.evidenciaTrabajo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              autorId: usuario,
              tipo: 'image/png',
            }) as object,
          }),
        );
      }
  });

  it('un tercero no ve ni sube evidencias', async () => {
    const { service, tx } = crear();
    await expect(service.listar('tercero', 'trabajo')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      service.subir('tercero', 'trabajo', archivo()),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.evidenciaTrabajo.create).not.toHaveBeenCalled();
  });

  it('un administrador activo puede verlas pero no subir', async () => {
    const { service } = crear('EN_PROCESO', 0, { rol: 'ADMIN', activo: true });
    await expect(service.listar('admin', 'trabajo')).resolves.toMatchObject({
      canUpload: false,
    });
    await expect(
      service.subir('admin', 'trabajo', archivo()),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      crear('EN_PROCESO', 0, { rol: 'ADMIN', activo: false }).service.listar(
        'admin',
        'trabajo',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('antes de iniciar el trabajo no se suben fotos', async () => {
    await expect(
      crear('ASIGNADO').service.subir('cliente', 'trabajo', archivo()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza archivos que no son JPG o PNG reales', async () => {
    const { service } = crear();
    await expect(
      service.subir(
        'cliente',
        'trabajo',
        archivo(Buffer.from('no es imagen'), 'image/png'),
      ),
    ).rejects.toThrow('La evidencia debe ser una foto JPG o PNG válida.');
    await expect(
      service.subir('cliente', 'trabajo', archivo(png, 'image/jpeg')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it(`no supera ${MAX_EVIDENCE_PHOTOS} fotos y cuenta dentro de una transacción serializable`, async () => {
    const { service, prisma } = crear('EN_PROCESO', MAX_EVIDENCE_PHOTOS);
    await expect(
      service.subir('cliente', 'trabajo', archivo()),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });

  it('solo el autor quita su foto y solo en proceso', async () => {
    const { service, prisma } = crear();
    await service.eliminar('trabajador', 'trabajo', 'e1');
    expect(prisma.evidenciaTrabajo.deleteMany).toHaveBeenCalledWith({
      where: { id: 'e1', trabajoId: 'trabajo', autorId: 'trabajador' },
    });
    await expect(
      crear('COMPLETADO').service.eliminar('trabajador', 'trabajo', 'e1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
