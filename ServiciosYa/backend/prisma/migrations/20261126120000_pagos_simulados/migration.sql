-- Pagos simulados: saldo de billetera por usuario y registro del pago de cada trabajo
-- (monto, comisión del 5 %, monto para el trabajador y método). Solo agrega estructuras;
-- no modifica ni borra datos existentes.
-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('SALDO', 'TRANSFERENCIA');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "saldo" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "trabajoId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "comision" INTEGER NOT NULL,
    "montoTrabajador" INTEGER NOT NULL,
    "metodo" "MetodoPago" NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pago_trabajoId_key" ON "Pago"("trabajoId");

-- CreateIndex
CREATE INDEX "Pago_clienteId_creadoEn_idx" ON "Pago"("clienteId", "creadoEn");

-- CreateIndex
CREATE INDEX "Pago_trabajadorId_creadoEn_idx" ON "Pago"("trabajadorId", "creadoEn");

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_trabajoId_fkey" FOREIGN KEY ("trabajoId") REFERENCES "Trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

