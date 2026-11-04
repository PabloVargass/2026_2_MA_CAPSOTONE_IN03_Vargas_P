-- Pausa de publicaciones, biografía y foto de perfil, y fotos de evidencia del trabajo.
-- Solo agrega estructuras; no modifica ni borra datos existentes.
-- AlterEnum
ALTER TYPE "EstadoTrabajo" ADD VALUE 'PAUSADO';

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "biografia" VARCHAR(300);

-- CreateTable
CREATE TABLE "FotoPerfil" (
    "usuarioId" TEXT NOT NULL,
    "foto" BYTEA NOT NULL,
    "tipo" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FotoPerfil_pkey" PRIMARY KEY ("usuarioId")
);

-- CreateTable
CREATE TABLE "EvidenciaTrabajo" (
    "id" TEXT NOT NULL,
    "trabajoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "foto" BYTEA NOT NULL,
    "tipo" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenciaTrabajo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenciaTrabajo_trabajoId_creadoEn_idx" ON "EvidenciaTrabajo"("trabajoId", "creadoEn");

-- AddForeignKey
ALTER TABLE "FotoPerfil" ADD CONSTRAINT "FotoPerfil_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaTrabajo" ADD CONSTRAINT "EvidenciaTrabajo_trabajoId_fkey" FOREIGN KEY ("trabajoId") REFERENCES "Trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaTrabajo" ADD CONSTRAINT "EvidenciaTrabajo_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Restricciones de formato y tamaño, igual que las imágenes de identidad.
ALTER TABLE "FotoPerfil" ADD CONSTRAINT "FotoPerfil_tipo_check" CHECK ("tipo" IN ('image/jpeg','image/png'));
ALTER TABLE "FotoPerfil" ADD CONSTRAINT "FotoPerfil_tamano_check" CHECK (octet_length("foto") BETWEEN 1 AND 1048576);
ALTER TABLE "EvidenciaTrabajo" ADD CONSTRAINT "EvidenciaTrabajo_tipo_check" CHECK ("tipo" IN ('image/jpeg','image/png'));
ALTER TABLE "EvidenciaTrabajo" ADD CONSTRAINT "EvidenciaTrabajo_tamano_check" CHECK (octet_length("foto") BETWEEN 1 AND 2097152);
