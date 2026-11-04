import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GuardarPreferenciasDto } from './preferencias.dto';
import { PreferenciasService } from './preferencias.service';

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
const valid = {
  goal: 'TRABAJAR',
  categories: ['Limpieza', 'Mudanzas'],
  regionId: '13',
  commune: 'santiago',
  budgetRange: 'DE_20000_A_50000',
  availability: ['FIN_DE_SEMANA', 'TARDE'],
};
const validate = async (value: object) =>
  (await pipe.transform(value, {
    type: 'body',
    metatype: GuardarPreferenciasDto,
  })) as GuardarPreferenciasDto;

describe('Validación del cuestionario de preferencias', () => {
  it('acepta respuestas válidas y normaliza la comuna', async () => {
    await expect(validate(valid)).resolves.toMatchObject({
      commune: 'Santiago',
      categories: ['Limpieza', 'Mudanzas'],
    });
  });

  it.each([
    ['objetivo inexistente', { goal: 'ADMIN' }],
    ['sin categorías', { categories: [] }],
    [
      'más de 10 categorías',
      { categories: [...'abcdefghijk'].map((l) => `Cat ${l}`) },
    ],
    ['comuna inexistente', { commune: 'Ciudad Gótica' }],
    ['región con formato inválido', { regionId: 'RM' }],
    ['rango desconocido', { budgetRange: 'GRATIS' }],
    ['disponibilidad desconocida', { availability: ['MADRUGADA'] }],
    ['campos privilegiados', { rol: 'ADMIN' }],
    ['usuario de otra cuenta', { usuarioId: 'otro' }],
  ])('rechaza %s', async (_name, change) => {
    await expect(validate({ ...valid, ...change })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('PreferenciasService', () => {
  const crear = (existente: unknown = null) => {
    const prisma = {
      preferenciaUsuario: {
        findUnique: jest.fn().mockResolvedValue(existente),
        upsert: jest.fn(({ create }: { create: object; update?: object }) =>
          Promise.resolve({
            ...create,
            actualizadoEn: new Date(),
          }),
        ),
      },
    };
    return {
      prisma,
      service: new PreferenciasService(prisma as unknown as PrismaService),
    };
  };

  it('sin respuestas indica que el cuestionario está pendiente', async () => {
    const { service } = crear();
    await expect(service.obtener('usuario')).resolves.toEqual({
      completed: false,
      skipped: false,
      preferences: null,
    });
  });

  it('guarda solo para el usuario autenticado y quita categorías repetidas', async () => {
    const { service, prisma } = crear();
    const dto = await validate({
      ...valid,
      categories: ['Limpieza', 'limpieza', 'Mudanzas'],
    });
    const result = await service.guardar('usuario', dto);
    const [{ where, create }] = prisma.preferenciaUsuario.upsert.mock
      .calls[0] as [{ where: object; create: Record<string, unknown> }];
    expect(where).toEqual({ usuarioId: 'usuario' });
    expect(create).toMatchObject({
      usuarioId: 'usuario',
      objetivo: 'TRABAJAR',
      categorias: ['limpieza', 'Mudanzas'],
      comuna: 'Santiago',
      omitidoEn: null,
    });
    expect(result).toMatchObject({
      completed: true,
      skipped: false,
      preferences: { goal: 'TRABAJAR', commune: 'Santiago' },
    });
  });

  it('omitir no borra respuestas anteriores', async () => {
    const { service, prisma } = crear();
    await service.omitir('usuario');
    const [{ update }] = prisma.preferenciaUsuario.upsert.mock.calls[0] as [
      { update: Record<string, unknown> },
    ];
    expect(Object.keys(update)).toEqual(['omitidoEn']);
  });
});
