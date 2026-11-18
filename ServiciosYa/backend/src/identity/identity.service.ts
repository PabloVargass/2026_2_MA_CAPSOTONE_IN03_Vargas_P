import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { validateImage } from '../common/image-upload';
import { Prisma } from '../../generated/prisma/client';
import { normalizarRut, validarRut } from '../auth/utils/rut.util';
import { SubmitIdentityDto } from './identity.dto';
import { PDFDocument } from 'pdf-lib';

export type IdentityFile = { buffer: Buffer; mimetype: string; size: number };
export const identityMetadata = {
  id: true,
  estado: true,
  creadoEn: true,
  revisadoEn: true,
  motivoRevision: true,
  certificadoTipo: true,
  fotoTipo: true,
  mensaje: true,
} as const;

// Agrega si la solicitud trae documentos; la solicitud simple no los tiene.
function withDocuments<T extends { fotoTipo: string | null }>(identity: T) {
  const { fotoTipo, ...rest } = identity;
  return { ...rest, conDocumentos: fotoTipo !== null };
}

export function validateIdentityImage(file?: IdentityFile) {
  return validateImage(file, 2097152, {
    size: 'Adjunta cada documento como una foto de hasta 2 MB.',
    type: 'Los documentos deben ser fotos JPG o PNG válidas.',
  });
}

export async function validateIdentityCertificate(file?: IdentityFile) {
  if (file?.mimetype !== 'application/pdf') return validateIdentityImage(file);
  if (
    file.size < 1 ||
    file.size > 2097152 ||
    file.buffer.length !== file.size ||
    !/^%PDF-1\.[0-7]|^%PDF-2\.0/.test(
      file.buffer.subarray(0, 8).toString('ascii'),
    ) ||
    !/%%EOF\s*$/.test(file.buffer.subarray(-1024).toString('ascii'))
  ) {
    throw new BadRequestException(
      'Adjunta un certificado PDF válido de hasta 2 MB.',
    );
  }
  try {
    const pdf = await PDFDocument.load(file.buffer, {
      throwOnInvalidObject: true,
      updateMetadata: false,
    });
    if (pdf.getPageCount() < 1) throw new Error('Sin páginas');
  } catch {
    throw new BadRequestException(
      'El certificado PDF debe ser legible y no tener contraseña.',
    );
  }
  return file;
}

@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}
  async mine(userId: string) {
    const user = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: userId },
      select: { rut: true, rol: true, identidad: { select: identityMetadata } },
    });
    return {
      rut: user.rut,
      role: user.rol,
      canPublish: user.rol === 'ADMIN' || user.identidad?.estado === 'APROBADA',
      identity: user.identidad ? withDocuments(user.identidad) : null,
    };
  }
  // Solicitud a administración sin documentos (acuerdo con el docente);
  // el administrador la aprueba o rechaza igual que la solicitud con documentos.
  async requestWithoutDocuments(userId: string, mensaje?: string) {
    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const user = await tx.usuario.findUniqueOrThrow({
            where: { id: userId },
            select: { identidad: { select: { estado: true } } },
          });
          if (user.identidad && user.identidad.estado !== 'RECHAZADA')
            throw new ConflictException(
              'Ya tienes una solicitud pendiente o una identidad aprobada.',
            );
          const data = {
            foto: null,
            fotoTipo: null,
            certificado: null,
            certificadoTipo: null,
            mensaje: mensaje || null,
            estado: 'PENDIENTE' as const,
            consentimientoEn: new Date(),
            revisadoEn: null,
            revisadoPorId: null,
            motivoRevision: null,
          };
          return tx.solicitudIdentidad.upsert({
            where: { usuarioId: userId },
            create: { usuarioId: userId, ...data },
            update: data,
            select: identityMetadata,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return withDocuments(result);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2034', 'P2002'].includes(error.code)
      )
        throw new ConflictException(
          'Otra solicitud se procesó al mismo tiempo. Actualiza e inténtalo nuevamente.',
        );
      throw error;
    }
  }
  async submit(
    userId: string,
    dto: SubmitIdentityDto,
    photo?: IdentityFile,
    certificate?: IdentityFile,
  ) {
    const foto = validateIdentityImage(photo),
      certificado = await validateIdentityCertificate(certificate);
    const rut = normalizarRut(dto.rut);
    if (!validarRut(rut)) throw new BadRequestException('El RUT no es válido.');
    try {
      return await this.prisma
        .$transaction(
          async (tx) => {
            const user = await tx.usuario.findUniqueOrThrow({
              where: { id: userId },
              select: {
                rut: true,
                identidad: { select: { estado: true, fotoTipo: true } },
              },
            });
            if (normalizarRut(user.rut) !== rut)
              throw new BadRequestException(
                'El RUT debe coincidir con el registrado en tu cuenta.',
              );
            // Se permite completar con documentos una solicitud simple aún pendiente.
            const completaSolicitudSimple =
              user.identidad?.estado === 'PENDIENTE' &&
              user.identidad.fotoTipo === null;
            if (
              user.identidad &&
              user.identidad.estado !== 'RECHAZADA' &&
              !completaSolicitudSimple
            )
              throw new ConflictException(
                'Ya tienes una identidad aprobada o pendiente de revisión.',
              );
            const data = {
              foto: new Uint8Array(foto.buffer),
              fotoTipo: foto.mimetype,
              certificado: new Uint8Array(certificado.buffer),
              certificadoTipo: certificado.mimetype,
              estado: 'PENDIENTE' as const,
              consentimientoEn: new Date(),
              revisadoEn: null,
              revisadoPorId: null,
              motivoRevision: null,
            };
            // Al completar una solicitud simple se conserva su mensaje.
            return tx.solicitudIdentidad.upsert({
              where: { usuarioId: userId },
              create: { usuarioId: userId, ...data },
              update: completaSolicitudSimple
                ? data
                : { ...data, mensaje: null },
              select: identityMetadata,
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        )
        .then(withDocuments);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2034', 'P2002'].includes(error.code)
      )
        throw new ConflictException(
          'Otra solicitud se procesó al mismo tiempo. Actualiza e inténtalo nuevamente.',
        );
      throw error;
    }
  }
  async document(id: string, kind: string, ownerId?: string) {
    if (!['foto', 'certificado'].includes(kind))
      throw new NotFoundException('Documento no encontrado.');
    const where = { id, ...(ownerId ? { usuarioId: ownerId } : {}) };
    if (kind === 'foto') {
      const doc = await this.prisma.solicitudIdentidad.findFirst({
        where,
        select: { foto: true, fotoTipo: true },
      });
      if (!doc) throw new NotFoundException('Documento no encontrado.');
      if (!doc.foto || !doc.fotoTipo)
        throw new NotFoundException('La solicitud no incluye documentos.');
      return { bytes: Buffer.from(doc.foto), type: doc.fotoTipo };
    }
    const doc = await this.prisma.solicitudIdentidad.findFirst({
      where,
      select: { certificado: true, certificadoTipo: true },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado.');
    if (!doc.certificado || !doc.certificadoTipo)
      throw new NotFoundException('La solicitud no incluye documentos.');
    return { bytes: Buffer.from(doc.certificado), type: doc.certificadoTipo };
  }
}
