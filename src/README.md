# GeoPortal-SIG

GeoPortal-SIG es una aplicación web interactiva para visualizar información sanitaria y de emergencia sobre El Salvador. Proporciona un mapa geográfico con capas temáticas (centros médicos, áreas de cobertura, zonas de riesgo, densidad poblacional y mapas de calor de COVID-19) orientado a apoyar la toma de decisiones y el análisis espacial por equipos de salud pública y planificación.

## Objetivo

- Visualizar y analizar la distribución de centros médicos y recursos sanitarios.
- Identificar zonas de riesgo y áreas con alta demanda médica.
- Mostrar mapas de calor de incidencia (ej. COVID-19) para priorizar intervenciones.
- Permitir integrar datos reales (Supabase) o usar datos de ejemplo para demostraciones.

## Características principales

- Mapa interactivo con capas toggleables: cobertura, zonas de riesgo, densidad poblacional y mapa de calor COVID-19.
- Búsqueda y filtrado de centros médicos por nombre, dirección y servicios.
- Creación de rutas desde la ubicación del usuario a un centro médico.
- Popups informativos con métricas por zona y detalles de cada centro.

## Tecnologías

- Frontend: React + TypeScript
- Mapas: Leaflet + Leaflet Routing Machine
- Datos: Supabase (opcional) / datos de ejemplo incluidos
- Build: Vite

## Instalación

1. Clonar el repositorio y moverse al directorio del proyecto:

```bash
git clone <repo-url>
cd GeoPortal-SIG/src
```

2. Instalar dependencias:

```bash
npm install
```

3. Ejecutar en modo desarrollo:

```bash
npm run dev
```

4. Construir para producción:

```bash
npm run build
```

## Configuración de datos (Supabase)

La app soporta Supabase para cargar datos reales. Actualmente hay una lógica en `src/lib/supabase.ts` y en los hooks `useEmergencyData`, `useMedicalCenters`, `usePopulationData`.

Para usar Supabase:

- Crear un proyecto en Supabase y obtener `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
- Configurar las variables en entorno (.env) o en tu gestor de despliegue.
- Asegurarse que las tablas/columnas usadas por los hooks existen y siguen el mismo esquema que los tipos en `src/types`.

Si no configuras Supabase, la aplicación usa datos de demo incluidos en `src/data/`.

## Uso del mapa de calor COVID-19

- La capa de mapa de calor está implementada con puntos de ejemplo en `src/components/Map.tsx` (variable `covidHeatmapPoints`).
- Para conectar datos reales, sustituye esa fuente por llamadas a la API o por datos provenientes de Supabase y mapea `lat/lng/cases`.

Ejemplo rápido (conceptual):

```ts
// obtener datos reales
const covidData = await supabase.from('covid_cases').select('lat, lng, cases');
// procesar y renderizar como círculos o usando una librería de heatmap para Leaflet
```

## Contribuir

- Abrir issues para sugerencias o bugs.
- Crear PRs con cambios pequeños y descriptivos.
- Mantener las pruebas y el estilo del código (Prettier/ESLint si aplica).

## Licencia y contacto

- Este repositorio puede agregarse bajo la licencia que el equipo prefiera (MIT, Apache-2.0, etc.).
- Contacto: equipo de desarrollo / mantenedor principal (agregar email o Slack interno).

---

Si quieres, puedo:
- Conectar el mapa de calor a una tabla de Supabase y añadir un ejemplo de query.
- Mejorar el README con badges, screenshots y ejemplos de API.
- Añadir archivo `LICENSE` con la licencia que prefieras.
