import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MailService } from './mail.service';
import { cuentaDesactivada } from './cuenta-desactivada';

const PASSWORD = 'ClaveCorrecta1!';

async function setup(usuario: Record<string, unknown> | null) {
  const contrasena = await bcrypt.hash(PASSWORD, 4);
  const users = {
    findByEmail: jest
      .fn()
      .mockResolvedValue(usuario ? { contrasena, ...usuario } : null),
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('token') };
  const prisma = {
    usuario: {
      findUnique: jest.fn().mockResolvedValue({ versionSesion: 0 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ versionSesion: 0 }),
    },
  };
  return new AuthService(
    users as unknown as UsersService,
    jwt as unknown as JwtService,
    prisma as unknown as PrismaService,
    {} as MailService,
  );
}

const base = {
  id: 'user',
  correo: 'ana@example.test',
  nombre: 'Ana',
  telefono: null,
  correoVerificadoEn: new Date(),
};

async function errorDe(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error: unknown) {
    return error;
  }
  throw new Error('Se esperaba un error');
}

describe('Inicio de sesión con cuenta desactivada', () => {
  it('con contraseña correcta informa que está bloqueada y el mensaje', async () => {
    const service = await setup({
      ...base,
      activo: false,
      desactivacionTipo: 'BLOQUEADA',
      desactivacionMensaje: 'Incumpliste las normas de la comunidad.',
    });
    const error = await errorDe(
      service.login({ email: base.correo, password: PASSWORD }),
    );
    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      code: 'CUENTA_BLOQUEADA',
      message: 'Tu cuenta está bloqueada.',
      motivo: 'Incumpliste las normas de la comunidad.',
    });
  });

  it('distingue una cuenta inactiva', async () => {
    const service = await setup({
      ...base,
      activo: false,
      desactivacionTipo: 'INACTIVA',
      desactivacionMensaje: 'Estamos revisando tu cuenta.',
    });
    const error = await errorDe(
      service.login({ email: base.correo, password: PASSWORD }),
    );
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      code: 'CUENTA_INACTIVA',
      motivo: 'Estamos revisando tu cuenta.',
    });
  });

  it('con contraseña incorrecta no revela que la cuenta está desactivada', async () => {
    const service = await setup({
      ...base,
      activo: false,
      desactivacionTipo: 'BLOQUEADA',
      desactivacionMensaje: 'Mensaje privado',
    });
    const error = await errorDe(
      service.login({ email: base.correo, password: 'OtraClave1!' }),
    );
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(
      JSON.stringify((error as UnauthorizedException).getResponse()),
    ).not.toContain('Mensaje privado');
  });

  it('un correo inexistente recibe el mismo mensaje genérico', async () => {
    const service = await setup(null);
    const error = await errorDe(
      service.login({ email: 'nadie@example.test', password: PASSWORD }),
    );
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).message).toBe(
      'Correo electrónico o contraseña incorrectos.',
    );
  });

  it('una cuenta desactivada antes de este cambio, sin tipo ni mensaje, se informa como inactiva', () => {
    expect(
      cuentaDesactivada({
        desactivacionTipo: null,
        desactivacionMensaje: null,
      }).getResponse(),
    ).toMatchObject({ code: 'CUENTA_INACTIVA', motivo: null });
  });
});
