# Publicaciones y ofertas de servicios

Implementación y comprobaciones del 10 de octubre de 2026 (hora de Chile), en desarrollo.

- Las publicaciones distinguen OPORTUNIDAD y SERVICIO internamente. La app muestra «Trabajos disponibles» para la primera categoría y «Trabajo disponible» en cada publicación; se actualizaron títulos, filtros, mensajes y traducciones. Explorar conserva un catálogo separado de servicios agrupados por prestador. El cambio de textos no modifica la API ni los datos.
- Se muestran fecha y hora de publicación y vencimiento, con la zona horaria del dispositivo. La duración ofrece únicamente 3, 6, 12 y 24 horas. Editar la duración conserva el inicio original; no reinicia el reloj. El campo personalizado se retiró en el cambio posterior de identidad y administración móvil.
- Las publicaciones vencidas dejan de aparecer en los listados públicos y no admiten nuevas postulaciones ni solicitudes. Se conservan en el historial. Los trabajos acordados continúan normalmente.
- «Ver servicios» abre el catálogo de una persona; cada servicio tiene «Ver detalle». Aceptar el precio publicado crea una contratación acordada y su chat. Proponer otro importe abre una solicitud pendiente y su chat; el prestador acepta o rechaza desde la conversación.
- Las contrataciones son privadas y no consumen ni reemplazan la publicación original. El servidor verifica identidad, participantes, estado y vencimiento. Actualmente se permite una solicitud por persona y publicación, evitando duplicados; no existe una nueva negociación tras rechazar esa misma solicitud.

## API y base de datos

Crear una publicación admite `kind` y `durationMinutes`; los consumidores antiguos conservan OPORTUNIDAD y 24 horas por defecto. Consultar `/jobs?kind=SERVICIO&ownerId=...` obtiene el catálogo de un prestador. Los nuevos endpoints protegidos son `POST /jobs/:id/ofertas-servicio` y `PATCH /jobs/ofertas-servicio/:id/aceptar` o `/rechazar`.

La migración `backend/prisma/migrations/20261011003000_publicaciones_servicios/migration.sql` añade el tipo, vencimiento, referencias de contratación y ofertas. Ya se aplicó exclusivamente a Neon develop. Las publicaciones existentes reciben el tipo OPORTUNIDAD y 24 horas desde la migración; no se borran datos. Producción sigue pendiente de autorización y aplicación de esta migración antes de desplegar el código actualizado.

## Validación

- 66 pruebas unitarias del backend y 13 pruebas HTTP de privacidad y Mis trabajos aprobadas.
- 46 comprobaciones por API y PostgreSQL reales en develop: límites, listados, precio aceptado, contraoferta, aceptación, rechazo, duplicados, permisos, vencimiento y continuación de contratos acordados.
- TypeScript del móvil y 14 pruebas de Mis trabajos y preferencias aprobadas; lint localizado del backend aprobado.
- Android: revisados listados con fechas, separación de pestañas y catálogo con varios servicios. La creación y respuesta a ofertas se comprobaron por API; no se afirma que todos los botones del nuevo flujo se hayan recorrido en Android. No se hicieron pruebas en iOS ni un despliegue público.

Las publicaciones y cuentas ficticias de las comprobaciones permanecen en develop, identificadas como pruebas. Las credenciales y los resultados privados están excluidos de Git.
