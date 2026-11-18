import { ConflictException, NotFoundException } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { PrismaService } from '../prisma/prisma.service';

type Identidad = { estado: string; fotoTipo?: string | null } | null;

function setup(identidad: Identidad) {
  const upsert = jest.fn((args: { create: Record<string, unknown> }) =>
    Promise.resolve({
      id: 'solicitud',
      estado: 'PENDIENTE',
      creadoEn: new Date(),
      revisadoEn: null,
      motivoRevision: null,
      certificadoTipo: args.create.certificadoTipo ?? null,
      fotoTipo: args.create.fotoTipo ?? null,
      mensaje: args.create.mensaje ?? null,
    }),
  );
  const tx = {
    usuario: {
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ rut: '11111111-1', identidad }),
    },
    solicitudIdentidad: { upsert },
  };
  const prisma = {
    $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    solicitudIdentidad: {
      findFirst: jest.fn().mockResolvedValue({
        foto: null,
        fotoTipo: null,
        certificado: null,
        certificadoTipo: null,
      }),
    },
  };
  return {
    upsert,
    service: new IdentityService(prisma as unknown as PrismaService),
  };
}

describe('Solicitud de identidad sin documentos', () => {
  it('crea una solicitud pendiente sin documentos y con el mensaje', async () => {
    const { service, upsert } = setup(null);
    const result = await service.requestWithoutDocuments(
      'user',
      'Quiero ofrecer servicios de armado de muebles.',
    );
    expect(upsert.mock.calls[0][0]).toMatchObject({
      create: {
        usuarioId: 'user',
        estado: 'PENDIENTE',
        foto: null,
        certificado: null,
        mensaje: 'Quiero ofrecer servicios de armado de muebles.',
      },
    });
    expect(result).toMatchObject({
      estado: 'PENDIENTE',
      conDocumentos: false,
    });
  });

  it('el mensaje es opcional', async () => {
    const { service, upsert } = setup(null);
    await service.requestWithoutDocuments('user');
    expect(upsert.mock.calls[0][0]).toMatchObject({
      create: { mensaje: null },
    });
  });

  it('permite volver a enviarla después de un rechazo', async () => {
    const { service, upsert } = setup({ estado: 'RECHAZADA' });
    await service.requestWithoutDocuments('user');
    expect(upsert).toHaveBeenCalled();
  });

  it.each(['PENDIENTE', 'APROBADA'])(
    'no duplica una solicitud %s',
    async (estado) => {
      const { service, upsert } = setup({ estado, fotoTipo: null });
      await expect(service.requestWithoutDocuments('user')).rejects.toThrow(
        ConflictException,
      );
      expect(upsert).not.toHaveBeenCalled();
    },
  );

  it('al pedir un documento de una solicitud sin documentos responde 404', async () => {
    const { service } = setup(null);
    await expect(service.document('solicitud', 'foto')).rejects.toThrow(
      new NotFoundException('La solicitud no incluye documentos.'),
    );
    await expect(service.document('solicitud', 'certificado')).rejects.toThrow(
      NotFoundException,
    );
  });
});
