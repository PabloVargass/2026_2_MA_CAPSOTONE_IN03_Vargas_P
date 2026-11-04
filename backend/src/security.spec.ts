import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import type { Server } from 'node:http';

import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { corsOrigin } from './cors';

const permitido = (env: Record<string, string>, origin?: string) =>
  new Promise<boolean | undefined>((resolve) =>
    corsOrigin(env)(origin, (_error, allow) => resolve(allow)),
  );

describe('CORS', () => {
  it('la app nativa (sin Origin) siempre pasa', async () => {
    await expect(permitido({ NODE_ENV: 'production' })).resolves.toBe(true);
  });

  it('en desarrollo sin lista solo acepta orígenes locales', async () => {
    await expect(permitido({}, 'http://localhost:3001')).resolves.toBe(true);
    await expect(permitido({}, 'https://sitio-ajeno.example')).resolves.toBe(
      false,
    );
  });

  it('en producción solo la lista configurada', async () => {
    const env = {
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://admin.serviciosya.example/ , https://otro.example',
    };
    await expect(
      permitido(env, 'https://admin.serviciosya.example'),
    ).resolves.toBe(true);
    await expect(permitido(env, 'http://localhost:3001')).resolves.toBe(false);
    await expect(
      permitido({ NODE_ENV: 'production' }, 'http://localhost:3001'),
    ).resolves.toBe(false);
  });
});

describe('Límite de intentos en autenticación', () => {
  let app: INestApplication<Server>;
  const auth = {
    login: jest.fn().mockResolvedValue({ ok: true }),
    verifyResetCode: jest.fn().mockResolvedValue({ ok: true }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])],
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: auth }],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it('bloquea con 429 al pasar 10 intentos de login por minuto', async () => {
    const intentos = [];
    for (let i = 0; i < 11; i++)
      intentos.push(
        (
          await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'a@example.invalid', password: 'x' })
        ).status,
      );
    expect(intentos.slice(0, 10).every((status) => status !== 429)).toBe(true);
    expect(intentos[10]).toBe(429);
  });

  it('los códigos de recuperación admiten solo 5 intentos por minuto', async () => {
    const intentos = [];
    for (let i = 0; i < 6; i++)
      intentos.push(
        (
          await request(app.getHttpServer())
            .post('/auth/verify-reset-code')
            .send({ email: 'a@example.invalid', code: '000000' })
        ).status,
      );
    expect(intentos[5]).toBe(429);
    expect(intentos.slice(0, 5)).not.toContain(429);
  });
});
