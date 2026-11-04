// Afinidad del cuestionario, orden de destacados y lógica del cuestionario sin emulador.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

const src = path.resolve(__dirname, '../src');
const cache = {};
function load(relative) {
  const filename = path.join(src, relative);
  if (cache[filename]) return cache[filename];
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  cache[filename] = exports;
  const base = createRequire(filename);
  const req = name => name.startsWith('./') && !name.endsWith('.json') ? load(path.relative(src, path.resolve(path.dirname(filename), `${name}.ts`))) : base(name);
  vm.runInNewContext(code, { exports, require: req, Set, Map, Date, JSON, Number, Math });
  return exports;
}
function callback(file, name, context) {
  const filename = path.join(src, 'app', file);
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let initializer;
  (function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) initializer = node.initializer; ts.forEachChild(node, visit); })(source);
  assert.ok(initializer, `No se encontró ${name}`);
  const code = ts.transpileModule(`(${initializer.getText(source)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
  return vm.runInNewContext(code, { Number, ...context });
}

const { publicationAffinity } = load('services/affinity.ts');
const { filterPublications, defaultPublicationFilters } = load('services/publication-search.ts');
const prefs = { goal: 'TRABAJAR', categories: ['Limpieza'], regionId: '13', commune: 'Maipú', budgetRange: 'DE_20000_A_50000', availability: ['FIN_DE_SEMANA', 'MANANA'] };
// Sábado 10:00 hora local del proceso de prueba.
const saturdayMorning = new Date(2026, 9, 31, 10, 0).toISOString();
const job = (extra = {}) => ({ kind: 'OPORTUNIDAD', category: 'Limpieza', commune: 'maipu', budget: 30000, scheduledAt: saturdayMorning, ...extra });

test('coincidencia total suma 100', () => assert.equal(publicationAffinity(job(), prefs), 100));
test('categoría distinta resta 40', () => assert.equal(publicationAffinity(job({ category: 'Tecnología' }), prefs), 60));
test('misma región pero otra comuna suma 12 en vez de 25', () => assert.equal(publicationAffinity(job({ commune: 'La Florida' }), prefs), 87));
test('otra región no suma ubicación', () => assert.equal(publicationAffinity(job({ commune: 'Valparaíso' }), prefs), 75));
test('el objetivo distingue ofertas de solicitudes', () => {
  assert.equal(publicationAffinity(job({ kind: 'SERVICIO' }), prefs), 85);
  assert.equal(publicationAffinity(job({ kind: 'SERVICIO' }), { ...prefs, goal: 'CONTRATAR' }), 100);
  assert.equal(publicationAffinity(job({ kind: 'SERVICIO' }), { ...prefs, goal: 'AMBOS' }), 100);
});
test('precio vecino suma la mitad y lejano nada', () => {
  assert.equal(publicationAffinity(job({ budget: 60000 }), prefs), 95);
  assert.equal(publicationAffinity(job({ budget: 150000 }), prefs), 90);
});
test('disponibilidad: sin fecha suma 5 y horario incompatible resta', () => {
  assert.equal(publicationAffinity(job({ scheduledAt: null }), prefs), 95);
  assert.equal(publicationAffinity(job({ scheduledAt: new Date(2026, 10, 2, 21, 0).toISOString() }), prefs), 90);
});
test('las tildes y mayúsculas no impiden coincidir la categoría', () => assert.equal(publicationAffinity(job({ category: 'LIMPIEZA del hogar' }), prefs), 100));

const list = [
  { id: 'reciente-lejano', kind: 'SERVICIO', category: 'Música', commune: 'Arica', budget: 500000, createdAt: '2026-10-20T10:00:00Z' },
  { id: 'antiguo-afin', kind: 'OPORTUNIDAD', category: 'Limpieza', commune: 'Maipú', budget: 30000, createdAt: '2026-10-01T10:00:00Z' },
];
const score = item => publicationAffinity(item, prefs);
test('destacados con preferencias ordena por afinidad', () => assert.deepEqual(filterPublications(list, defaultPublicationFilters, [], score).map(item => item.id), ['antiguo-afin', 'reciente-lejano']));
test('sin preferencias o sin destacados se ordena por fecha', () => {
  assert.deepEqual(filterPublications(list, defaultPublicationFilters).map(item => item.id), ['reciente-lejano', 'antiguo-afin']);
  assert.deepEqual(filterPublications(list, { ...defaultPublicationFilters, featured: false }, [], score).map(item => item.id), ['reciente-lejano', 'antiguo-afin']);
});

test('selección múltiple respeta el máximo y permite quitar', () => {
  const toggle = callback('onboarding.tsx', 'toggleSelection', {});
  assert.deepEqual(Array.from(toggle(['a'], 'b', 2)), ['a', 'b']);
  assert.deepEqual(Array.from(toggle(['a', 'b'], 'c', 2)), ['a', 'b']);
  assert.deepEqual(Array.from(toggle(['a', 'b'], 'a', 2)), ['b']);
});
test('cada pregunta exige respuesta antes de continuar', () => {
  const can = callback('onboarding.tsx', 'canContinue', {});
  const empty = { goal: 'AMBOS', categories: [], regionId: null, commune: null, budgetRange: null, availability: [] };
  assert.equal(can(0, empty, false), true);
  assert.equal(can(1, empty, false), false);
  assert.equal(can(1, empty, true), true);
  assert.equal(can(2, empty, true), false);
  assert.equal(can(3, { ...empty, regionId: '13' }, true), true);
  assert.equal(can(4, empty, true), false);
  assert.equal(can(5, { ...empty, availability: ['TARDE'] }, true), true);
});

const routeAfter = status => {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(src, 'services/user-preferences.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const calls = [];
  vm.runInNewContext(code, { exports, require: () => ({ authenticatedApi: async (...args) => { calls.push(args); if (status instanceof Error) throw status; return status; } }) });
  return { route: exports.routeAfterLogin(), calls, exports };
};
test('tras el login el cuestionario aparece solo si está pendiente', async () => {
  assert.equal(await routeAfter({ completed: false, skipped: false }).route, '/onboarding');
  assert.equal(await routeAfter({ completed: true, skipped: false }).route, '/(tabs)/home');
  assert.equal(await routeAfter({ completed: false, skipped: true }).route, '/(tabs)/home');
  assert.equal(await routeAfter(new Error('Network request failed')).route, '/(tabs)/home');
});
test('guardar omite campos opcionales vacíos', async () => {
  const { exports, calls } = routeAfter({});
  await exports.savePreferences({ ...prefs, commune: null, budgetRange: null });
  assert.equal(calls.at(-1)[0], '/users/me/preferencias');
  assert.equal(calls.at(-1)[1], 'PUT');
  assert.deepEqual(Object.keys(calls.at(-1)[2]).sort(), ['availability', 'categories', 'goal', 'regionId']);
});
