import { MediaFileType } from './types';

/**
 * Determina el tipo de archivo multimedia
 */
export const getMediaType = (file: File): MediaFileType | null => {
  const type = file.type.split('/')[0];
  const fullType = file.type;

  if (type === 'image') return 'image';
  if (type === 'video') return 'video';
  if (type === 'audio') return 'audio';
  if (fullType === 'application/pdf') return 'pdf';

  return null;
};

/**
 * Valida si el tipo de archivo es aceptado
 */
export const isFileTypeAccepted = (
  file: File,
  acceptedTypes: MediaFileType[]
): boolean => {
  const mediaType = getMediaType(file);
  return mediaType !== null && acceptedTypes.includes(mediaType);
};

/**
 * Valida el tamaño del archivo
 */
export const isFileSizeValid = (file: File, maxSizeMB: number): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * Crea una URL de preview para el archivo
 */
export const createPreviewUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const mediaType = getMediaType(file);

    if (!mediaType) {
      reject(new Error('Tipo de archivo no soportado'));
      return;
    }

    if (mediaType === 'image') {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else if (mediaType === 'video') {
      // Para videos, usamos un frame del video como preview
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;

      video.onloadedmetadata = () => {
        video.currentTime = 1; // Capturar frame en el segundo 1
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL());
        } else {
          // Fallback: usar URL del video directamente
          resolve(URL.createObjectURL(file));
        }

        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        // Fallback: usar URL del video directamente
        resolve(URL.createObjectURL(file));
      };

      video.src = URL.createObjectURL(file);
    } else if (mediaType === 'audio') {
      // Para audio, no hay preview visual real, pero podemos retornar un placeholder
      resolve('audio-placeholder');
    } else if (mediaType === 'pdf') {
      // Para PDF, usamos la primera página como preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // Si pdfjs está disponible, lo usamos
          if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
            const pdfjsLib = (window as any).pdfjsLib;
            console.log('PDF.js is available, rendering preview...');

            const loadingTask = pdfjsLib.getDocument({ data: e.target?.result });
            const pdf = await loadingTask.promise;
            console.log('PDF loaded, pages:', pdf.numPages);

            const page = await pdf.getPage(1);
            console.log('First page loaded');

            const scale = 1.5;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
              await page.render({ canvasContext: context, viewport }).promise;
              const dataUrl = canvas.toDataURL();
              console.log('PDF preview generated successfully');
              resolve(dataUrl);
            } else {
              console.warn('Failed to get 2D context for PDF canvas');
              resolve('pdf-placeholder');
            }
          } else {
            // Fallback: usar placeholder
            console.warn('PDF.js not available, using placeholder');
            resolve('pdf-placeholder');
          }
        } catch (error) {
          console.error('Error generating PDF preview:', error);
          resolve('pdf-placeholder');
        }
      };
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        resolve('pdf-placeholder');
      };
      reader.readAsArrayBuffer(file);
    }
  });
};

/**
 * Formatea el tamaño del archivo
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Genera un ID único para archivos
 */
export const generateFileId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Obtiene el accept string para el input file
 */
export const getAcceptString = (acceptedTypes: MediaFileType[]): string => {
  const acceptMap: Record<MediaFileType, string> = {
    image: 'image/*',
    video: 'video/*',
    audio: 'audio/*',
    pdf: 'application/pdf',
  };

  return acceptedTypes.map(type => acceptMap[type]).join(',');
};

/**
 * Valida múltiples archivos
 */
export const validateFiles = (
  files: File[],
  acceptedTypes: MediaFileType[],
  maxSizeMB: number
): { valid: File[]; errors: Array<{ file: File; error: string }> } => {
  const valid: File[] = [];
  const errors: Array<{ file: File; error: string }> = [];

  files.forEach(file => {
    if (!isFileTypeAccepted(file, acceptedTypes)) {
      errors.push({
        file,
        error: `Tipo de archivo no permitido. Permitidos: ${acceptedTypes.join(', ')}`,
      });
    } else if (!isFileSizeValid(file, maxSizeMB)) {
      errors.push({
        file,
        error: `Archivo demasiado grande. Máximo: ${maxSizeMB}MB`,
      });
    } else {
      valid.push(file);
    }
  });

  return { valid, errors };
};
