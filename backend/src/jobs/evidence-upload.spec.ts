import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';

import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfilePhotoService } from '../users/profile-photo.service';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { JobEvidenceService } from './job-evidence.service';
import { JobManagementService } from './job-management.service';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { ServiceOffersService } from './service-offers.service';

// Comprueba la configuración multipart real (límites de multer), no solo el servicio.
describe('Subida multipart de evidencias y foto de perfil', () => {
  let app: INestApplication<Server>;
  const evidence = { subir: jest.fn().mockResolvedValue({ ok: true }) };
  const photos = { guardar: jest.fn().mockResolvedValue({ ok: true }) };
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [JobsController, UsersController],
      providers: [
        { provide: JobsService, useValue: {} },
        { provide: ServiceOffersService, useValue: {} },
        { provide: JobManagementService, useValue: {} },
        { provide: JobEvidenceService, useValue: evidence },
        { provide: UsersService, useValue: {} },
        { provide: ProfilePhotoService, useValue: photos },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: {
          switchToHttp: () => { getRequest: () => { user?: object } };
        }) => {
          ctx.switchToHttp().getRequest().user = { sub: 'usuario' };
          return true;
        },
      })
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it('una foto llega al servicio de evidencias', async () => {
    await request(app.getHttpServer())
      .post('/jobs/trabajo/evidencias')
      .attach('foto', png, { filename: 'foto.png', contentType: 'image/png' })
      .expect(201);
    expect(evidence.subir).toHaveBeenCalledWith(
      'usuario',
      'trabajo',
      expect.objectContaining({ mimetype: 'image/png', size: png.length }),
    );
  });

  it('una foto llega al servicio de foto de perfil', async () => {
    await request(app.getHttpServer())
      .put('/users/me/foto')
      .attach('foto', png, { filename: 'foto.png', contentType: 'image/png' })
      .expect(200);
    expect(photos.guardar).toHaveBeenCalledWith(
      'usuario',
      expect.objectContaining({ mimetype: 'image/png' }),
    );
  });

  it('rechaza más de un archivo', async () => {
    await request(app.getHttpServer())
      .post('/jobs/trabajo/evidencias')
      .attach('foto', png, { filename: 'a.png', contentType: 'image/png' })
      .attach('foto', png, { filename: 'b.png', contentType: 'image/png' })
      .expect(400);
  });
});
