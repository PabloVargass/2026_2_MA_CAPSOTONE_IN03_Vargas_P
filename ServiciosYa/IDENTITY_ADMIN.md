# Identidad y administración móvil

Cambios en desarrollo, octubre de 2026. No se aplicaron migraciones ni se desplegó el backend en producción. Véase el incidente de la prueba antigua al final.

## Publicar

La duración solo ofrece 3, 6, 12 o 24 horas. Se retiraron el campo personalizado y su ayuda. El backend también rechaza otros valores en creación y edición. Las publicaciones anteriores no se migran ni se reinicia su vencimiento.

Para crear una publicación, una cuenta USUARIO activa necesita una solicitud de identidad APROBADA. La comprobación ocurre en la transacción del backend. Una cuenta ADMIN activa puede publicar sin documentos; esta excepción no evita los controles de sesión, bloqueo o validación de la publicación. Solicitar un servicio privado conserva su flujo anterior.

## Registro y revisión

Perfil y Publicar llevan a «Registra tu identidad». Se presenta un ejemplo ilustrado de rostro completo con cédula legible. La foto de rostro junto con cédula admite JPG o PNG; el certificado de antecedentes admite JPG, PNG o PDF. Cada archivo tiene un máximo de 2 MB. El servidor comprueba firma, estructura y presencia de páginas del PDF, y rechaza archivos con contraseña. Esta comprobación técnica no acredita la autenticidad del certificado. El RUT debe coincidir con el de la cuenta. El usuario debe aceptar su revisión privada.

La solicitud queda PENDIENTE hasta que un administrador revise ambos documentos y apruebe o rechace con un motivo. Si se rechaza, el usuario ve el motivo y puede reenviar. Una identidad aprobada no puede reemplazarse por el propio usuario ni autodeclararse desde el registro público. No existe una verificación automática de autenticidad ni una consulta externa de antecedentes.

Los documentos se guardan como bytes privados en PostgreSQL, sin URLs públicas. Los listados y auditorías contienen únicamente metadatos. Los endpoints de archivos requieren sesión y propiedad o rol administrativo; devuelven `Cache-Control: private, no-store`. El visor móvil autenticado tiene zoom y usa `expo-image` sin caché. No se implementó una política automática de eliminación de documentos.

El visor PDF nativo descarga con la sesión vigente a una carpeta temporal privada y la elimina al cerrar. No envía el certificado a visores externos. Si la app termina abruptamente, puede quedar una copia en la caché privada hasta que el sistema la limpie. El selector de PDF también crea una copia privada temporal que se elimina al enviar o salir de la pantalla.

## Administración en el móvil

Perfil muestra Administración solo después de consultar el rol vigente al backend. Todos los endpoints administrativos mantienen sus guards. La vista permite:

- Buscar usuarios, bloquear y reactivar cuentas; conceder o retirar el rol ADMIN.
- Revisar documentos, aprobar o rechazar identidad.
- Retirar y restaurar publicaciones públicas.
- Consultar el registro de acciones administrativas.

Cada cambio solicita confirmación y un motivo. Bloquear o cambiar permisos revoca las sesiones anteriores. Se conserva la protección del último administrador activo. Retirar una publicación reutiliza la moderación de la web: oculta el listado, conserva contratos, chats e historial y permite restaurar; no es un borrado físico. La web administrativa conserva su interfaz anterior; la nueva revisión de identidad está disponible en el móvil y en la API compartida.

La cuenta indicada por Pablo se promovió mediante la API administrativa, con auditoría, exclusivamente en develop. Debe iniciar una sesión nueva.

## Migración y validación

`backend/prisma/migrations/20261011020000_identity_verification/migration.sql` añade la tabla y estados de identidad, restricciones de tipos/tamaño y relaciones de revisión. Se aplicó en Neon develop y se regeneró Prisma. No elimina datos ni aprueba identidades antiguas. Antes de desplegar el backend actualizado en otro entorno se necesita aplicar las migraciones autorizadas.

`backend/prisma/migrations/20261011210000_identity_certificate_pdf/migration.sql` amplía únicamente la restricción del tipo del certificado a `application/pdf`. Se aplicó en develop; conserva los archivos y límites anteriores. No requiere cambios del modelo Prisma ni regeneración del cliente.

La ampliación PDF pasó 103 pruebas backend, 13 pruebas HTTP aisladas, TypeScript móvil/backend y lint localizado. Hubo 19 comprobaciones reales de subida y privacidad con un PDF ficticio de dos páginas. Android recompiló e instaló; se verificaron visualmente la carga del PDF privado desde Administración, el desplazamiento a su segunda página, el indicador de página, el zoom y la apertura del selector PDF desde el registro (sin adjuntar archivos personales). Se fijó `react-native-blob-util` a 0.22.2 porque la versión 0.25.1 publicada no resolvía un archivo al compilar el bundle. iOS, selección y envío completo de un PDF desde un teléfono físico y visor web quedan sin comprobar visualmente.

## Incidente de prueba antigua y protección añadida

El 11 de octubre se ejecutó por error el comando e2e completo, que incluía `test/app.e2e-spec.ts`. Esa suite cargaba la conexión principal y su limpieza seleccionaba cuentas por correo de fixture o por RUT. El borrado de una cuenta ADMIN fue bloqueado por la relación de auditoría; antes había ejecutado limpieza de tokens de verificación y recuperación. La consulta posterior confirmó que la cuenta sigue activa y que no tiene esos tokens. No hay una referencia anterior que permita determinar si se borraron tokens existentes. No se restauraron ni generaron tokens automáticamente.

La suite ahora exige `E2E_TEST_DATABASE_URL` y `DATABASE_URL` coincidentes, con destino distinto de principal y develop, antes de inicializar la app o ejecutar cualquier limpieza. Se comprobó que, sin esa configuración explícita, se detiene antes de inicializar Prisma. Las suites `users-privacy` y `mis-trabajos` usan Prisma simulado y se ejecutan por separado. No se declara el conjunto completo de e2e como aprobado.

Comprobaciones ejecutadas: 97 pruebas backend, 13 pruebas HTTP de privacidad y Mis trabajos, 14 pruebas móviles existentes, TypeScript y lint localizado. El ciclo real en develop pasó 41 comprobaciones de documentos, aprobación/rechazo/reenvío, publicación bloqueada, excepción administrativa, archivos privados, moderación, bloqueo/reactivación y revocación de sesiones. Usó cuentas y archivos ficticios; no verifica identidades reales.

Se recompiló e instaló Android en Pixel_8 con `expo-image-picker` compatible con SDK 54. En el emulador se comprobaron el bloqueo del formulario para cuentas sin identidad, el ejemplo ilustrado y desplazamiento del registro, la apertura y cancelación del selector de fotos, el acceso administrativo desde Perfil, las cuatro secciones administrativas y los cuatro botones de duración sin campo manual. No se seleccionaron documentos personales. iOS, subida desde cámara física y un despliegue público quedan sin comprobar. Los archivos de prueba y credenciales privados permanecen excluidos de Git.
