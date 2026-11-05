import { chileRegions, normalizeSearch } from './publication-search';

export type UserGoal = 'CONTRATAR' | 'TRABAJAR' | 'AMBOS';
export type BudgetRange = 'HASTA_20000' | 'DE_20000_A_50000' | 'DE_50000_A_100000' | 'MAS_DE_100000';
export type Availability = 'DIAS_SEMANA' | 'FIN_DE_SEMANA' | 'MANANA' | 'TARDE' | 'NOCHE';
export type UserPreferences = {
  goal: UserGoal; categories: string[]; regionId: string | null; commune: string | null;
  budgetRange: BudgetRange | null; availability: Availability[];
};
export type AffinityPublication = { kind?: 'SERVICIO' | 'OPORTUNIDAD'; category: string; commune: string; budget: number; scheduledAt?: string | null };

// Límites en pesos de cada rango; el orden define qué rangos son vecinos.
export const budgetRanges: { value: BudgetRange; min: number; max: number }[] = [
  { value: 'HASTA_20000', min: 0, max: 20000 },
  { value: 'DE_20000_A_50000', min: 20000, max: 50000 },
  { value: 'DE_50000_A_100000', min: 50000, max: 100000 },
  { value: 'MAS_DE_100000', min: 100000, max: Number.POSITIVE_INFINITY },
];

const regionByCommune = new Map(chileRegions.flatMap(region => region.communes.map(commune => [normalizeSearch(commune.name), region.id] as const)));

function budgetIndex(budget: number) {
  return budgetRanges.findIndex(range => budget >= range.min && budget < range.max);
}

function timeSlot(hour: number): Availability {
  if (hour >= 6 && hour < 12) return 'MANANA';
  if (hour >= 12 && hour < 19) return 'TARDE';
  return 'NOCHE';
}

// Puntaje de 0 a 100 según las respuestas del cuestionario. Solo ordena recomendaciones.
// Categoría 40, ubicación 25, objetivo 15, precio 10, disponibilidad 10.
export function publicationAffinity(job: AffinityPublication, preferences: UserPreferences) {
  let score = 0;
  const category = normalizeSearch(job.category);
  if (preferences.categories.some(item => { const chosen = normalizeSearch(item); return chosen === category || category.includes(chosen) || chosen.includes(category); })) score += 40;

  const commune = normalizeSearch(job.commune);
  if (preferences.commune && normalizeSearch(preferences.commune) === commune) score += 25;
  else if (preferences.regionId && regionByCommune.get(commune) === preferences.regionId) score += 12;

  const kind = job.kind ?? 'OPORTUNIDAD';
  if (preferences.goal === 'AMBOS' || (preferences.goal === 'TRABAJAR' && kind === 'OPORTUNIDAD') || (preferences.goal === 'CONTRATAR' && kind === 'SERVICIO')) score += 15;

  if (preferences.budgetRange) {
    const distance = Math.abs(budgetIndex(job.budget) - budgetRanges.findIndex(range => range.value === preferences.budgetRange));
    if (distance === 0) score += 10;
    else if (distance === 1) score += 5;
  }

  const date = job.scheduledAt ? new Date(job.scheduledAt) : null;
  if (!date || Number.isNaN(date.getTime())) score += 5;
  else {
    const days = preferences.availability.filter(item => item === 'DIAS_SEMANA' || item === 'FIN_DE_SEMANA');
    const slots: Availability[] = preferences.availability.filter(item => item !== 'DIAS_SEMANA' && item !== 'FIN_DE_SEMANA');
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    if (days.length === 0 || days.includes(weekend ? 'FIN_DE_SEMANA' : 'DIAS_SEMANA')) score += 5;
    if (slots.length === 0 || slots.includes(timeSlot(date.getHours()))) score += 5;
  }
  return score;
}
