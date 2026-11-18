-- Tipo (inactiva o bloqueada) y mensaje visible para la persona cuando su cuenta no está activa.
-- Solo agrega estructuras; no modifica ni borra datos existentes.
-- CreateEnum
CREATE TYPE "TipoDesactivacion" AS ENUM ('INACTIVA', 'BLOQUEADA');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "desactivacionTipo" "TipoDesactivacion",
ADD COLUMN     "desactivacionMensaje" VARCHAR(300),
ADD COLUMN     "desactivadaEn" TIMESTAMP(3);
