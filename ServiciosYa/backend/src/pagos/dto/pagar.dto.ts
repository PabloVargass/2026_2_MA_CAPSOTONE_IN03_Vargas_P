import { IsIn } from 'class-validator';

export const METODOS_PAGO = ['SALDO', 'TRANSFERENCIA'] as const;
export type MetodoPagoDto = (typeof METODOS_PAGO)[number];

export class PagarDto {
  @IsIn(METODOS_PAGO, {
    message: 'Elige pagar con saldo ServiciosYa o por transferencia.',
  })
  metodo!: MetodoPagoDto;
}
