# ServiciosYa — Evidencias de sistema

## Version 3.0

Copia del código del 4 de noviembre de 2026, exportada desde los commits del repositorio de desarrollo (rama develop). Solo incluye archivos versionados.

- Aplicacion movil/Version 3.0: aplicación React Native y Expo, código fuente, recursos, lockfile y scripts de prueba. No incluye APK ni carpetas nativas generadas.
- Pagina Web/Version 3.0: administración Next.js, código fuente y lockfile.
- Base de datos/Version 3.0: esquema Prisma, 14 migraciones, backend NestJS compartido y el mismo catálogo inicial de 39 categorías de la versión 2.0.

Novedades respecto de la versión 2.0:

- Retiro de postulaciones pendientes por el propio trabajador (PATCH /postulaciones/:id/retirar), protegido ante una aceptación simultánea.
- Mis trabajos solo muestra el chat de la postulación propia.
- Cuestionario inicial de afinidad: objetivo, categorías, región y comuna, rango de precios y disponibilidad. Se muestra tras el primer ingreso, puede omitirse y editarse desde Perfil. Las recomendaciones de Inicio y Buscar se ordenan con ese puntaje. Requiere la migración 20261027120000_preferencias_usuario.
- Correcciones de la auditoría del 11 de octubre: cierre de sesiones al recuperar contraseña, sin correo del dueño en el detalle público, validación de fechas, textos y comunas, y exclusión de cuentas bloqueadas en Personas.

Se excluyen dependencias instaladas, compilaciones, archivos de entorno privados, datos de ejecución, documentos de identidad y cuentas de prueba. Se revisó la ausencia de credenciales antes de publicar.

### Validación

En el repositorio de desarrollo pasaron 133 pruebas del backend, 44 pruebas del móvil y la verificación de TypeScript del backend, el móvil y la web. Retiro de postulación y cuestionario de afinidad se recorrieron en el emulador Android contra la base de desarrollo. No se realizó una instalación nueva ni una prueba completa del sistema desde estas carpetas de evidencia.

## Version 2.0

Copia del código local del 14 de octubre de 2026.

- Aplicacion movil/Version 2.0: aplicación React Native y Expo, código fuente, recursos y lockfile. No incluye APK ni carpetas nativas generadas.
- Pagina Web/Version 2.0: administración Next.js, código fuente y lockfile.
- Base de datos/Version 2.0: esquema Prisma, migraciones, backend NestJS compartido y catálogo inicial de 39 categorías. No es un respaldo de registros personales.

Se excluyen dependencias instaladas, compilaciones, archivos de entorno privados, datos de ejecución, documentos de identidad y cuentas de prueba. Las versiones 2.0 son etiquetas de esta entrega; se conservan las versiones de los manifiestos originales.

## Preparación

Usar la carpeta de la versión deseada (Version 3.0 o Version 2.0).

1. En Base de datos/Version X/backend ejecutar npm ci. Completar la configuración privada del backend según su README. Ejecutar npm run prisma:generate; aplicar migraciones solo a una base de desarrollo autorizada mediante npx prisma migrate deploy.
2. En esa base ejecutar catalogo/categorias-sugeridas.sql para registrar el catálogo sin alterar las categorías existentes. Configurar .env.development.local según scripts/start-development.cjs y ejecutar npm run start:dev.
3. En Aplicacion movil/Version X ejecutar npm ci, configurar .env.local desde .env.example y ejecutar npx expo start. El ejemplo de URL corresponde al emulador Android.
4. En Pagina Web/Version X ejecutar npm ci, configurar .env.local desde .env.example y ejecutar npm run dev.

## Validación de la versión 2.0

Se verificó la copia de los archivos y la exclusión de secretos antes de publicar. Las 39 categorías fueron verificadas en la base de desarrollo durante esa sesión. No se realizó una instalación nueva ni una prueba completa del sistema desde estas carpetas de evidencia. Los servicios locales se cerraron a petición del usuario.
