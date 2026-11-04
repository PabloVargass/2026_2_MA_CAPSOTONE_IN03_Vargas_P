# Prueba de ciclo completo — 10 de octubre de 2026

## Entorno y alcance

Backend local con `.env.development.local` y la rama Neon `develop`. El comprobador
rechaza ejecutar si el endpoint de desarrollo coincide con la conexión principal.
No se ejecutaron migraciones, borrados ni publicaciones en producción.

Se prepararon cuentas ficticias de cliente, trabajador y tercero, con contraseñas
aleatorias almacenadas solo en archivos privados ignorados. Se inicializó su correo
como verificado para probar el ciclo: esto **no valida registro ni envío de correo**.
Los datos ficticios se conservaron en desarrollo. Hubo dos ciclos completados;
en el primero el comprobador usó una ruta incorrecta al consultar Mis trabajos.
Se corrigió esa ruta del comprobador y se repitió la prueba completa.

## Resultado por API y base de datos

La ejecución final aprobó 30 comprobaciones contra el backend real y Neon:

- Inicio de sesión de tres cuentas y publicación de un servicio ficticio.
- Rechazo de operaciones sin sesión, postulación al propio trabajo y edición ajena.
- Postulación del trabajador; duplicado rechazado con 409.
- Segundo postulante; aceptación por el cliente y rechazo automático del restante.
- Aceptación por un tercero rechazada con 403.
- Conversación creada; envío y lectura de mensajes de ambos participantes.
- Acceso de un tercero a esa conversación rechazado con 403.
- Reseña anticipada y finalización antes del inicio rechazadas con 400.
- Inicio por tercero rechazado con 403; inicio por trabajador permitido.
- Segundo inicio rechazado; finalización por el cliente permitida.
- Reseña de tercero rechazada, puntuación fuera del rango rechazada.
- Reseñas de cliente y trabajador permitidas; duplicado rechazado con 409.
- Mis trabajos responde para ambos participantes.
- Persistencia final comprobada: `COMPLETADO`, dos reseñas y dos mensajes.

Los resultados privados quedan en `backend/.temp/full-cycle-results.json`.

## Comprobaciones desde Android Pixel_8

- Acceso mediante formulario con la cuenta ficticia de cliente.
- Perfil muestra un trabajo, una reseña y promedio 4.0, coherente con la reseña recibida.
- Mis trabajos muestra la publicación con estado Completado y acceso al chat.
- Chat muestra ambos mensajes del ciclo.
- Un mensaje adicional enviado desde la interfaz aparece en la conversación.

## Diferencias y límites

1. El cliente ve su trabajo completado en Publicados, pero Finalizados y su contador
   permanecen vacíos. El código de backend construye Finalizados solo desde
   postulaciones aceptadas del usuario como trabajador. Esto difiere del texto de
   la pantalla «Los trabajos completados aparecerán aquí» para un cliente.
2. El chat carga al abrir la pantalla y añade localmente el mensaje enviado; el
   código no implementa actualización automática de mensajes entrantes. No se
   acreditó entrega en tiempo real entre dos emuladores.
3. El ciclo completo se ejecutó por API. En Android se verificaron acceso, resultados,
   perfil y chat; no se pulsaron todos los botones del ciclo desde dos sesiones móviles.
4. No se probaron concurrencia, iOS, registro/correos, recuperación de contraseña,
   Google, fotografías ni reinicio de sesión en esta ronda.

No se modificó la lógica ni el diseño durante esta ronda. La sesión del emulador
quedó en la cuenta ficticia de cliente; la cuenta original del usuario no se modificó.

## Correcciones verificadas después de esta prueba

- Finalizados ahora incluye trabajos completados como cliente y como trabajador.
  La consulta conserva Publicados; el contador de Finalizados incluye ambos roles.
  Para una publicación propia la tarjeta muestra al trabajador y usa el id del trabajo
  como clave. El contrato añade `participant` y admite `applicationId: null` cuando
  el usuario es el cliente; los campos del trabajador mantienen su formato anterior.
- Chat consulta mensajes cada tres segundos mientras está enfocado y la app está
  activa. Se detiene al salir, evita consultas solapadas y combina por id para que
  una respuesta tardía no borre un mensaje enviado. Los errores de actualización
  no abren alertas repetidas; el siguiente ciclo vuelve a intentar la consulta.
- Verificación real en Neon develop: Finalizados contiene el trabajo de prueba y
  contador 1 para ambos participantes. En Android se observó la tarjeta del cliente
  y una respuesta nueva apareció sin salir ni volver a entrar al chat.
- TypeScript móvil sin errores, 14 pruebas móviles aprobadas, dos pruebas del
  servicio de trabajos aprobadas (incluye regresión de ambos roles y rechazo de
  postulaciones no aceptadas), ESLint de los dos archivos backend modificados limpio.
- Sin cambios de esquema, migraciones, dependencias ni diseño. La actualización
  del chat es por consulta periódica; no incorpora notificaciones en segundo plano.
