import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { MetodoPagoDto } from './dto/pagar.dto';

// Comisión de la plataforma sobre cada servicio pagado (modelo de negocio: 5 %).
export const COMISION_PLATAFORMA = 0.05;

export function calcularMontos(monto: number) {
  const comision = Math.round(monto * COMISION_PLATAFORMA);
  return { comision, montoTrabajador: monto - comision };
}

// Pagos simulados: no se mueve dinero real. El cliente paga al confirmar el
// término del trabajo; el trabajador recibe el monto menos la comisión en su
// saldo ServiciosYa.
@Injectable()
export class PagosService {
  constructor(private readonly prisma: PrismaService) {}

  async pagarYCompletar(
    clienteId: string,
    trabajoId: string,
    metodo: MetodoPagoDto,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const trabajo = await tx.trabajo.findUnique({
          where: { id: trabajoId },
          include: { conversacion: true, pago: true },
        });
        if (!trabajo) throw new NotFoundException('El trabajo no existe.');
        if (trabajo.propietarioId !== clienteId)
          throw new ForbiddenException(
            'Solo el cliente dueño del trabajo puede pagarlo.',
          );
        if (trabajo.pago)
          throw new ConflictException('Este trabajo ya fue pagado.');
        if (!trabajo.conversacion)
          throw new BadRequestException(
            'Este trabajo todavía no tiene un trabajador asignado.',
          );
        if (trabajo.estado !== 'EN_PROCESO' || !trabajo.terminoSolicitadoEn)
          throw new BadRequestException(
            'Solo se paga cuando el trabajador avisó el término del trabajo.',
          );

        const monto = trabajo.presupuesto;
        const { comision, montoTrabajador } = calcularMontos(monto);
        const trabajadorId = trabajo.conversacion.trabajadorId;

        if (metodo === 'SALDO') {
          // La condición evita dejar el saldo negativo, incluso con pagos simultáneos.
          const { count } = await tx.usuario.updateMany({
            where: { id: clienteId, saldo: { gte: monto } },
            data: { saldo: { decrement: monto } },
          });
          if (count === 0)
            throw new BadRequestException(
              'Saldo insuficiente. Paga por transferencia o recarga tu saldo.',
            );
        }

        const completado = await tx.trabajo.updateMany({
          where: {
            id: trabajoId,
            estado: 'EN_PROCESO',
            terminoSolicitadoEn: { not: null },
          },
          data: { estado: 'COMPLETADO' },
        });
        if (completado.count === 0)
          throw new BadRequestException(
            'El trabajo cambió mientras se procesaba. Actualiza e inténtalo de nuevo.',
          );

        await tx.usuario.update({
          where: { id: trabajadorId },
          data: { saldo: { increment: montoTrabajador } },
        });

        const pago = await tx.pago.create({
          data: {
            trabajoId,
            clienteId,
            trabajadorId,
            monto,
            comision,
            montoTrabajador,
            metodo,
          },
        });

        const cliente = await tx.usuario.findUnique({
          where: { id: clienteId },
          select: { saldo: true },
        });

        return {
          message:
            metodo === 'SALDO'
              ? 'Pago realizado con tu saldo ServiciosYa. El trabajo fue completado.'
              : 'Transferencia registrada. El trabajo fue completado.',
          pago: {
            id: pago.id,
            method: pago.metodo,
            amount: pago.monto,
            commission: pago.comision,
            workerAmount: pago.montoTrabajador,
            createdAt: pago.creadoEn,
          },
          trabajo: {
            id: trabajo.id,
            title: trabajo.titulo,
            status: 'COMPLETADO',
          },
          balance: cliente?.saldo ?? 0,
        };
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        throw new ConflictException('Este trabajo ya fue pagado.');
      throw error;
    }
  }

  async billetera(usuarioId: string) {
    const [usuario, recibidos, realizados] = await this.prisma.$transaction([
      this.prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { saldo: true },
      }),
      this.prisma.pago.findMany({
        where: { trabajadorId: usuarioId },
        orderBy: { creadoEn: 'desc' },
        take: 30,
        include: {
          trabajo: { select: { titulo: true } },
          cliente: { select: { nombre: true } },
        },
      }),
      this.prisma.pago.findMany({
        where: { clienteId: usuarioId },
        orderBy: { creadoEn: 'desc' },
        take: 30,
        include: {
          trabajo: { select: { titulo: true } },
          trabajador: { select: { nombre: true } },
        },
      }),
    ]);

    return {
      balance: usuario?.saldo ?? 0,
      received: recibidos.map((p) => ({
        id: p.id,
        jobTitle: p.trabajo.titulo,
        counterpart: p.cliente.nombre,
        method: p.metodo,
        amount: p.monto,
        commission: p.comision,
        workerAmount: p.montoTrabajador,
        createdAt: p.creadoEn,
      })),
      paid: realizados.map((p) => ({
        id: p.id,
        jobTitle: p.trabajo.titulo,
        counterpart: p.trabajador.nombre,
        method: p.metodo,
        amount: p.monto,
        createdAt: p.creadoEn,
      })),
    };
  }
}
