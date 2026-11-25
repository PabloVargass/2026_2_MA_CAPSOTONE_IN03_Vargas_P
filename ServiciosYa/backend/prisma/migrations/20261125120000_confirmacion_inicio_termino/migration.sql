-- Doble confirmación de inicio y término: el trabajador avisa y el cliente confirma.
-- Solo agrega dos columnas opcionales; no modifica ni borra datos existentes.
-- AlterTable
ALTER TABLE "Trabajo" ADD COLUMN     "inicioSolicitadoEn" TIMESTAMP(3),
ADD COLUMN     "terminoSolicitadoEn" TIMESTAMP(3);
