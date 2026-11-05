import { authenticatedApi } from './authenticated-api';
import type { UserPreferences } from './affinity';

export type PreferencesStatus = { completed: boolean; skipped: boolean; preferences: UserPreferences | null };

export function getPreferences(signal?: AbortSignal) {
  return authenticatedApi<PreferencesStatus>('/users/me/preferencias', 'GET', undefined, signal);
}

export function savePreferences(preferences: UserPreferences) {
  const { regionId, commune, budgetRange, ...rest } = preferences;
  // Los campos opcionales vacíos se omiten para que el servidor no los valide como texto.
  return authenticatedApi<PreferencesStatus>('/users/me/preferencias', 'PUT', {
    ...rest,
    ...(regionId ? { regionId } : {}),
    ...(commune ? { commune } : {}),
    ...(budgetRange ? { budgetRange } : {}),
  });
}

export function skipPreferences() {
  return authenticatedApi<PreferencesStatus>('/users/me/preferencias/omitir', 'POST');
}

// Tras iniciar sesión: el cuestionario aparece solo si no se respondió ni se omitió.
// Un error de red no debe impedir entrar a la app.
export async function routeAfterLogin() {
  try {
    const status = await getPreferences();
    return status.completed || status.skipped ? '/(tabs)/home' : '/onboarding';
  } catch {
    return '/(tabs)/home';
  }
}
