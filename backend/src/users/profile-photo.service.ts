import { Injectable, NotFoundException } from '@nestjs/common';

import { validateImage, type UploadedImage } from '../common/image-upload';
import { PrismaService } from '../prisma/prisma.service';

export const MAX_PROFILE_PHOTO_BYTES = 1048576;

// Foto pública del perfil. Solo el propio usuario la cambia o la quita.
@Injectable()
export class ProfilePhotoService {
  constructor(private readonly prisma: PrismaService) {}

  async guardar(usuarioId: string, file?: UploadedImage) {
    const foto = validateImage(file, MAX_PROFILE_PHOTO_BYTES, {
      size: 'Adjunta una foto de hasta 1 MB.',
      type: 'La foto de perfil debe ser JPG o PNG.',
    });
    const datos = { foto: new Uint8Array(foto.buffer), tipo: foto.mimetype };
    const guardada = await this.prisma.fotoPerfil.upsert({
      where: { usuarioId },
      create: { usuarioId, ...datos },
      update: datos,
      select: { actualizadoEn: true },
    });
    return {
      message: 'Foto de perfil actualizada.',
      photoUpdatedAt: guardada.actualizadoEn,
    };
  }

  async quitar(usuarioId: string) {
    await this.prisma.fotoPerfil.deleteMany({ where: { usuarioId } });
    return { message: 'Foto de perfil eliminada.', photoUpdatedAt: null };
  }

  // Las cuentas bloqueadas no muestran su foto, igual que no aparecen en Personas.
  async obtener(usuarioId: string) {
    const foto = await this.prisma.fotoPerfil.findFirst({
      where: { usuarioId, usuario: { activo: true } },
      select: { foto: true, tipo: true },
    });
    if (!foto) throw new NotFoundException('El usuario no tiene foto.');
    return { bytes: Buffer.from(foto.foto), type: foto.tipo };
  }
}
