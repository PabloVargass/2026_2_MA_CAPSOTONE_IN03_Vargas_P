import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  MAX_PROFILE_PHOTO_BYTES,
  ProfilePhotoService,
} from './profile-photo.service';

const jpeg = Buffer.from([255, 216, 255, 224, 0, 0, 255, 217]);

describe('Foto de perfil y biografía', () => {
  const crear = () => {
    const prisma = {
      fotoPerfil: {
        upsert: jest.fn().mockResolvedValue({ actualizadoEn: new Date() }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    return {
      prisma,
      service: new ProfilePhotoService(prisma as unknown as PrismaService),
    };
  };

  it('guarda una foto JPG válida solo para el usuario autenticado', async () => {
    const { service, prisma } = crear();
    await service.guardar('usuario', {
      buffer: jpeg,
      mimetype: 'image/jpeg',
      size: jpeg.length,
    });
    expect(prisma.fotoPerfil.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuarioId: 'usuario' } }),
    );
  });

  it('rechaza fotos de más de 1 MB o con contenido falso', async () => {
    const { service, prisma } = crear();
    const grande = Buffer.alloc(MAX_PROFILE_PHOTO_BYTES + 1);
    await expect(
      service.guardar('usuario', {
        buffer: grande,
        mimetype: 'image/jpeg',
        size: grande.length,
      }),
    ).rejects.toThrow('Adjunta una foto de hasta 1 MB.');
    await expect(
      service.guardar('usuario', {
        buffer: Buffer.from('<svg/>'),
        mimetype: 'image/png',
        size: 6,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.fotoPerfil.upsert).not.toHaveBeenCalled();
  });

  it('la foto de una cuenta bloqueada no se publica', async () => {
    const { service, prisma } = crear();
    await expect(service.obtener('bloqueado')).rejects.toThrow(
      'El usuario no tiene foto.',
    );
    expect(prisma.fotoPerfil.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuarioId: 'bloqueado', usuario: { activo: true } },
      }),
    );
  });

  it('la biografía se recorta y no supera 300 caracteres', async () => {
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    const validar = (value: object) =>
      pipe.transform(value, { type: 'body', metatype: UpdateProfileDto });
    await expect(validar({ bio: '  Hola, soy gasfiter.  ' })).resolves.toEqual({
      bio: 'Hola, soy gasfiter.',
    });
    await expect(validar({ bio: 'a'.repeat(301) })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
