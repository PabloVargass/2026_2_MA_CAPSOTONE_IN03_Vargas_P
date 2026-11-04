# Despliegue de ServiciosYa

Neon aloja PostgreSQL; la API se prepara para Render (ver más abajo). Neon
no ejecuta esta API NestJS. No subir `.env`, `.temp` ni respaldos.

## Construcción y arranque

Ejecutar desde la carpeta `backend`, con las dependencias de desarrollo disponibles
durante la construcción:

```sh
npm ci
npm run prisma:generate
npm run build
npm run start:prod
```

Prisma genera su cliente en `generated/prisma`; ese cliente debe generarse antes
del build. El archivo ejecutable compilado es `dist/src/main.js`.
El servicio usa el puerto de `PORT` y necesita una URL HTTPS proporcionada por
el alojamiento. `GET /` puede comprobar el arranque, pero no acredita el flujo
de login ni una consulta a PostgreSQL.

## Variables

Consultar `.env.example`. Guardar DATABASE_URL, JWT_SECRET y las credenciales de
correo exclusivamente en el backend, mediante el gestor de secretos del proveedor.
El correo utiliza Gmail mediante Nodemailer: verificar que el alojamiento permita
SMTP antes de elegirlo. Sin las variables de correo el backend no arranca.
GOOGLE_CLIENT_ID es necesario si se valida el login con Google.

## Base de datos

La base trasladada a Neon ya tiene las diez migraciones existentes. Verificar
`npx prisma migrate status` contra el destino autorizado antes de publicar.
No incluir `migrate dev`, `db push`, resets, seeds ni el bootstrap administrativo
en el arranque. Si aparecen migraciones pendientes, revisar su SQL y autorizar
su aplicación en el destino antes de ejecutar `prisma migrate deploy`.

## Plan gratuito elegido (noviembre 2026)

| Parte | Servicio | Notas |
|---|---|---|
| API | Render, plan Free, Blueprint `render.yaml` en la raíz de Proyecto-Capstone-ServiciosYa | Se duerme tras ~15 min sin uso; la primera petición tarda ~30-60 s |
| Base de datos | Neon, rama principal | Ya existía |
| Correo | Brevo gratis, SMTP puerto 2525 | Render Free bloquea 25, 465 y 587, por eso no sirve Gmail |
| Panel | Vercel Hobby, carpeta `web-admin` | Variable `API_BASE_URL` = URL HTTPS de Render |
| App | APK Android instalado directamente | `EXPO_PUBLIC_API_URL` = URL HTTPS de Render |

Pasos:

1. El código se publica en la carpeta `ServiciosYa/` de Proyecto-Capstone-ServiciosYa
   (`git subtree`); Render y Vercel despliegan desde ese repositorio.
2. Brevo: verificar el correo remitente y crear una clave SMTP. En Render,
   `EMAIL_USER` = remitente verificado, `SMTP_USER` = usuario SMTP de Brevo,
   `EMAIL_APP_PASSWORD` = clave SMTP de Brevo.
3. Render: New > Blueprint, elegir el repositorio y completar las variables
   `sync: false`. `JWT_SECRET` lo genera Render.
4. Aplicar las migraciones pendientes en la base principal (autorizado por Pablo
   el 2026-11-04; solo agregan tablas, columnas y restricciones):
   `npx prisma migrate deploy` desde `backend`.
5. Vercel: importar el repositorio con Root Directory `ServiciosYa/web-admin` y definir
   `API_BASE_URL`.
6. APK: con la URL de Render en `mobile/.env.production.local`, compilar el
   release (ver `mobile/README.md`) e instalarlo en el teléfono.
7. Probar en la nube: registro con correo, login, publicar, postular, chat,
   evidencias y panel de administración.

## Limitaciones conocidas

- Todos los logins del panel llegan a la API desde los servidores de Vercel, por
  lo que comparten el límite de intentos por IP.
- El APK se firma con la clave de depuración del proyecto: sirve para instalarlo
  directamente, no para publicar en Google Play.
