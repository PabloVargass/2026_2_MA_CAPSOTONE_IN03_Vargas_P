# Entorno de desarrollo de ServiciosYa

## Neon

En el proyecto ServiciosYa (`steep-hill-79066669`), crear una rama Neon llamada
`develop` desde la rama actual. Una rama estándar copia inicialmente schema y datos;
las escrituras posteriores son independientes. No borrar ni resetear la rama original.
Usar cuentas de prueba propias y evitar correos a las cuentas copiadas.

Seleccionar `develop` en Connect y copiar su conexión completa, con contraseña real,
al campo DATABASE_URL de `backend/.env.development.local`. No pegarla en el chat.
Ese archivo está excluido de Git. Verificar el nombre de rama en Neon: la comprobación
local detecta el mismo servidor/base de la conexión principal, pero no puede certificar
por sí sola que una URL distinta pertenezca a la rama correcta.

El archivo local se preparó con DATABASE_URL vacío, JWT_SECRET nuevo y credenciales
de correo/Google del backend actual. El correo sigue siendo real; realizar las pruebas
solo con direcciones propias. Las sesiones del entorno principal no sirven en desarrollo.

## Backend

Desde `backend`, ejecutar `npm run start:dev`. Carga explícitamente
`.env.development.local` y se detiene si faltan variables o si su servidor y base
coinciden con `.env`, incluso comparando conexión directa y pooler.
No aplica migraciones ni crea datos automáticamente. Esta protección pertenece a
`start:dev`; otros comandos deben recibir explícitamente la configuración apropiada.

Para demostraciones, `npm run start:dev:rapido` aplica la misma protección pero reutiliza
`dist/` si ningún archivo de `src/`, `generated/` o configuración TypeScript/Nest es más
nuevo; si los hay, compila una sola vez. No vigila cambios: tras editar código, reiniciarlo.

Una vez guardada la URL, verificar estado de migraciones y tablas antes de pruebas
con escrituras. El historial copiado de una rama estándar debe conservarse.

## Móvil

La URL se configura con EXPO_PUBLIC_API_URL en `mobile/.env.local`, conforme al
soporte nativo de variables de Expo. Es pública, no contiene credenciales.
El archivo local conserva la dirección de red usada en esta sesión; confirmar
la IP vigente antes de iniciar desde un teléfono. Reiniciar Expo y recargar la app
al cambiarla. Usar `10.0.2.2:3000` para emulador Android o HTTPS para nube.

No existe todavía un backend de producción publicado ni un build móvil por entorno.
Tras conectar la rama de desarrollo, probar primero registro/verificación/login/perfil
y después el ciclo completo del servicio con dos cuentas de prueba.
