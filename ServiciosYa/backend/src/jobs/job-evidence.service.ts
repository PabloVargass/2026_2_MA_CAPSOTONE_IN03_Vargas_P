import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { validateImage, type UploadedImage } from '../common/image-upload';
import { PrismaService } from '../prisma/prisma.service';

export const MAX_EVIDENCE_PHOTOS = 6;
export const MAX_EVIDENCE_BYTES = 2097152;

// Fotos del trabajo realizado: las suben y ven el cliente y el trabajador
// asignado; los administradores activos pueden verlas.
@Injectable()
export class JobEvidenceService {
  constructor(private readonly prisma: PrismaService) {}

  private async acceso(usuarioId: string, trabajoId: string) {
    const [trabajo, usuario] = await Promise.all([
      this.prisma.trabajo.findUnique({
        where: { id: trabajoId },
        select: {
          estado: true,
          propietarioId: true,
          conversacion: { select: { trabajadorId: true } },
        },
      }),
      this.prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { rol: true, activo: true },
      }),
    ]);
    if (!trabajo) throw new NotFoundException('El trabajo no existe.');
    const participante =
      trabajo.propietarioId === usuarioId ||
      trabajo.conversacion?.trabajadorId === usuarioId;
    const admin = usuario?.activo === true && usuario.rol === 'ADMIN';
    if (!participante && !admin)
      throw new ForbiddenException(
        'Solo los participantes del trabajo pueden ver sus evidencias.',
      );
    return { trabajo, participante };
  }

  async listar(usuarioId: string, trabajoId: string) {
    const { trabajo, participante } = await this.acceso(usuarioId, trabajoId);
    const evidencias = await this.prisma.evidenciaTrabajo.findMany({
      where: { trabajoId },
      orderBy: { creadoEn: 'asc' },
      select: {
        id: true,
        creadoEn: true,
        autor: { select: { id: true, nombre: true } },
      },
    });
    return {
      status: trabajo.estado,
      max: MAX_EVIDENCE_PHOTOS,
      canUpload:
        participante &&
        ['EN_PROCESO', 'COMPLETADO'].includes(trabajo.estado) &&
        evidencias.length < MAX_EVIDENCE_PHOTOS,
      photos: evidencias.map((evidencia) => ({
        id: evidencia.id,
        createdAt: evidencia.creadoEn,
        author: { id: evidencia.autor.id, name: evidencia.autor.nombre },
        mine: evidencia.autor.id === usuarioId,
      })),
    };
  }

  async subir(usuarioId: string, trabajoId: string, file?: UploadedImage) {
    const { trabajo, participante } = await this.acceso(usuarioId, trabajoId);
    if (!participante)
      throw new ForbiddenException(
        'Solo los participantes pueden subir evidencias.',
      );
    if (!['EN_PROCESO', 'COMPLETADO'].includes(trabajo.estado))
      throw new BadRequestException(
        'Las evidencias se suben cuando el trabajo está en proceso o completado.',
      );
    const foto = validateImage(file, MAX_EVIDENCE_BYTES, {
      size: 'Adjunta una foto de hasta 2 MB.',
      type: 'La evidencia debe ser una foto JPG o PNG válida.',
    });
    // Serializable evita superar el máximo con subidas simultáneas.
    const evidencia = await this.prisma.$transaction(
      async (tx) => {
        const total = await tx.evidenciaTrabajo.count({ where: { trabajoId } });
        if (total >= MAX_EVIDENCE_PHOTOS)
          throw new ConflictException(
            `Este trabajo ya tiene ${MAX_EVIDENCE_PHOTOS} fotos de evidencia.`,
          );
        return tx.evidenciaTrabajo.create({
          data: {
            trabajoId,
            autorId: usuarioId,
            foto: new Uint8Array(foto.buffer),
            tipo: foto.mimetype,
          },
          select: { id: true, creadoEn: true },
        });
      },
      { isolationLevel: 'Serializable' },
    );
    return {
      message: 'Evidencia agregada.',
      photo: { id: evidencia.id, createdAt: evidencia.creadoEn },
    };
  }

  async foto(usuarioId: string, trabajoId: string, evidenciaId: string) {
    await this.acceso(usuarioId, trabajoId);
    const evidencia = await this.prisma.evidenciaTrabajo.findFirst({
      where: { id: evidenciaId, trabajoId },
      select: { foto: true, tipo: true },
    });
    if (!evidencia) throw new NotFoundException('La evidencia no existe.');
    return { bytes: Buffer.from(evidencia.foto), type: evidencia.tipo };
  }

  // El autor puede quitar su foto mientras el trabajo sigue en proceso.
  async eliminar(usuarioId: string, trabajoId: string, evidenciaId: string) {
    const { trabajo } = await this.acceso(usuarioId, trabajoId);
    if (trabajo.estado !== 'EN_PROCESO')
      throw new BadRequestException(
        'Solo puedes quitar evidencias mientras el trabajo está en proceso.',
      );
    const { count } = await this.prisma.evidenciaTrabajo.deleteMany({
      where: { id: evidenciaId, trabajoId, autorId: usuarioId },
    });
    if (count !== 1)
      throw new NotFoundException(
        'No encontramos una evidencia tuya con ese id.',
      );
    return { message: 'Evidencia eliminada.' };
  }
}
