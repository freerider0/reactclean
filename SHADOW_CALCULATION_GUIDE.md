# Guía de Cálculo de Sombras

Sistema completo para calcular sombras solares proyectadas por edificios del catastro sobre un punto de referencia.

## 📁 Estructura de Archivos

### Tipos TypeScript
- **`src/types/shadow.ts`**: Tipos para sombras, paredes 3D, puntos y respuestas de API

### Utilidades de Cálculo
- **`src/utils/shadows/shadowDriver.ts`**: Orquestador principal del cálculo
- **`src/utils/shadows/catastroPolygonTo3dWalls.ts`**: Convierte polígonos del catastro a paredes 3D
- **`src/utils/shadows/getAzimutAndElevation.ts`**: Calcula ángulos azimut y elevación
- **`src/utils/shadows/cleanShadows.ts`**: Elimina sombras redundantes
- **`src/utils/shadows/getHeightOfConstruction.ts`**: Calcula altura de edificios desde código catastral
- **`src/utils/shadows/quadrilaterals/helpers.ts`**: Funciones auxiliares para cuadriláteros 3D

### Servicios
- **`src/services/shadowService.ts`**: Servicio cliente para cálculo de sombras

### SQL
- **`supabase_get_intersecting_geometries.sql`**: Función SQL para obtener construcciones del catastro

### API (api-server)
- **`../api-server/routes/shadows.routes.js`**: Rutas Express para endpoints de sombras
- **`../api-server/server.js`**: Actualizado con rutas de sombras

## 🚀 Setup

### 1. Crear la función SQL en Supabase

Ejecuta el archivo `supabase_get_intersecting_geometries.sql` en el SQL Editor de Supabase:

```sql
-- Crea la función get_intersecting_geometries
-- Esta función devuelve construcciones que intersectan con un bounding box
```

**Nota**: Asegúrate de que:
- La tabla `shapefile.constru` existe en tu base de datos
- Tiene los campos: `gid`, `area`, `geom`, `refcat`, `constru`
- El SRID es 25831 (UTM Zone 31N) o ajusta según tu zona

### 2. Instalar dependencias (si es necesario)

El proyecto ya tiene `uuid` y `@supabase/supabase-js` instalados.

### 3. Configurar el API Server (opcional)

Si quieres usar el API server para las consultas:

```bash
cd ../api-server
npm install
# Asegúrate de que .env tiene SUPABASE_URL y SUPABASE_SERVICE_KEY
npm start
```

## 📖 Uso

### Opción 1: Desde el Cliente React (Directo)

```typescript
import { shadowService } from '@/services/shadowService';

// Calcular sombras para un punto específico
const response = await shadowService.calculateShadows({
  centerX: 430949.12,    // Coordenada X en UTM
  centerY: 4661352.89,   // Coordenada Y en UTM
  centerZ: 0,            // Altura del observador (opcional)
  bufferMeters: 100      // Radio de búsqueda (opcional)
});

console.log(response.data); // Array de sombras
```

### Opción 2: Calcular sombras para una parcela catastral

```typescript
import { shadowService } from '@/services/shadowService';

// Usa la referencia catastral (14 caracteres)
const response = await shadowService.calculateShadowsForParcel(
  '7623209DF2872D',  // Referencia catastral
  150                 // Radio de búsqueda en metros
);

console.log(response.data); // Array de sombras
```

### Opción 3: Usando el API Server

```typescript
// GET request al API server
const response = await fetch(
  'http://localhost:3001/api/shadows/get-buildings?centerX=430949&centerY=4661352&bufferMeters=100'
);
const data = await response.json();

// Luego calcular sombras en el cliente con los datos obtenidos
import { getShadowsForAPoint } from '@/utils/shadows/shadowDriver';

const shadows = getShadowsForAPoint(
  data.data,           // Buildings data
  [],                  // Overhangs (vacío por ahora)
  { x: 430949, y: 4661352, z: 0 }  // Reference point
);
```

## 🔍 Estructura de Datos

### Shadow (Sombra)
```typescript
interface Shadow {
  id: string;
  gid: string;
  cadastralNumber: string;
  points: {
    downLeft: { azimut: number; elevation: number };
    upLeft: { azimut: number; elevation: number };
    upRight: { azimut: number; elevation: number };
    downRight: { azimut: number; elevation: number };
  };
}
```

- **azimut**: Ángulo horizontal (-180° a 180°)
  - 0° = Sur
  - -90° = Este
  - 90° = Oeste
  - ±180° = Norte

- **elevation**: Ángulo vertical (0° a 90°)
  - 0° = Horizonte
  - 90° = Cenit

### Ejemplo de Respuesta

```json
{
  "message": "Shadow calculation successful",
  "data": [
    {
      "id": "abc-123",
      "gid": "228603",
      "cadastralNumber": "5916822DG0651N",
      "points": {
        "downLeft": { "azimut": -45.5, "elevation": 0 },
        "upLeft": { "azimut": -45.5, "elevation": 15.3 },
        "upRight": { "azimut": -43.2, "elevation": 15.3 },
        "downRight": { "azimut": -43.2, "elevation": 0 }
      }
    }
  ],
  "query": {
    "center": { "x": 430949.12, "y": 4661352.89, "z": 0 },
    "buffer": 100,
    "bounds": {
      "bottom_left": { "x": 430849.12, "y": 4661252.89 },
      "top_right": { "x": 431049.12, "y": 4661452.89 }
    }
  }
}
```

## 🎨 Visualización

Las sombras se devuelven en coordenadas **azimut-elevación**, ideales para dibujar en un diagrama solar:

1. **Eje X**: Azimut (-180° a 180°)
2. **Eje Y**: Elevación (0° a 90°)

Cada sombra es un cuadrilátero que representa el área del cielo bloqueada por un edificio.

### Ejemplo de visualización con Canvas

```typescript
function drawShadow(shadow: Shadow, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Convertir azimut/elevación a coordenadas de canvas
  const toCanvasX = (azimut: number) => ((azimut + 180) / 360) * canvas.width;
  const toCanvasY = (elevation: number) => canvas.height - (elevation / 90) * canvas.height;

  ctx.beginPath();
  ctx.moveTo(
    toCanvasX(shadow.points.downLeft.azimut),
    toCanvasY(shadow.points.downLeft.elevation)
  );
  ctx.lineTo(
    toCanvasX(shadow.points.upLeft.azimut),
    toCanvasY(shadow.points.upLeft.elevation)
  );
  ctx.lineTo(
    toCanvasX(shadow.points.upRight.azimut),
    toCanvasY(shadow.points.upRight.elevation)
  );
  ctx.lineTo(
    toCanvasX(shadow.points.downRight.azimut),
    toCanvasY(shadow.points.downRight.elevation)
  );
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fill();
}
```

## 🧪 Testing

### Test en Supabase SQL Editor
```sql
-- Test 1: Obtener construcciones en un área
SELECT * FROM get_intersecting_geometries(430900, 4581900, 431100, 4582100);

-- Test 2: Ver datos de una construcción
SELECT refcat, constru, ST_AsText(geom)
FROM shapefile.constru
WHERE refcat = '7623209DF2872D';
```

### Test en el cliente
```typescript
import { shadowService } from '@/services/shadowService';

// Test básico
async function testShadows() {
  try {
    const result = await shadowService.calculateShadows({
      centerX: 430949.12,
      centerY: 4661352.89,
      bufferMeters: 50
    });

    console.log(`Found ${result.data.length} shadows`);
    console.log(result.data);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## 📊 Endpoints API

### GET /api/shadows/health
Verifica que el servicio está disponible.

### GET /api/shadows/get-buildings
Obtiene edificios en un área.

**Query params:**
- `centerX`: Coordenada X (UTM)
- `centerY`: Coordenada Y (UTM)
- `bufferMeters`: Radio en metros (opcional, default: 100)

### GET /api/shadows/get-buildings-for-parcel/:refcat
Obtiene edificios alrededor de una parcela catastral.

**Path params:**
- `refcat`: Referencia catastral (14 caracteres)

**Query params:**
- `bufferMeters`: Radio en metros (opcional, default: 100)

## 🔧 Algoritmo

1. **Obtener construcciones**: Se consulta Supabase para obtener todos los edificios en un radio del punto de referencia
2. **Convertir a paredes 3D**: Cada polígono del catastro se convierte en paredes verticales (cuadriláteros 3D)
3. **Calcular altura**: Se extrae el número de plantas del código catastral (números romanos) y se multiplica por 3m
4. **Proyectar sombras**: Para cada pared, se calculan los ángulos azimut y elevación de sus 4 esquinas respecto al punto de referencia
5. **Manejar meridiano norte**: Las paredes que cruzan el meridiano norte (dx=0) se dividen en dos
6. **Limpiar redundancias**: Se eliminan sombras contenidas en otras o que no aportan información

## ⚠️ Notas Importantes

1. **SRID**: El sistema usa SRID 25831 (UTM Zone 31N). Ajusta en el SQL si usas otra zona UTM.
2. **Altura por defecto**: Se asume 3 metros por planta. Puedes ajustar en `catastroPolygonTo3dWalls.ts`.
3. **Overhangs**: Por ahora no se usan obstáculos adicionales (overhangs). El array se pasa vacío.
4. **Performance**: Para áreas grandes (>200m), el cálculo puede tardar. Considera usar un worker.

## 🐛 Troubleshooting

### Error: "Supabase RPC function not found"
- Verifica que ejecutaste el SQL en Supabase
- Confirma que la función `get_intersecting_geometries` existe
- Revisa los permisos: `GRANT EXECUTE ON FUNCTION get_intersecting_geometries TO anon, authenticated;`

### Error: "No buildings found"
- Verifica las coordenadas (deben estar en UTM, no lat/lon)
- Aumenta el `bufferMeters`
- Confirma que existen datos en `shapefile.constru` para esa área

### Sombras extrañas o incorrectas
- Verifica que los datos del catastro tienen geometría válida
- Revisa que el campo `constru` contiene números romanos (I, II, III, etc.)
- Comprueba el SRID de tus datos

## 📚 Referencias

- Sistema de coordenadas UTM: https://es.wikipedia.org/wiki/Universal_Transverse_Mercator
- Números romanos en catastro: Indican el número de plantas del edificio
- Coordenadas solares: https://en.wikipedia.org/wiki/Solar_azimuth_angle
