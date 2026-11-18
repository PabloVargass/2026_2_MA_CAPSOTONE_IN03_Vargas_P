-- Solicitud de identidad sin documentos, con un mensaje opcional para administración.
-- Solo vuelve opcionales los documentos y agrega una columna; no modifica ni borra datos existentes.
-- AlterTable
ALTER TABLE "SolicitudIdentidad" ALTER COLUMN "foto" DROP NOT NULL,
ALTER COLUMN "fotoTipo" DROP NOT NULL,
ALTER COLUMN "certificado" DROP NOT NULL,
ALTER COLUMN "certificadoTipo" DROP NOT NULL,
ADD COLUMN     "mensaje" VARCHAR(500);
