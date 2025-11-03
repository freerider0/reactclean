# MediaUploader Component

Componente React para subir archivos multimedia con funcionalidad de drag & drop, vista previa de miniaturas y validación de archivos.

## Características

- 🎯 Drag & drop de archivos
- 🖼️ Vista previa de miniaturas (imágenes, videos, audio)
- ✅ Validación de tipo y tamaño de archivo
- 📊 Barra de progreso de subida
- 🎨 Diseño moderno con Tailwind CSS
- ♿ Accesible y responsive
- 🔧 Totalmente personalizable

## Estructura de archivos

```
MediaUploader/
├── MediaUploader.tsx      # Componente principal
├── useMediaUploader.ts    # Hook con la lógica del componente
├── types.ts               # Definiciones de tipos TypeScript
├── utils.ts               # Funciones auxiliares
├── index.ts               # Exportaciones públicas
└── README.md              # Esta documentación
```

## Instalación

El componente está self-contained en esta carpeta. No requiere instalación adicional más allá de las dependencias del proyecto principal.

## Uso básico

```tsx
import { MediaUploader } from '@/components/MediaUploader';

function MyComponent() {
  const handleUpload = async (files: File[]) => {
    // Aquí va tu lógica de subida
    console.log('Archivos a subir:', files);

    // Ejemplo: subir a un servidor
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
  };

  return (
    <MediaUploader
      onUpload={handleUpload}
      maxFiles={10}
      maxFileSizeMB={5}
    />
  );
}
```

## Props

### `MediaUploaderProps`

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `acceptedTypes` | `MediaFileType[]` | `['image', 'video', 'audio']` | Tipos de archivos permitidos |
| `maxFileSizeMB` | `number` | `10` | Tamaño máximo de archivo en MB |
| `maxFiles` | `number` | `5` | Número máximo de archivos |
| `onUpload` | `(files: File[]) => Promise<void> \| void` | `undefined` | Callback cuando se suben archivos |
| `onRemove` | `(fileId: string) => void` | `undefined` | Callback cuando se remueven archivos |
| `initialFiles` | `MediaFile[]` | `[]` | Archivos iniciales |
| `disabled` | `boolean` | `false` | Deshabilitar el componente |
| `dropzoneText` | `string` | `'Arrastra archivos aquí...'` | Texto personalizado para la zona de drop |
| `showFileList` | `boolean` | `true` | Mostrar lista de archivos |

## Tipos

### `MediaFileType`

```typescript
type MediaFileType = 'image' | 'video' | 'audio';
```

### `MediaFile`

```typescript
interface MediaFile {
  id: string;
  file: File;
  type: MediaFileType;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}
```

## Ejemplos de uso

### Solo imágenes

```tsx
<MediaUploader
  acceptedTypes={['image']}
  maxFiles={5}
  maxFileSizeMB={2}
  dropzoneText="Arrastra tus imágenes aquí"
  onUpload={handleUpload}
/>
```

### Con manejo de errores

```tsx
<MediaUploader
  onUpload={async (files) => {
    try {
      await uploadToServer(files);
    } catch (error) {
      console.error('Error al subir:', error);
      throw error; // El componente mostrará el error
    }
  }}
  onRemove={(fileId) => {
    console.log('Archivo removido:', fileId);
  }}
/>
```

### Con archivos iniciales

```tsx
const initialFiles: MediaFile[] = [
  {
    id: '1',
    file: existingFile,
    type: 'image',
    previewUrl: 'https://example.com/image.jpg',
    status: 'success',
    progress: 100,
  },
];

<MediaUploader
  initialFiles={initialFiles}
  onUpload={handleUpload}
/>
```

### Sin lista de archivos (solo dropzone)

```tsx
<MediaUploader
  showFileList={false}
  onUpload={handleUpload}
/>
```

## Hook personalizado: `useMediaUploader`

Si necesitas más control, puedes usar el hook directamente:

```tsx
import { useMediaUploader } from '@/components/MediaUploader';

function CustomUploader() {
  const {
    files,
    dragState,
    errors,
    fileInputRef,
    handleFileInput,
    handleDrop,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    removeFile,
    openFileDialog,
    clearError,
    clearAllErrors,
  } = useMediaUploader({
    acceptedTypes: ['image'],
    maxFileSizeMB: 10,
    maxFiles: 5,
    onUpload: handleUpload,
  });

  // Construye tu propia UI con los valores y handlers del hook
  return (
    <div>
      {/* Tu UI personalizada aquí */}
    </div>
  );
}
```

## Utilidades disponibles

El componente exporta varias funciones auxiliares que puedes usar:

```typescript
import {
  getMediaType,
  isFileTypeAccepted,
  isFileSizeValid,
  createPreviewUrl,
  formatFileSize,
  generateFileId,
  getAcceptString,
  validateFiles,
} from '@/components/MediaUploader';

// Ejemplo
const mediaType = getMediaType(file);
const isValid = isFileSizeValid(file, 10);
const formattedSize = formatFileSize(file.size);
```

## Estilos

El componente usa Tailwind CSS y sigue la paleta de colores del proyecto:

- **Azul** (`blue-500`): Acciones principales y estados activos
- **Verde** (`green-500`): Estados de éxito
- **Rojo** (`red-500`): Errores y eliminación
- **Gris**: Estados neutros y deshabilitados

Los estilos están completamente integrados en el componente y no requieren CSS adicional.

## Compatibilidad con navegadores

- Chrome/Edge: ✅ Completo
- Firefox: ✅ Completo
- Safari: ✅ Completo
- Mobile browsers: ✅ Con limitaciones en drag & drop (usa el selector de archivos nativo)

## Notas técnicas

### Vista previa de videos

Para videos, el componente intenta capturar un frame del video (segundo 1) como miniatura. Si falla, usa la URL del video directamente.

### Vista previa de audio

Los archivos de audio no tienen vista previa visual real, se muestra un icono representativo.

### Gestión de memoria

Las URLs de vista previa (`blob:` URLs) se limpian automáticamente cuando se remueven archivos para evitar fugas de memoria.

### Límite de archivos

Cuando se alcanza el límite de archivos (`maxFiles`), el componente automáticamente rechaza archivos adicionales y muestra un error informativo.

## Personalización avanzada

Si necesitas personalizar los estilos, puedes:

1. **Modificar las clases de Tailwind** directamente en `MediaUploader.tsx`
2. **Usar el hook** y crear tu propia UI completamente personalizada
3. **Extender los tipos** añadiendo propiedades adicionales a `MediaFile`

## Testing

Para probar el componente:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MediaUploader } from '@/components/MediaUploader';

test('permite seleccionar archivos', async () => {
  const handleUpload = jest.fn();

  render(<MediaUploader onUpload={handleUpload} />);

  const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
  const input = screen.getByRole('input', { hidden: true });

  fireEvent.change(input, { target: { files: [file] } });

  expect(handleUpload).toHaveBeenCalledWith([file]);
});
```

## Troubleshooting

### Las vistas previas no se muestran

- Verifica que los archivos sean del tipo correcto
- Revisa la consola del navegador para errores
- Asegúrate de que el navegador soporta `FileReader` API

### Los archivos no se suben

- Verifica que el callback `onUpload` esté implementado correctamente
- Revisa que el servidor acepte `multipart/form-data`
- Comprueba los límites de tamaño del servidor

### El drag & drop no funciona en móvil

- Es una limitación del navegador. En móviles, usa el input de archivos nativo
- El componente automáticamente permite hacer clic para seleccionar archivos

## Roadmap

Posibles mejoras futuras:

- [ ] Soporte para imágenes desde cámara (móvil)
- [ ] Edición de imágenes antes de subir (recorte, rotación)
- [ ] Múltiples instancias del componente con estados compartidos
- [ ] Integración con servicios de almacenamiento (S3, Cloudinary, etc.)
- [ ] Compresión automática de imágenes
- [ ] Subida por chunks para archivos grandes

## Licencia

Este componente es parte del proyecto y sigue la misma licencia.
