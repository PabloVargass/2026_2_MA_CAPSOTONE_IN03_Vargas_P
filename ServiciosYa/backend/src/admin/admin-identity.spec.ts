import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../auth/mail.service';

describe('Revisión de identidad desde administración', () => {
  let service: AdminService;
  const mail = { enviarResultadoIdentidad: jest.fn() };
  const tx = {
    $executeRaw: jest.fn(),
    usuario: { findUnique: jest.fn() },
    solicitudIdentidad: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
    auditoriaAdministrativa: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(),
    solicitudIdentidad: { findMany: jest.fn() },
    usuario: { findMany: jest.fn(), count: jest.fn() },
  };
  const reviewed = {
    id: 'solicitud',
    estado: 'APROBADA',
    revisadoEn: new Date(),
    motivoRevision: 'Documentos legibles y vigentes',
    usuario: { nombre: 'Ana', correo: 'ana@example.test' },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (client: typeof tx) => Promise<unknown>)(tx)
        : Promise.all(arg as Promise<unknown>[]),
    );
    tx.usuario.findUnique.mockResolvedValue({ rol: 'ADMIN', activo: true });
    tx.solicitudIdentidad.findUniqueOrThrow.mockResolvedValue({
      estado: 'PENDIENTE',
    });
    tx.solicitudIdentidad.update.mockResolvedValue(reviewed);
    const module = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
      ],
    }).compile();
    service = module.get(AdminService);
  });

  it('aprueba, registra auditoría y avisa al usuario por correo', async () => {
    const result = await service.reviewIdentity('admin', 'solicitud', {
      aprobada: true,
      motivo: 'Documentos legibles y vigentes',
    });
    expect(tx.solicitudIdentidad.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'solicitud' },
        data: expect.objectContaining({
          estado: 'APROBADA',
          revisadoPorId: 'admin',
        }) as object,
      }),
    );
    expect(tx.auditoriaAdministrativa.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accion: 'APROBAR_IDENTIDAD',
        }) as object,
      }),
    );
    expect(mail.enviarResultadoIdentidad).toHaveBeenCalledWith(
      'ana@example.test',
      'Ana',
      true,
      'Documentos legibles y vigentes',
    );
    expect(result).not.toHaveProperty('usuario');
  });

  it('rechaza con motivo y envía el aviso de rechazo', async () => {
    tx.solicitudIdentidad.update.mockResolvedValue({
      ...reviewed,
      estado: 'RECHAZADA',
    });
    await service.reviewIdentity('admin', 'solicitud', {
      aprobada: false,
      motivo: 'La cédula no se lee',
    });
    expect(tx.solicitudIdentidad.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ estado: 'RECHAZADA' }) as object,
      }),
    );
    expect(mail.enviarResultadoIdentidad).toHaveBeenCalledWith(
      'ana@example.test',
      'Ana',
      false,
      'La cédula no se lee',
    );
  });

  it('conserva la revisión aunque el correo falle', async () => {
    mail.enviarResultadoIdentidad.mockRejectedValue(new Error('SMTP caído'));
    await expect(
      service.reviewIdentity('admin', 'solicitud', {
        aprobada: true,
        motivo: 'Documentos legibles y vigentes',
      }),
    ).resolves.toMatchObject({ estado: 'APROBADA' });
    expect(tx.auditoriaAdministrativa.create).toHaveBeenCalled();
  });

  it('no revisa dos veces una solicitud ni envía correo', async () => {
    tx.solicitudIdentidad.findUniqueOrThrow.mockResolvedValue({
      estado: 'APROBADA',
    });
    await expect(
      service.reviewIdentity('admin', 'solicitud', {
        aprobada: false,
        motivo: 'Intento de revocación',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mail.enviarResultadoIdentidad).not.toHaveBeenCalled();
  });

  it('filtra solicitudes por estado y rechaza estados desconocidos', async () => {
    prisma.solicitudIdentidad.findMany.mockResolvedValue([]);
    await service.identities(1, 'PENDIENTE');
    expect(prisma.solicitudIdentidad.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { estado: 'PENDIENTE' } }),
    );
    expect(() => service.identities(1, 'OTRO')).toThrow(BadRequestException);
  });

  it('filtra usuarios por estado de identidad e incluye ese estado', async () => {
    prisma.usuario.findMany.mockResolvedValue([]);
    prisma.usuario.count.mockResolvedValue(0);
    await service.users('', '', '', 1, 'SIN_SOLICITUD');
    expect(prisma.usuario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { identidad: { is: null } },
        select: expect.objectContaining({
          identidad: { select: { estado: true } },
        }) as object,
      }),
    );
    await service.users('', '', '', 1, 'APROBADA');
    expect(prisma.usuario.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { identidad: { is: { estado: 'APROBADA' } } },
      }),
    );
    await expect(service.users('', '', '', 1, 'OTRO')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
