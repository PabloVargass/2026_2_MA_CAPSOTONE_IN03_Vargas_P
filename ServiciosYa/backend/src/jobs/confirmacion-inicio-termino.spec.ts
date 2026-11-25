import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from './jobs.service';

// Iniciar y completar requieren dos pasos: el trabajador avisa y el cliente confirma.
describe('Doble confirmación de inicio y término', () => {
  const base = {
    id: 'trabajo',
    titulo: 'Armado de mueble',
    propietarioId: 'cliente',
    conversacion: { trabajadorId: 'trabajador' },
    inicioSolicitadoEn: null as Date | null,
    terminoSolicitadoEn: null as Date | null,
  };

  function servicio(trabajo: object | null, count = 1) {
    const findUnique = jest.fn().mockResolvedValue(trabajo);
    const updateMany = jest.fn().mockResolvedValue({ count });
    const jobs = new JobsService({
      trabajo: { findUnique, updateMany },
    } as unknown as PrismaService);
    return { jobs, updateMany };
  }

  type Llamada = {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  };
  const primeraLlamada = (mock: jest.Mock) =>
    (mock.mock.calls as unknown as Llamada[][])[0][0];

  it('el trabajador avisa su llegada y el trabajo sigue ASIGNADO', async () => {
    const { jobs, updateMany } = servicio({ ...base, estado: 'ASIGNADO' });
    const r = await jobs.iniciarTrabajo('trabajador', 'trabajo');
    expect(r.trabajo).toMatchObject({
      status: 'ASIGNADO',
      awaitingConfirmation: true,
    });
    const llamada = primeraLlamada(updateMany);
    expect(llamada.where).toMatchObject({
      estado: 'ASIGNADO',
      inicioSolicitadoEn: null,
    });
    expect(llamada.data.inicioSolicitadoEn).toBeInstanceOf(Date);
    expect(llamada.data.estado).toBeUndefined();
  });

  it('el cliente no puede iniciar si el trabajador no avisó su llegada', async () => {
    const { jobs, updateMany } = servicio({ ...base, estado: 'ASIGNADO' });
    await expect(
      jobs.iniciarTrabajo('cliente', 'trabajo'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('el cliente confirma la llegada y el trabajo pasa a EN_PROCESO', async () => {
    const { jobs, updateMany } = servicio({
      ...base,
      estado: 'ASIGNADO',
      inicioSolicitadoEn: new Date(),
    });
    const r = await jobs.iniciarTrabajo('cliente', 'trabajo');
    expect(r.trabajo.status).toBe('EN_PROCESO');
    expect(primeraLlamada(updateMany).data).toEqual({ estado: 'EN_PROCESO' });
  });

  it('el trabajador no puede avisar su llegada dos veces', async () => {
    const { jobs, updateMany } = servicio({
      ...base,
      estado: 'ASIGNADO',
      inicioSolicitadoEn: new Date(),
    });
    await expect(
      jobs.iniciarTrabajo('trabajador', 'trabajo'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('un tercero no puede avisar ni confirmar', async () => {
    const { jobs } = servicio({
      ...base,
      estado: 'ASIGNADO',
      inicioSolicitadoEn: new Date(),
    });
    await expect(
      jobs.iniciarTrabajo('tercero', 'trabajo'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      jobs.completarTrabajo('tercero', 'trabajo'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('no se completa un trabajo que no está en proceso', async () => {
    const { jobs } = servicio({ ...base, estado: 'ASIGNADO' });
    await expect(
      jobs.completarTrabajo('trabajador', 'trabajo'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('el trabajador avisa el término y el trabajo sigue EN_PROCESO', async () => {
    const { jobs, updateMany } = servicio({ ...base, estado: 'EN_PROCESO' });
    const r = await jobs.completarTrabajo('trabajador', 'trabajo');
    expect(r.trabajo).toMatchObject({
      status: 'EN_PROCESO',
      awaitingConfirmation: true,
    });
    expect(primeraLlamada(updateMany).data.terminoSolicitadoEn).toBeInstanceOf(
      Date,
    );
  });

  it('el cliente no puede completar si el trabajador no avisó el término', async () => {
    const { jobs } = servicio({ ...base, estado: 'EN_PROCESO' });
    await expect(
      jobs.completarTrabajo('cliente', 'trabajo'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('el cliente confirma el término y el trabajo pasa a COMPLETADO', async () => {
    const { jobs, updateMany } = servicio({
      ...base,
      estado: 'EN_PROCESO',
      terminoSolicitadoEn: new Date(),
    });
    const r = await jobs.completarTrabajo('cliente', 'trabajo');
    expect(r.trabajo.status).toBe('COMPLETADO');
    expect(primeraLlamada(updateMany).where).toMatchObject({
      estado: 'EN_PROCESO',
      terminoSolicitadoEn: { not: null },
    });
  });

  it('si otro cambio llegó antes, la confirmación se rechaza sin modificar el estado', async () => {
    const { jobs } = servicio(
      { ...base, estado: 'EN_PROCESO', terminoSolicitadoEn: new Date() },
      0,
    );
    await expect(
      jobs.completarTrabajo('cliente', 'trabajo'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
