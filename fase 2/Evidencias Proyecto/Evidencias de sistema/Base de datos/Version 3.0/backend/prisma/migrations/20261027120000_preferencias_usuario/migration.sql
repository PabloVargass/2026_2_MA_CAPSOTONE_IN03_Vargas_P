-- Cuestionario inicial de afinidad: tabla nueva, sin cambios sobre datos existentes.
-- CreateEnum
CREATE TYPE "ObjetivoUsuario" AS ENUM ('CONTRATAR', 'TRABAJAR', 'AMBOS');

-- CreateEnum
CREATE TYPE "RangoPresupuesto" AS ENUM ('HASTA_20000', 'DE_20000_A_50000', 'DE_50000_A_100000', 'MAS_DE_100000');

-- CreateEnum
CREATE TYPE "Disponibilidad" AS ENUM ('DIAS_SEMANA', 'FIN_DE_SEMANA', 'MANANA', 'TARDE', 'NOCHE');

-- CreateTable
CREATE TABLE "PreferenciaUsuario" (
    "usuarioId" TEXT NOT NULL,
    "objetivo" "ObjetivoUsuario",
    "categorias" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "regionId" TEXT,
    "comuna" TEXT,
    "rangoPresupuesto" "RangoPresupuesto",
    "disponibilidad" "Disponibilidad"[] DEFAULT ARRAY[]::"Disponibilidad"[],
    "completadoEn" TIMESTAMP(3),
    "omitidoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreferenciaUsuario_pkey" PRIMARY KEY ("usuarioId")
);

-- AddForeignKey
ALTER TABLE "PreferenciaUsuario" ADD CONSTRAINT "PreferenciaUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

