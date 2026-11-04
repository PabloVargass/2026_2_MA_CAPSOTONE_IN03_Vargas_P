# ServiciosYa — Instrucciones para asistentes de desarrollo

Este documento define las reglas de trabajo para ServiciosYa. Puede usarse como `CLAUDE.md` en Claude Code o como contenido de `AGENTS.md` para Codex. No constituye una orden de implementar todo el alcance descrito.

## 1. Objetivo y fuente de verdad

ServiciosYa conecta clientes que publican servicios (mudanza, armado, limpieza, soporte y otras categorías) con trabajadores que postulan. El cliente selecciona a un trabajador.

Prioridades: preservar lo que funciona, mantener la identidad visual, proteger datos y permisos, y avanzar de forma incremental según la tarea solicitada.

- Antes de modificar, inspeccionar el repositorio y las instrucciones aplicables de sus carpetas.
- El código, los manifiestos, el lockfile, la configuración y las pruebas actuales determinan qué existe y cómo funciona. Este documento aporta contexto y reglas; no acredita implementaciones.
- Si el código difiere del contexto histórico, comunicar la diferencia. No reemplazarlo automáticamente para hacerlo coincidir con este archivo.
- Separar funcionalidades verificadas, parciales, pendientes y no verificadas. Una pantalla o una tarea de Jira terminada no demuestra por sí sola que todo el flujo funciona.
- No inventar rutas, modelos, nombres de roles, scripts, puertos, versiones, colores ni servicios de alojamiento.
- Responder en español claro y explicar los cambios para que Pablo pueda comprenderlos.

## 2. Arquitectura y tecnologías

| Capa | Contexto del proyecto | Regla |
|---|---|---|
| Aplicación móvil | React Native + Expo + TypeScript; se ha trabajado con Expo Router y navegación Stack | Verificar la navegación y las versiones instaladas antes de editar |
| Backend compartido | NestJS + TypeScript, API REST | Mantener aquí autenticación, permisos y lógica de negocio |
| Base de datos | PostgreSQL; Neon como proveedor previsto/utilizado | Verificar configuración vigente sin mostrar credenciales |
| Acceso a datos | Prisma ORM | Mantener schema, cliente y configuración compatibles con la versión instalada |
| Autenticación | JWT y bcrypt en el backend; class-validator/class-transformer para validación | Reutilizar la implementación real, comprobar su protección |
| Web de administración | Frontend separado; React/Next.js contemplado | Si ya existe, respetar su framework; si falta, elegirlo dentro del encargo de crear la web |
| Organización | Git/GitHub y Jira; desarrollo incremental | Respetar el flujo real del repositorio |

No imponer NextAuth, Tailwind, Cloudflare R2, SQL Server, ERP, librerías de PDF/Excel ni versiones copiadas de otro proyecto. No actualizar Expo, React Native, React, Prisma o TypeScript incidentalmente al arreglar una función.

Para dependencias nuevas: revisar primero lo instalado; justificar su necesidad y compatibilidad. Instalar las mínimas necesarias dentro del encargo autorizado. Consultar si implican reemplazar el stack, costos o un cambio importante de arquitectura.

## 3. Contexto de avance y alcance

### Contexto histórico disponible — verificar en el código

- Se trabajó en inicio, registro e inicio de sesión de la app móvil, validaciones y navegación Stack.
- Se creó el backend NestJS y se trabajó en JWT, bcrypt, validaciones y conexión Prisma/PostgreSQL.
- Se reportaron problemas de compatibilidad Expo/TypeScript y de inicialización de Prisma. No asumir que siguen presentes: reproducir el problema actual antes de corregir.
- Existen documentos de avances y tareas de Jira. No alterar estados ni afirmar que una función está completada sin evidencia del flujo real.
- La web administrativa fue solicitada como frontend separado, compartiendo el backend. Su estado actual debe comprobarse.

### Alcance funcional previsto — no significa que esté implementado

| Área | Funciones previstas |
|---|---|
| Usuarios | Registro, inicio/cierre de sesión, recuperación de contraseña, perfil y edición |
| Cliente | Publicar, editar, eliminar, cancelar y pausar trabajos; revisar postulantes y seleccionar trabajador |
| Trabajador | Explorar servicios, categorías/filtros, postular, retirar postulación y consultar estado |
| Servicio | Seguimiento de estados, chat, fotos de evidencia, calificaciones y comentarios |
| Administración | Acceso restringido, listar/agregar usuarios y gestionar roles; otras funciones según requerimiento |

Implementar solo la tarea solicitada y sus dependencias necesarias. Reutilizar funciones existentes y evitar duplicarlas.

## 4. Carpetas y separación de responsabilidades

Se conocen las carpetas `mobile/`, `backend/` y documentación en `Fase 1/`; confirmar sus nombres y ubicación actuales. La carpeta de administración debe ser independiente del móvil, dentro de la raíz acordada del proyecto. Si ya existe, conservar su nombre.

Desde noviembre de 2026 `backend/`, `mobile/` y `web-admin/` comparten un único repositorio Git en la raíz `capstone-servicios/`, rama de trabajo `develop`. La documentación de entrega (`.temp-entrega-github/`, `output/`, `documentacion/`) queda fuera de este repositorio.

Ejemplo orientativo, no orden de reorganización:

```text
ServiciosYa/
  AGENTS.md
  mobile/             # aplicación Expo
  backend/            # API NestJS y acceso Prisma
  web-admin/          # frontend administrativo (Next.js)
  Fase 1/             # documentación existente, si corresponde
```

- No mover carpetas ni renombrar archivos masivamente para ajustarse al ejemplo.
- En NestJS, seguir los módulos, controllers, services, DTOs y guards existentes.
- En los frontends, separar pantallas, componentes, acceso a API, tipos y estilos conforme a sus convenciones. Evitar una aplicación completa dentro de un archivo.
- Los frontends consumen la API: nunca incluir Prisma, credenciales de BD o consultas directas a PostgreSQL en móvil o navegador.
- Evitar lógica de negocio duplicada en móvil y administración. Validarla en el backend.
- Respetar los aliases reales del `tsconfig`; no imponer `@shared` o `@modules` del archivo original.
- Evitar ciclos y acoplamiento innecesario. En NestJS, usar imports/exports e inyección de dependencias cuando los módulos necesitan colaborar.

## 5. Preservación visual y experiencia de uso

La apariencia actual de ServiciosYa es la referencia. Corregir una función no autoriza a rediseñar la aplicación.

- Revisar primero temas, tokens, componentes y pantallas cercanas.
- Conservar colores exactos, logo, tipografías, tamaños, márgenes, bordes, sombras, iconos, textos, botones y comportamiento de navegación, salvo cambio solicitado o corrección necesaria.
- No inventar una nueva paleta ni copiar la identidad de Blunding.
- Mantener cabeceras, flechas de volver, formularios y patrones existentes. No cambiar Stack por Tabs u otro sistema sin una razón vinculada al encargo.
- Reutilizar componentes existentes antes de crear variantes casi iguales.
- En la administración, trasladar la identidad de ServiciosYa a un diseño apropiado para escritorio y móvil; no copiar literalmente la disposición de una pantalla de celular.
- Mantener estados de carga, vacío, error, éxito y controles para evitar envíos repetidos.
- Comprobar teclado, scroll, áreas seguras y tamaños de pantalla en móvil; accesibilidad y adaptación de la web.
- Usar el modal nativo o componente existente en React Native. En web, usar el patrón del proyecto y portales cuando resuelvan problemas de superposición; no usar `document.body` en código nativo.
- Si un cambio modifica visiblemente una pantalla, compararla con su referencia cuando se disponga de ella. Si no puede verificarse visualmente, decirlo.

## 6. API y compatibilidad

- Inspeccionar endpoints, DTOs, códigos de respuesta y consumidores antes de cambiarlos.
- No romper móvil al agregar administración. Mantener contratos existentes o adaptar todos los consumidores afectados en la misma tarea.
- Centralizar la URL de la API en la configuración existente, diferenciando desarrollo y despliegue.
- En un teléfono físico, `localhost` apunta al teléfono. Revisar el entorno antes de proponer una URL; no asumir una IP fija.
- Validar entradas en el servidor, aunque el frontend también las valide. Rechazar campos no permitidos conforme a la configuración de DTOs.
- Usar paginación y filtros en listados cuando sea necesario; devolver solo los campos requeridos.
- Mantener mensajes claros y el formato de errores del proyecto. No exponer trazas, secretos o detalles internos al usuario.
- Las operaciones relacionadas que deban ser atómicas deben ejecutarse en una transacción, con restricciones de BD cuando corresponda.

## 7. Autenticación, permisos y datos personales

- Reutilizar JWT/bcrypt del backend; no añadir un segundo sistema de usuarios para la web.
- Comprobar firma y expiración del token, configuración segura y tratamiento de usuarios inactivos según el modelo vigente.
- Guardar contraseñas mediante hash; nunca texto plano. No devolver hashes ni tokens sensibles en listados o logs.
- No asumir que cerrar sesión revoca inmediatamente un JWT. Verificar el mecanismo real y explicar su alcance; no inventar refresh tokens o una lista de revocación ya implementada.
- Si la tarea incluye recuperación, verificar tokens temporales, de un solo uso, con almacenamiento seguro y respuestas que eviten revelar si una cuenta existe.
- El backend autoriza cada acción protegida. Ocultar un botón o bloquear una ruta del frontend solo complementa ese control.
- Verificar tanto rol/permiso como propiedad y participación en el recurso: un cliente no edita trabajos ajenos; un trabajador no modifica postulaciones de otro; el chat y las evidencias solo se acceden con autorización.
- Derivar la identidad del usuario autenticado, no confiar en un `userId` enviado por el cliente para autorizar acciones.
- Usar los roles reales del schema. No asumir que un usuario tiene un único rol ni crear enums nuevos sin revisar el modelo.
- El registro público no puede asignarse permisos administrativos. Validar cambios de rol en el servidor y evitar asignación masiva de campos privilegiados.
- La administración necesita controles de acceso reales para crear usuarios, editar datos y cambiar roles. Proteger la continuidad del acceso administrativo según el modelo vigente.
- Registrar acciones administrativas sensibles con actor, recurso, fecha y resultado cuando se implementen esos flujos; no registrar contraseñas o tokens.
- Revisar qué ocurre con los permisos al cambiar un rol mientras existe una sesión. Aplicar el mecanismo vigente o resolver el riesgo dentro de la tarea.
- Mantener la sesión móvil mediante el almacenamiento seguro existente. Para web, evaluar el mecanismo real; si usa cookies, revisar HttpOnly, Secure, SameSite y protección CSRF según corresponda.
- CORS debe admitir los orígenes necesarios para el entorno; no abrir acceso indiscriminado con credenciales.
- Para archivos/fotos, validar tamaño, tipo y acceso en el servidor. No confiar solo en la extensión o en controles del frontend.

## 8. Reglas de negocio de ServiciosYa

Confirmar estados y transiciones reales antes de editar servicios. No crear un flujo paralelo con nuevos nombres de estados.

- Solo el cliente autorizado puede gestionar su publicación; las acciones de administración deben tener permisos explícitos.
- El alcance prevé eliminar trabajos sin postulaciones activas. Verificar qué cuenta como activa y preservar las reglas existentes.
- Distinguir pausar, cancelar y eliminar: no tratarlos como la misma operación.
- Verificar que la publicación admita postulaciones antes de postular. Evitar duplicados activos, con controles que cubran solicitudes simultáneas.
- El trabajador solo puede retirar su propia postulación y dentro del estado permitido.
- La selección de trabajador debe mantener consistentes trabajo y postulaciones; evitar asignaciones incompatibles por concurrencia.
- Respetar requisitos de acceso al chat, evidencia y calificación. Si están pendientes de definición, no inventarlos como hechos existentes.
- No agregar pagos, comisiones, geolocalización, IA o nuevas integraciones sin que formen parte del encargo.

## 9. Base de datos y Prisma

- Inspeccionar `schema.prisma`, configuración, migraciones y versión instalada antes de ejecutar comandos.
- Mantener los nombres y relaciones existentes. Añadir `createdAt`/`updatedAt`, índices y restricciones donde correspondan, sin renombrar tablas solo por estilo.
- Identificar el entorno de destino sin imprimir la cadena de conexión. No ejecutar escrituras si no se puede determinar que el destino es apropiado.
- Usar una BD de desarrollo aislada para cambios y pruebas. No asumir que ya existen ramas Neon ni bases por desarrollador.
- Si hay migraciones versionadas, seguir Prisma Migrate y revisar el SQL generado. No editar migraciones ya aplicadas como forma de corregir el historial.
- Si falta un historial fiable, evaluar baseline y estado real antes de inicializarlo. No ejecutar `migrate resolve --applied` sin comprobar que el schema coincide.
- `prisma migrate dev` corresponde a desarrollo verificado; puede solicitar un reset: no aceptarlo automáticamente si hay datos que conservar.
- `prisma migrate deploy` aplica migraciones versionadas en el entorno de despliegue autorizado; este documento no autoriza ejecutarlo en producción.
- `prisma generate` regenera el cliente, no aplica cambios de schema a la BD. Usar los comandos compatibles con la versión y los scripts del proyecto.
- No usar `db push` en producción o entornos compartidos; reservarlo, si hace falta, para una BD explícitamente descartable, sin sustituir el historial de migraciones del proyecto.
- No ejecutar reset, borrados masivos, `--accept-data-loss`, drop de tablas o cambios destructivos sin autorización específica y un plan para los datos.
- No aplicar cambios manuales de schema que dejen la BD y el historial divergentes.
- Para migraciones de datos, preparar scripts revisables e idempotentes, con vista previa o dry-run cuando corresponda, y recuperación adecuada al riesgo.
- Mantener seeds seguros e idempotentes; no crear administradores con contraseñas fijas ni ejecutar seeds de prueba en producción.
- Al entregar una migración, indicar archivos, impacto en los datos y pasos necesarios para aplicarla. No asumir un pipeline automático existente.

## 10. Secretos y configuración

- No subir `.env`, credenciales Neon, claves JWT, tokens de recuperación o claves de proveedores al repositorio.
- Leer solo lo necesario para diagnosticar y no mostrar valores sensibles en respuestas o logs.
- Documentar nombres de variables en `.env.example` con valores vacíos o ejemplos claramente ficticios. Respetar los nombres ya usados por el código.
- Toda variable incluida en el bundle móvil o web público debe considerarse pública. Nunca colocar allí secretos del backend.
- Si se descubre un secreto expuesto, comunicarlo sin reproducirlo y recomendar su rotación; no basta con borrar el archivo actual.
- No copiar variables `NEXTAUTH_*`, `R2_*`, `ERP_*`, SMTP o claves de IA del original si el proyecto no las utiliza.

## 11. Git y protección del trabajo existente

- Antes de editar, revisar rama y `git status`. Conservar cambios del usuario y no sobrescribir trabajo ajeno.
- Respetar el flujo real. No imponer Git Flow, `develop`, ramas release ni protecciones inexistentes.
- No hacer checkout, pull o reorganización de ramas automáticamente si puede afectar cambios en curso. Usar una rama de trabajo cuando corresponda al encargo y al repositorio.
- Evitar `reset --hard`, `clean -fd`, force push y borrado de ramas sin autorización específica.
- Mantener cambios pequeños y relacionados con la tarea. Evitar formatear todo el proyecto.
- Antes de staging/commit, revisar el diff y excluir secretos, archivos temporales y cambios ajenos. Añadir archivos de forma selectiva.
- No imponer commit/push diario ni publicar trabajo incompleto. Hacer commits, push, PR, merge y despliegues conforme a lo solicitado y al flujo autorizado.
- No enviar mensajes a personas ni modificar Jira por cuenta propia. Preparar texto de coordinación si hace falta.

## 12. Validación y forma de trabajar

1. Entender el objetivo y examinar las áreas afectadas: móvil, backend, administración y BD.
2. Revisar instrucciones locales, scripts y estado del repositorio. Detectar lo ya resuelto antes de proponer código nuevo.
3. Para un error, intentar reproducirlo y localizar su causa; no cambiar arquitectura por una suposición.
4. Explicar brevemente el enfoque cuando el cambio sea relevante y avanzar en las acciones autorizadas.
5. Aplicar la solución mínima que satisfaga la tarea, preservando contratos, diseño y seguridad.
6. Ejecutar los checks apropiados que existan (tipos, lint, tests, build) para las áreas modificadas. No inventar scripts ni afirmar resultados que no se ejecutaron.
7. Para autenticación, permisos y estados, comprobar casos autorizados y denegados, datos inválidos y efectos sobre consumidores. Añadir pruebas de regresión útiles cuando el riesgo lo justifique.
8. Para cambios visuales, comprobar la pantalla y sus interacciones cuando el entorno lo permita. No afirmar que Android/iOS funciona si solo se compiló TypeScript.
9. Revisar el diff final y comunicar cambios, validación, limitaciones y pasos pendientes.

No bloquear ajustes rutinarios y reversibles con consultas innecesarias. Pedir aclaración cuando falte una decisión de negocio que cambie la solución, haya instrucciones incompatibles o una acción destructiva no esté autorizada. Continuar las partes independientes que sí se puedan resolver.

## 13. Servidores y despliegue

- Determinar comandos de arranque desde los `package.json` y documentación actuales; respetar el gestor de paquetes y lockfile.
- Verificar directorio, puerto y procesos existentes antes de levantar servidores. No detener procesos ajenos.
- Reiniciar el proceso afectado cuando su configuración lo requiera.
- Si un build y un dev server comparten artefactos, evitar ejecutarlos simultáneamente o usar salidas aisladas; limpiar solo artefactos identificados y necesarios.
- No asumir Render, Vercel, servidor Windows, NSSM, Caddy o publicación Play Store ya configurados.
- La preparación de despliegue debe contemplar variables, HTTPS, CORS, conexión BD, migraciones y pruebas en el entorno real.
- Publicar, ejecutar migraciones en producción o contratar servicios requiere que esa acción esté incluida en la autorización de la tarea. Preparar primero los cambios revisables y el procedimiento.

## 14. Entrega al usuario

Informar de forma clara:

- Qué problema se resolvió y cómo cambia el comportamiento.
- Qué archivos o áreas se modificaron y por qué.
- Si cambió el diseño, contrato API, modelo de datos o permisos, y cómo afecta al resto del sistema.
- Qué se comprobó, con qué resultado y qué no pudo comprobarse.
- Si hay migraciones, configuración o comandos pendientes, con el directorio correcto y sin credenciales.

No declarar «todo terminado» si hay bloqueos. No marcar funcionalidades como logradas solo porque existen archivos. Mantener estas reglas actualizadas cuando se confirme un cambio real, sin convertir decisiones futuras en hechos implementados.
