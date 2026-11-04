# Filtro de publicaciones

El filtro de Inicio ofrece, en orden: tipo de servicio (todos, ofrece, solicita), interruptor de recomendaciones por afinidad, categoría, región y comuna. Se quitaron mínimo/máximo de presupuesto y la ordenación por presupuesto. Los precios siguen visibles en las publicaciones.

Publicar y el filtro comparten 39 sugerencias generales de categorías con emojis, además del catálogo de `GET /jobs/categories` y las categorías presentes en las publicaciones disponibles. El desplegable permite buscar y elegir una categoría o usar un nombre escrito. Las tildes no impiden las coincidencias. El emoji decora la opción, pero el nombre enviado a la API no lo incluye. Buscar no crea categorías; al publicar, el backend mantiene su validación y la gestión de categorías existente, incluido el rechazo de categorías desactivadas.

Publicar incluye región y comuna desplegables del mismo catálogo territorial del filtro. Exige región y comuna compatibles, limpia la comuna al cambiar de región y restablece ambas selecciones después del envío correcto. La API mantiene su contrato actual: recibe el nombre de la comuna y no un nuevo campo de región. No se alteró el esquema de la base de datos.

Región y comuna utilizan el catálogo local `mobile/src/constants/chile-locations.json`, obtenido de las [páginas regionales de BCN](https://www.bcn.cl/siit/nuestropais/nuestropais/div_pol-adm.htm), con 16 regiones y 346 comunas. El enlace de Antártica en la página regional duplicaba el de Cabo de Hornos; su código 12202 se contrastó con el [catálogo oficial de MINSAL](https://interoperabilidad.minsal.cl/fhir/ig/eis/0.1.0/CodeSystem-CSComunas.json.html). No requiere consultar estos sitios desde la app.

Cambiar de región limpia la comuna. Sin región, la comuna permanece deshabilitada. Al filtrar por región se incluyen únicamente publicaciones cuya comuna coincide con el catálogo; datos históricos con localidades escritas de otra forma siguen visibles sin filtro territorial y pueden necesitar normalización en otra tarea. No se añadieron columnas ni migraciones de ubicación.

Activar destacados conserva la afinidad existente de Inicio, que es una regla fija basada en comuna, categoría y presupuesto; no se añadió un cálculo personalizado del perfil. Desactivarlo oculta el carrusel recomendado y ordena los resultados por fecha. No excluye publicaciones por una puntuación mínima.

Aplicar confirma los filtros; cerrar los descarta; limpiar restablece el formulario y requiere aplicar. Buscar y Ver todos transmiten la selección a la pantalla de búsqueda. Inicio y Búsqueda cargan ambos tipos con los contratos actuales de `/jobs?kind=...`; una oferta abre su detalle y una solicitud conserva la postulación. Las reglas de vencimiento, privacidad y permisos del backend no cambian.

Validación del filtro original: 9 pruebas del filtrado real y catálogo local, 104 pruebas unitarias backend, consulta HTTP de lectura de categorías y ambos tipos, TypeScript móvil/backend y lint localizado backend. La ampliación de Publicar pasó 4 pruebas adicionales del callback real (región obligatoria, comuna compatible, envío y limpieza, bloqueo de identidad), para 13 pruebas móviles relacionadas, y TypeScript. En Android se comprobaron los desplegables de Publicar y el catálogo con emojis en Publicar y en el filtro. No se creó una publicación real durante esta comprobación.
