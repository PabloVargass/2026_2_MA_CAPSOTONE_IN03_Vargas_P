import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calcularMontos, PagosService } from './pagos.service';

// Pago simulado al confirmar el término: el cliente paga con saldo o por
// transferencia y el trabajador recibe el monto menos la comisión del 5 %.
describe('Pagos simulados', () => {
  const trabajoBase = {
    id: 'trabajo',
    titulo: 'Corte de pelo a domicilio',
    propietarioId: 'cliente',
    presupuesto: 20000,
    estado: 'EN_PROCESO',
    terminoSolicitadoEn: new Date(),
    conversacion: { trabajadorId: 'peluqueria' },
    pago: null as object | null,
  };

  function servicio(
    trabajo: object | null,
    opts: { saldoOk?: boolean; estadoOk?: boolean } = {},
  ) {
    const usuarioUpdateMany = jest
      .fn()
      .mockResolvedValue({ count: opts.saldoOk === false ? 0 : 1 });
    const trabajoUpdateMany = jest
      .fn()
      .mockResolvedValue({ count: opts.estadoOk === false ? 0 : 1 });
    const usuarioUpdate = jest.fn().mockResolvedValue({});
    const pagoCreate = jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: 'pago', creadoEn: new Date(), ...data }),
      );
    const tx = {
      trabajo: {
        findUnique: jest.fn().mockResolvedValue(trabajo),
        updateMany: trabajoUpdateMany,
      },
      usuario: {
        updateMany: usuarioUpdateMany,
        update: usuarioUpdate,
        findUnique: jest.fn().mockResolvedValue({ saldo: 80000 }),
      },
      pago: { create: pagoCreate },
    };
    const prisma = {
      $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
    } as unknown as PrismaService;
    return {
      pagos: new PagosService(prisma),
      usuarioUpdateMany,
      trabajoUpdateMany,
      usuarioUpdate,
      pagoCreate,
    };
  }

  it('calcula la comisión del 5 % y lo que recibe el trabajador', () => {
    expect(calcularMontos(20000)).toEqual({
      comision: 1000,
      montoTrabajador: 19000,
    });
    expect(calcularMontos(25990)).toEqual({
      comision: 1300,
      montoTrabajador: 24690,
    });
  });

  it('con saldo: descuenta al cliente, abona el 95 % al trabajador y completa', async () => {
    const s = servicio({ ...trabajoBase });
    const r = await s.pagos.pagarYCompletar('cliente', 'trabajo', 'SALDO');
    expect(s.usuarioUpdateMany).toHaveBeenCalledWith({
      where: { id: 'cliente', saldo: { gte: 20000 } },
      data: { saldo: { decrement: 20000 } },
    });
    expect(s.usuarioUpdate).toHaveBeenCalledWith({
      where: { id: 'peluqueria' },
      data: { saldo: { increment: 19000 } },
    });
    expect(r.trabajo.status).toBe('COMPLETADO');
    expect(r.pago).toMatchObject({
      method: 'SALDO',
      amount: 20000,
      commission: 1000,
      workerAmount: 19000,
    });
  });

  it('por transferencia: no toca el saldo del cliente y abona al trabajador', async () => {
    const s = servicio({ ...trabajoBase });
    const r = await s.pagos.pagarYCompletar(
      'cliente',
      'trabajo',
      'TRANSFERENCIA',
    );
    expect(s.usuarioUpdateMany).not.toHaveBeenCalled();
    expect(s.usuarioUpdate).toHaveBeenCalledWith({
      where: { id: 'peluqueria' },
      data: { saldo: { increment: 19000 } },
    });
    expect(r.pago.method).toBe('TRANSFERENCIA');
  });

  it('rechaza el pago con saldo insuficiente sin completar el trabajo', async () => {
    const s = servicio({ ...trabajoBase }, { saldoOk: false });
    await expect(
      s.pagos.pagarYCompletar('cliente', 'trabajo', 'SALDO'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(s.trabajoUpdateMany).not.toHaveBeenCalled();
    expect(s.pagoCreate).not.toHaveBeenCalled();
  });

  it('solo el cliente dueño puede pagar', async () => {
    const s = servicio({ ...trabajoBase });
    await expect(
      s.pagos.pagarYCompletar('peluqueria', 'trabajo', 'SALDO'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      s.pagos.pagarYCompletar('tercero', 'trabajo', 'TRANSFERENCIA'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('no se paga dos veces el mismo trabajo', async () => {
    const s = servicio({ ...trabajoBase, pago: { id: 'pago' } });
    await expect(
      s.pagos.pagarYCompletar('cliente', 'trabajo', 'SALDO'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('no se paga si el trabajador no avisó el término', async () => {
    const s = servicio({ ...trabajoBase, terminoSolicitadoEn: null });
    await expect(
      s.pagos.pagarYCompletar('cliente', 'trabajo', 'SALDO'),
    ).rejects.toBeInstanceOf(BadRequestException);
    const s2 = servicio({ ...trabajoBase, estado: 'ASIGNADO' });
    await expect(
      s2.pagos.pagarYCompletar('cliente', 'trabajo', 'SALDO'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('si el trabajo cambió mientras se pagaba, no registra el pago', async () => {
    const s = servicio({ ...trabajoBase }, { estadoOk: false });
    await expect(
      s.pagos.pagarYCompletar('cliente', 'trabajo', 'TRANSFERENCIA'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(s.pagoCreate).not.toHaveBeenCalled();
  });
});
