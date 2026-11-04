# APK de ServiciosYa

Aquí se guarda el instalador Android de la app, compilado contra la API publicada.

| Archivo | Contenido |
|---|---|
| `ServiciosYa.apk` | Última versión, para teléfonos Android de 64 bits (arm64-v8a) |

## Instalar en el teléfono

1. Descargar `ServiciosYa.apk` desde GitHub (botón de descarga del archivo).
2. Abrirlo en el teléfono y permitir "instalar apps desconocidas" cuando Android lo pida.
3. La primera vez que se abre tras un rato sin uso, la API gratuita tarda unos
   30-60 segundos en despertar.

## Generar una versión nueva

Ver la sección «APK para un teléfono Android» de `mobile/README.md`. Después,
copiar `mobile/android/app/build/outputs/apk/release/app-release.apk` aquí como
`ServiciosYa.apk` y hacer commit.

El APK se firma con la clave de depuración del proyecto: sirve para instalarlo
directamente, no para publicarlo en Google Play.
