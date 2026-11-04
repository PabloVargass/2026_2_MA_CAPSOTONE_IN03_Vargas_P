# ServiciosYa: revisión del móvil y plan de validación

> La revisión más reciente está en [AUDITORIA_FLUJOS_2026-10-11.md](AUDITORIA_FLUJOS_2026-10-11.md): incluye ciclo actual, pruebas, fallos confirmados y checklist. Los apartados siguientes conservan su contexto histórico.

Revisión del 10 de octubre de 2026. Esta lista distingue código presente de
funcionamiento comprobado en un teléfono. No acredita que la app esté terminada.

## Estado de los módulos

| Módulo | Evidencia actual | Pendiente de validar o implementar |
| --- | --- | --- |
| Registro y verificación | Pantallas y endpoints de registro, verificación y reenvío | Registro real, recepción del correo, expiración y uso único del código |
| Login y sesión | Login local, almacenamiento SecureStore y guard JWT con cuenta activa/versionSesion | Login en teléfono, sesión expirada, reinicio y navegación; logout móvil elimina la sesión local, no revoca todos los JWT |
| Google | SDK nativo y endpoint de validación | Build Android y configuración OAuth; nuevas cuentas necesitan completar RUT según el backend actual |
| Recuperación | Pantallas de solicitud, código y contraseña; endpoints correspondientes | Correo real, vencimiento, reutilización y efecto sobre sesiones |
| Perfil | Perfil propio, edición y perfil público conectados a API | Persistencia tras editar, permisos y actualización de la información almacenada localmente |
| Publicar y editar | POST /jobs y PATCH /jobs/:id; permisos del propietario | Flujo real, validación de categorías/presupuesto y errores de sesión; edición permitida en PUBLICADO |
| Inicio, búsqueda y descubrir | Listados de trabajos y usuarios, navegación al detalle y postulaciones | Filtros, resultados vacíos, recarga, conexión interrumpida y consistencia entre pantallas |
| Postulaciones | Crear, revisar recibidas, aceptar y rechazar | Flujo con dos usuarios y solicitudes simultáneas; retirar postulación no tiene endpoint |
| Mis trabajos | Listado propio, iniciar y completar | Ciclo real PUBLICADO → ASIGNADO → EN_PROCESO → COMPLETADO, permisos y cambios simultáneos |
| Chat | Conversaciones, lectura y envío, restricciones a participantes | Lectura marca mensajes leídos en BD; recepción de nuevos mensajes mientras la pantalla está abierta está parcial: carga inicial y actualización local al enviar, sin sondeo/suscripción remota en esa pantalla |
| Calificaciones | Pantalla y endpoint ligados a trabajo completado y participantes | Calificar con dos usuarios, impedir duplicados y validar resúmenes/perfil |
| Preferencias | Tema e idioma con persistencia | Pruebas automatizadas pasan; comprobar apariencia, teclado y accesibilidad en teléfono |
| Pausar, cancelar y eliminar | No se encontraron endpoints del cliente para estas acciones | Definir transiciones y restricciones, implementar backend y controles móviles |
| Fotos de evidencia | No se encontró flujo de carga ni endpoint de archivos | Definir almacenamiento, acceso, tamaño/tipo y reglas del servicio antes de implementar |

## Comprobaciones ejecutadas

- `mobile`: `npx tsc --noEmit`, sin errores.
- `mobile`: `node --test scripts/test-my-jobs.cjs scripts/test-app-preferences.cjs`,
  14 pruebas aprobadas. Ejecutan lógica con dependencias simuladas; no son pruebas
  de Android, red real ni del ciclo completo del servicio.
- En la revisión anterior del backend: 13 pruebas HTTP aisladas de privacidad y
  sesión aprobadas y build correcto. No se repitieron en esta revisión del móvil.

No se han creado cuentas, enviado correos ni escrito datos de prueba en Neon
durante esta revisión. No se ha comprobado visualmente la app en un teléfono.

## Orden de trabajo

1. Preparar una BD de desarrollo aislada y configuración de API por entorno.
   El `.env` actual del backend apunta a la base recién trasladada, que debe conservarse.
2. Validar registro, verificación, login, recuperación, perfil y sesión en Android.
3. Validar publicación → postulación → selección → chat → inicio → término → reseña
   con dos cuentas de prueba. Corregir errores reproducidos y cubrir permisos.
4. Completar gestión de trabajos y retiro de postulaciones conforme a reglas acordadas.
5. Completar actualización de chat y evidencia fotográfica; comprobar pantallas
   pequeñas, teclado, carga, vacío, errores y envíos repetidos.
6. Crear una versión estable revisada, probarla y después publicarla.

## Git y entornos

La raíz no es un repositorio único. `mobile` y `backend` son repositorios separados.
Se preparó `develop` en ambos, conservando archivos y cambios locales.
En móvil `master` conserva únicamente el commit inicial; no representa una versión
estable de la app actual. Backend tiene una rama `develop` sin commits todavía.

Los cambios sin commit no están protegidos por la mera creación de una rama.
Antes del primer commit revisar archivos y secretos, excluir respaldos y configuración
privada y guardar selectivamente el código del proyecto. No se hicieron commits ni push.

Cuando exista una versión validada, crear `main` desde ese commit y configurar
el despliegue de producción para seguir solo `main`. Mantener desarrollo en `develop`.
El nombre de rama no separa bases, credenciales ni servicios: cada entorno necesita
su configuración propia. Todavía no se creó `main` ni un entorno de producción.

## Pruebas posteriores en Pixel_8, rama de desarrollo

La base de desarrollo ya está configurada en `.env.development.local`, con un destino
distinto de la principal y diez migraciones al día. La app se recompiló e instaló
correctamente. Un bloqueo del emulador acompañado por un aviso de Google Play services
se resolvió tras arrancarlo en frío con gráficos por software; se verificó el inicio.

Pruebas realizadas desde la interfaz con la sesión iniciada por el usuario:

- Perfil: datos visibles, edición del nombre, confirmación de guardado y persistencia
  al reabrir la edición. Se restauró el nombre original y se comprobó en la cabecera.
- Publicar: envío con formulario vacío rechazado con aviso de campos incompletos.
- Mensajes: carga y estados vacíos de chats y solicitudes pendientes.
- Explorar: carga de cuatro trabajos existentes y apertura del detalle de un trabajo
  ficticio de prueba. No se postuló ni se contactó a su propietario.
- Mis trabajos: resumen y estados vacíos de Publicados y Postulados.
- Se encontró bajo contraste en el texto seleccionado de Mis trabajos en modo oscuro.
  Se corrigió `activeTabText` para usar `colors.text` sobre `colors.surface`, sin
  modificar distribución, datos o contratos. Verificado visualmente en el emulador.
- Tras la corrección: TypeScript sin errores y 14 pruebas móviles aprobadas.

Estas pruebas no acreditan el ciclo completo: publicación válida, edición del trabajo,
postulación, aceptación/rechazo, chat entre cuentas, inicio, término y reseña permanecen
pendientes de validación con dos cuentas de prueba. Registro, correos, recuperación,
Google y persistencia de sesión tras reinicio tampoco se probaron en esta ronda.

## Ciclo completo posterior

El 10 de octubre se ejecutó el ciclo real por API contra Neon develop con cuentas
ficticias: publicación, postulación, aceptación, rechazo automático, chat, inicio,
finalización y reseñas. La ejecución final aprobó 30 comprobaciones, incluidos
permisos, estados inválidos y duplicados; la persistencia terminó en COMPLETADO.
En Android se comprobaron acceso, perfil, publicación completada y chat, incluyendo
un envío desde la app. El cliente no encuentra su publicación completada en
Finalizados: esa lista actual solo considera al usuario como trabajador.
Detalles, diferencias y límites en `FULL_CYCLE_TESTS.md`.

Las dos diferencias anteriores se corrigieron posteriormente: Finalizados incluye
al cliente y al trabajador; el chat consulta automáticamente cada tres segundos
con la pantalla abierta y la app activa. Se verificaron en Android el contador y la
tarjeta del cliente, y la llegada de una respuesta sin reabrir la conversación.
TypeScript, 14 pruebas móviles, prueba de regresión backend y lint localizado pasan.

## Publicaciones y servicios ofrecidos

Se incorporaron fecha y hora, vencimiento configurable entre 3 y 24 horas,
separación de oportunidades y servicios, catálogo por prestador y solicitudes
con precio aceptado o contraoferta pendiente en el chat. Las contrataciones
acordadas continúan aunque venza la publicación original. La migración se
aplicó solo en develop. Comportamiento, pruebas y limitaciones en `PUBLICATIONS.md`.

## Identidad y administración móvil

Se quitaron las duraciones personalizadas. Publicar requiere identidad aprobada,
excepto para administradores activos. El móvil permite enviar fotos privadas y
administrar solicitudes, cuentas, publicaciones y auditoría usando el backend
existente. Migración aplicada en develop y Android recompilado con selector de
fotos. El certificado admite también PDF privado de hasta 2 MB sin contraseña;
Android incluye selector de documentos y visor con páginas y zoom. Se verificó
la subida por API y el visor en el emulador. Comprobaciones, límites e incidente
de la suite e2e antigua en `IDENTITY_ADMIN.md`.
