# ServiciosYa — checklist de flujos y hallazgos

Revisión realizada el 11 de octubre de 2026, hora de Chile. El núcleo del ciclo funciona en desarrollo, pero la app todavía tiene fallos y funcionalidades pendientes antes de considerarla terminada.

## Alcance y significado de los estados

- **Comprobado:** se ejecutó una prueba; la columna de evidencia indica si fue API/BD, prueba aislada o pantalla Android.
- **Parcial:** existe y funciona una parte, pero tiene limitaciones concretas.
- **Pendiente:** no se encontró implementación del flujo.
- **Sin comprobar:** existe código o una configuración prevista, pero no se ejecutó esa experiencia completa.

Se revisó el código actual del móvil, el backend y sus pruebas. Backend local y Neon de desarrollo, separados de la conexión principal. Los comprobadores contrastan destinos y secretos; los ciclos contra el servidor validan la firma de los JWT con el secreto de desarrollo. No se hicieron migraciones, despliegues, borrados ni cambios en producción durante esta revisión.

Se conservaron la sesión del administrador que estaba abierta en Android y los cambios locales existentes. Las escrituras de prueba afectaron cuentas, documentos y publicaciones ficticias. La prueba de registro/recuperación reemplazó el envío de correo por un servicio en memoria: ningún correo fue enviado por ella. Los datos ficticios permanecen en develop; las publicaciones de las pruebas adicionales de validación se retiraron al terminar. No se modificó el código funcional para corregir los hallazgos de esta auditoría.

## Pruebas ejecutadas

| Comprobación | Resultado |
| --- | --- |
| Backend, `npm test -- --runInBand` | 104 pruebas, 19 suites, pasan |
| Móvil, cuatro scripts `node --test` | 27 pruebas, pasan |
| HTTP aislado, solo `users-privacy` y `mis-trabajos` | 13 pruebas, 2 suites, pasan; Prisma simulado |
| TypeScript móvil y backend, `npx tsc --noEmit` | Ambos pasan |
| Identidad y administración sobre develop | 44 comprobaciones, pasan |
| Ciclo de trabajo sobre API y BD reales de desarrollo | 30 comprobaciones, pasan; COMPLETADO, 2 mensajes, 2 reseñas |
| Servicios ofrecidos, ofertas y vencimiento sobre develop | 49 comprobaciones, pasan |
| Registro, perfil y recuperación con BD develop y correo simulado | 22 comprobaciones, pasan; además se confirmó que la sesión anterior sigue vigente después del cambio de contraseña |
| Certificado PDF privado sobre develop | 19 comprobaciones, pasan |
| Sondeos adicionales: duraciones, edición, moderación y validaciones | 29 comprobaciones ejecutadas, incluyendo entradas que revelaron fallos; no equivalen a 29 casos correctos |
| Lint backend, sin `--fix` | Falla: 702 errores y 13 advertencias. 684 errores son de formato; 18 corresponden a reglas adicionales |
| Lint móvil | Sin configurar: no hay ESLint local ni configuración propia |

En total: **144 pruebas automáticas aisladas pasan** y **193 comprobaciones de flujos/sondeos adicionales se ejecutaron**, con los hallazgos descritos más abajo. No se ejecutó la suite antigua `app.e2e-spec.ts`: requiere una BD exclusiva de pruebas y no debe apuntar a la principal ni al develop compartido. Algunas pruebas unitarias antiguas solo comprueban que una clase se inicializa; el número de pruebas no demuestra cobertura completa.

## Checklist por módulo

| Estado | Función | Qué se comprobó o qué falta |
| --- | --- | --- |
| [x] Comprobado | Registro con nombre, RUT, correo, teléfono y contraseña | Registro real en instancia de prueba conectada a develop; RUT inválido, duplicados y asignación pública de ADMIN rechazados. Contraseña guardada con bcrypt, rol USUARIO |
| [x] Comprobado | Verificación de correo | Código correcto habilita login; incorrecto se rechaza. Código capturado por correo simulado |
| [ ] Sin comprobar | Recepción de correo, reenvío y expiración en una casilla real | Falta recorrerlo con correo entregado y comprobar vencimiento real; no se envió correo a terceros |
| [x] Comprobado | Login con contraseña | Cuentas ficticias entran; contraseña incorrecta, correo pendiente y cuenta bloqueada se rechazan |
| [ ] Sin comprobar | Continuar con Google | SDK y endpoint presentes. No se hizo autenticación OAuth real ni validación de configuración de un build distribuido |
| [~] Parcial | Sesión y cierre de sesión | SecureStore y guards presentes; cuenta activa y versión de sesión comprobadas. Logout móvil elimina almacenamiento local; no revoca por sí mismo el JWT en el servidor |
| [~] Parcial | Recuperación de contraseña | Solicitud genérica, código, token temporal, cambio, contraseña anterior rechazada y reutilización rechazada funcionan con correo simulado. **La sesión anterior al cambio sigue autorizada** |
| [x] Comprobado | Perfil propio y edición | API persiste nombre y teléfono; rechaza campos privilegiados. Pantalla de perfil Android abre correctamente. No se editó el perfil real abierto en el emulador |
| [~] Parcial | Perfil público | Datos públicos y reseñas tienen pruebas de privacidad. El bloque «Sobre este usuario» es fijo y no hay campo para editar una biografía |
| [~] Parcial | Personas | Listado y navegación implementados. **Incluye usuarios bloqueados**, confirmado cruzando listado administrativo y público |
| [x] Comprobado | Publicar solicitud u oferta de servicio | Ambas clases se crean por API; catálogo de servicios de un prestador devuelve sus ofertas y las separa de solicitudes |
| [x] Comprobado | Duraciones 3, 6, 12 y 24 horas | Las cuatro opciones se aceptan; valores ajenos se rechazan en servidor. No hay duración libre |
| [x] Comprobado | Fecha/hora y vencimiento | Fechas persistidas; vencidos desaparecen del listado y no aceptan nuevas postulaciones/solicitudes. Los contratos acordados continúan al vencer la publicación original |
| [x] Comprobado | Publicar exige identidad aprobada | Usuario sin identidad o pendiente recibe 403 incluso con petición directa; aprobación habilita publicar. ADMIN puede publicar sin documentos |
| [~] Parcial | Validaciones de publicación | Presupuesto, tipo y duraciones inválidos y campos privilegiados se rechazan. **Espacios, comuna inexistente y fecha inválida tienen fallos**, ver tabla de hallazgos |
| [x] Comprobado | Editar publicación | Edición propia por API funciona; edición ajena se rechaza. Solo publicaciones PUBLICADO y no contratos derivados. Duración se calcula desde creación original |
| [x] Comprobado | Categorías y ubicación en Publicar/filtro | Catálogo compartido de 39 sugerencias con emoji, más categorías existentes; 16 regiones y 346 comunas. Pruebas comprueban selección compatible, envío y limpieza del formulario. Región solo se conserva en selección; API persiste comuna |
| [x] Comprobado | Filtros | Tipo, categoría escrita, región/comuna y destacados pasan pruebas de combinación y orden; filtrado actual ocurre en móvil |
| [~] Parcial | Recomendados por afinidad | Funciona el orden y su interruptor. **Puntuación fija por comuna, presupuesto y categoría; no usa intereses ni ubicación del usuario** |
| [x] Comprobado | Postular y revisar postulantes | Sin sesión, duplicado, propio trabajo y publicación vencida se rechazan; dos postulantes y selección por dueño se probaron |
| [x] Comprobado | Seleccionar trabajador | Aceptación crea conversación y rechaza al otro postulante. Tercero no puede seleccionar |
| [x] Comprobado | Solicitar servicio al precio publicado | Acuerdo y chat se crean inmediatamente; duplicado y contratación propia se rechazan |
| [x] Comprobado | Contraoferta | Importe alternativo crea chat pendiente; prestador acepta/rechaza; tercero no responde y no se puede responder dos veces |
| [x] Comprobado | Chat y permisos | Ambos participantes enviaron/leyeron mensajes; tercero recibió 403. Código marca mensajes leídos y sondea nuevos mensajes cada 3 segundos mientras la pantalla está activa |
| [~] Parcial | No leídos y conexión intermitente | Hay contador con consulta periódica. **Android mostró un aviso «Error cargando mensajes no leídos: TypeError…»**; causa no aislada. No se considera demostrado que el chat esté roto por este aviso |
| [x] Comprobado | Mis trabajos, iniciar y completar | API devuelve historial para ambos. Inicio autorizado, rechazo de tercero, inicio repetido y finalización anticipada comprobados; persistencia final COMPLETADO |
| [x] Comprobado | Calificaciones y comentarios | Ambos participantes califican después de completar; tercero, duplicado y puntuación fuera de rango rechazados |
| [x] Comprobado | Envío y revisión de identidad | Pendiente → rechazada → reenvío → aprobada probado. Motivo y consentimiento obligatorios; tamaño y formatos protegidos |
| [x] Comprobado | Certificado PDF y privacidad | PDF sintético de dos páginas, formato/tamaño y permisos comprobados; PDF abierto visualmente en Android. Dueño/admin acceden; tercero/sin sesión no. Sin caché ni sniffing |
| [~] Parcial | Verificación de autenticidad documental | Revisión manual por administrador; las pruebas usaron imágenes/PDF ficticios. No existe validación automática de cédula o antecedentes ni estas pruebas acreditan identidades reales |
| [x] Comprobado | Administración móvil | Usuarios, Bloqueados, Identidades y Publicaciones abren en Android. Botones de cambio de rol quitados; cuenta bloqueada muestra Activar cuenta y modal de motivo |
| [x] Comprobado | Bloquear/activar cuenta | Operaciones reales sobre cuenta ficticia probadas; token revocado al bloquear y no vuelve a ser válido al activar. Debe iniciar sesión de nuevo |
| [x] Comprobado | Retirar/restaurar publicación | Moderación conserva registro, exige motivo, quita acceso público y permite detalle administrativo. Restauración comprobada. Retirar no es borrado definitivo |
| [x] Comprobado | Ver detalles administrativo | Navegación Android comprobada: título, descripción, dueño, categoría, comuna, importe, estado y fechas. API rechaza acceso de USUARIO; admin consulta incluso retirada |
| [x] Comprobado | Auditoría y continuidad administrativa | Cambios de prueba generan auditoría; pruebas unitarias cubren acceso, autobloqueo y último administrador. No se alteraron permisos de cuentas reales |
| [~] Parcial | Tema e idioma | Persistencia, errores al guardar y contraste de tokens pasan pruebas. Falta recorrer todas las pantallas en ambos temas e idiomas y tamaños |
| [ ] Pendiente | Pausar, cancelar y eliminar publicación por dueño | Sin endpoints ni flujo móvil para estas acciones. CANCELADO existe en flujos internos de ofertas rechazadas, pero no equivale a cancelar desde Mis trabajos |
| [ ] Pendiente | Retirar la propia postulación | Sin endpoint ni acción móvil |
| [ ] Pendiente | Fotos de evidencia del trabajo | Sin flujo de carga ni modelo/endpoint de evidencia de trabajos. Fotos de identidad son una función distinta |
| [ ] Pendiente | Biografía/foto de perfil editable | Edición actual cubre nombre y teléfono; avatar es inicial. No hay biografía almacenada para «Sobre este usuario» |
| [ ] Pendiente | Notificaciones push | Chat/no leídos usan consultas periódicas; no hay flujo push de mensajes/selección/verificación |
| [ ] Sin comprobar | App sin PC encendido | API actual del móvil usa backend del PC. Neon está en la nube, pero eso no aloja el backend. Falta despliegue HTTPS y build independiente de Metro |
| [ ] Sin comprobar | Teléfono físico, iOS y producción | Esta auditoría no prueba esos entornos; tampoco acredita recorrido completo de la web administrativa |

## Fallos confirmados y prioridad

| Prioridad | Hallazgo | Evidencia y efecto | Corrección propuesta |
| --- | --- | --- | --- |
| Alta | Cambiar contraseña no invalida sesión previa | Token anterior sigue obteniendo 200 en /users/me después de recuperar contraseña. Actualización no incrementa versionSesion | Incrementar versión de sesión dentro de la transacción de recuperación y comprobar concurrencia/uso único |
| Alta | Correo del propietario en detalle público | GET /jobs/:id sin sesión devuelve owner.email | Limitar respuesta pública; conservar información privada solo donde existe necesidad y autorización |
| Alta | Fecha inválida causa 500 | POST /jobs con scheduledAt='no-es-fecha' devuelve 500 | Validar formato y fecha en DTO/servicio; devolver error claro 400 |
| Media | Textos vacíos después de trim aceptados | Título de 3 espacios y descripción de 10 espacios producen 201 | Normalizar antes de validar y exigir longitud del texto normalizado; límites máximos |
| Media | Comuna inexistente aceptada | POST /jobs con nombre ficticio produce 201 | Catálogo y validación de comuna en backend; mantener compatibilidad con publicaciones antiguas |
| Media | Bloqueados siguen en Personas | Un usuario de /admin/users?activo=false también aparece en /users | Definir visibilidad de perfiles bloqueados; normalmente excluirlos de descubrimiento sin borrar historial |
| Media, por diagnosticar | Aviso de no leídos en Android | Aviso inspeccionado: TypeError: Network request failed al cargar no leídos; detalle y PDF siguieron funcionando | Reproducir interrupción de red, revisar respuesta y reintentos; evitar alertas técnicas repetidas |

## Mejoras recomendadas y orden de trabajo

- [ ] **Primero: corregir los hallazgos confirmados** de sesión, privacidad y validación. Añadir regresiones de comportamiento y repetir las pruebas.
- [ ] **Luego: completar las funciones de trabajo que faltan**: retiro de postulación, pausar/cancelar/eliminar según reglas acordadas, y evidencia del trabajo. Definir estados y permisos antes de implementarlos.
- [ ] Afinidad basada en preferencias reales; indicar con claridad qué calcula la recomendación actual.
- [ ] Biografía editable y perfil más útil, conservando el diseño; separar datos privados de los públicos.
- [ ] Manejo común de sesión expirada y errores de red, con mensajes claros y reintentos. Comprobar lectura/no leídos con dos dispositivos y actualización de pantallas sin recarga manual.
- [ ] Filtrado/paginación de trabajos y personas en servidor antes de crecer; evitar descargar todos los registros. Los listados administrativos ya usan páginas.
- [ ] Limitar intentos de login/códigos y endurecer validaciones. No se encontró limitador de intentos en los módulos revisados.
- [ ] Ajustar orígenes CORS para despliegue: main.ts usa enableCors() sin lista configurada. No equivale a autorización de endpoints.
- [ ] Resolver lint de forma incremental: 684 errores son formato; tratar primero las 18 reglas adicionales y 13 advertencias. Configurar lint móvil compatible con su SDK actual, sin actualizar el stack incidentalmente.
- [ ] Mantener pruebas repetibles y versionadas con entornos exclusivos. Los scripts de auditoría actuales son temporales/privados; no constituyen aún un pipeline de CI.
- [ ] Política de conservación y limpieza de documentos privados, caché temporal tras fallos, límites y acceso de administración.
- [ ] **Después: pruebas reales de correo y Google**, teléfono físico, permisos de cámara/archivos, teclado, accesibilidad y reconexión; iOS si entra en alcance.
- [ ] Respaldar selectivamente el código en Git/GitHub. Mobile tiene cambios sin commit y backend archivos sin seguimiento; crear ramas no guarda esos cambios en la nube. No se hicieron commit/push durante esta auditoría.
- [ ] **Finalmente: desplegar** API HTTPS con variables, migraciones autorizadas, CORS y monitoreo; generar app instalable que funcione sin Metro y comprobarla sin el PC encendido.

## Límites y evidencia

La prueba completa de negocio se hizo principalmente por API y BD. La inspección Android de esta revisión cubrió perfil, administración, Bloqueados, modal de reactivación sin confirmar cambios sobre la cuenta mostrada, detalle de publicación y visor PDF. No se repitió cada operación del ciclo desde cada botón móvil ni se cambió la cuenta real abierta para realizar contratos.

Falta una prueba de carga, concurrencia con peticiones simultáneas, batería/red lenta y recorrido exhaustivo de cada pantalla. Que TypeScript pase no acredita comportamiento visual en Android/iOS. Las fechas mostradas dependen de la zona horaria del dispositivo; el emulador puede diferir de Chile.

Evidencia privada, sin reproducir credenciales: backend/.temp/audit-identity-results.json, audit-cycle-results.json, audit-publications-results.json, audit-auth-results.json, audit-pdf-results.json, audit-extra-results.json y audit-lint-results.json. Cuentas/tokens solo en archivos privados ignorados dentro de backend/.temp. El primer intento del comprobador de correo esperaba 401 para código incorrecto; la API usa 400 y la expectativa se ajustó, sin modificar el producto. Ese primer intento dejó una cuenta ficticia pendiente adicional.

Conclusión: el ciclo principal está comprobado en develop. Los fallos enumerados y los módulos pendientes impiden declarar la app terminada o lista para producción.
