const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, '.env.development.local');
// --rapido: reutiliza dist/ si está al día (sin recompilar ni vigilar cambios).
const fast = process.argv.includes('--rapido');
const builtEntry = path.join(root, 'dist', 'src', 'main.js');

function newestSourceTime() {
  let newest = 0;
  const visit = (target) => {
    if (!fs.existsSync(target)) return;
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(target)) visit(path.join(target, name));
    } else {
      newest = Math.max(newest, stat.mtimeMs);
    }
  };
  for (const name of ['src', 'generated', 'prisma.config.ts', 'tsconfig.json', 'tsconfig.build.json', 'nest-cli.json']) {
    visit(path.join(root, name));
  }
  return newest;
}

function buildIsCurrent() {
  return fs.existsSync(builtEntry) && fs.statSync(builtEntry).mtimeMs >= newestSourceTime();
}

function endpoint(value) {
  const url = new URL(value);
  return `${url.hostname.replace('-pooler.', '.')}|${url.pathname}`;
}

try {
  const config = dotenv.parse(fs.readFileSync(configPath));
  for (const key of ['DATABASE_URL', 'JWT_SECRET', 'EMAIL_USER', 'EMAIL_APP_PASSWORD']) {
    if (!config[key]?.trim()) throw new Error(`Falta ${key} en .env.development.local.`);
  }
  const primaryPath = path.join(root, '.env');
  if (!fs.existsSync(primaryPath)) {
    throw new Error('No se puede contrastar el destino de desarrollo con la conexión principal.');
  }
  const primary = dotenv.parse(fs.readFileSync(primaryPath));
  if (!primary.DATABASE_URL) throw new Error('No se puede identificar la conexión principal.');
  let same;
  try {
    same = endpoint(config.DATABASE_URL) === endpoint(primary.DATABASE_URL);
  } catch {
    throw new Error('Una conexión de base de datos tiene formato inválido.');
  }
  if (same) throw new Error('Desarrollo no puede usar el mismo servidor y base que la conexión principal.');

  console.log('Iniciando desarrollo con configuración local y destino distinto del principal.');
  const nestCli = require.resolve('@nestjs/cli/bin/nest.js');
  let args = [nestCli, 'start', '--watch'];
  if (fast) {
    if (buildIsCurrent()) {
      console.log('Modo rápido: dist/ está al día, se omite la compilación.');
    } else {
      console.log('Modo rápido: hay cambios en el código, compilando una vez...');
      const build = spawnSync(process.execPath, [nestCli, 'build'], { cwd: root, stdio: 'inherit' });
      if (build.status !== 0) throw new Error('La compilación falló; revisa los errores anteriores.');
    }
    args = [builtEntry];
  }
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: { ...process.env, ...config, NODE_ENV: 'development' },
    stdio: 'inherit',
  });
  child.on('error', () => {
    console.error('No se pudo iniciar NestJS.');
    process.exitCode = 1;
  });
  child.on('exit', (code) => { process.exitCode = code ?? 1; });
} catch (error) {
  console.error(error instanceof Error ? error.message : 'No se pudo cargar la configuración de desarrollo.');
  process.exitCode = 1;
}
