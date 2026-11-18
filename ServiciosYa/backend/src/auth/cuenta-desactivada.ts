import { ForbiddenException } from '@nestjs/common';

export type CuentaDesactivadaCodigo = 'CUENTA_INACTIVA' | 'CUENTA_BLOQUEADA';

// Respuesta 403 que la app usa para explicar por qué no puede entrar.
// Solo se emite después de acreditar la identidad (contraseña correcta o Google).
export function cuentaDesactivada(usuario: {
  desactivacionTipo: 'INACTIVA' | 'BLOQUEADA' | null;
  desactivacionMensaje: string | null;
}) {
  const bloqueada = usuario.desactivacionTipo === 'BLOQUEADA';
  const code: CuentaDesactivadaCodigo = bloqueada
    ? 'CUENTA_BLOQUEADA'
    : 'CUENTA_INACTIVA';
  return new ForbiddenException({
    statusCode: 403,
    error: 'Forbidden',
    code,
    message: bloqueada
      ? 'Tu cuenta está bloqueada.'
      : 'Tu cuenta está inactiva.',
    motivo: usuario.desactivacionMensaje,
  });
}
