// Interpreta la respuesta 403 del backend cuando la cuenta no está activa.
// El backend solo la envía después de comprobar la contraseña o la cuenta de Google.
type Translate = (text: string, values?: Record<string, string>) => string;

export function accountStatusAlert(data: unknown, t: Translate): { title: string; message: string } | null {
  if (!data || typeof data !== 'object') return null;
  const { code, motivo } = data as { code?: unknown; motivo?: unknown };
  if (code !== 'CUENTA_INACTIVA' && code !== 'CUENTA_BLOQUEADA') return null;
  const blocked = code === 'CUENTA_BLOQUEADA';
  const parts = [t(blocked ? 'Tu cuenta está bloqueada.' : 'Tu cuenta está inactiva.')];
  if (typeof motivo === 'string' && motivo.trim()) parts.push(t('Motivo: {motivo}', { motivo: motivo.trim() }));
  parts.push(t('Si crees que se trata de un error, contacta a administración.'));
  return { title: t(blocked ? 'Cuenta bloqueada' : 'Cuenta inactiva'), message: parts.join('\n\n') };
}
