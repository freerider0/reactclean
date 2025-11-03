import React from 'react';
import { Helmet } from 'react-helmet-async';
import { MediaGalleryPage } from '@/pages/media-gallery';

// Esta página redirige a la galería de medios existente pero con contexto de propiedades
export const GaleriaPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Galería de Propiedades | Sistema Inmobiliario</title>
      </Helmet>
      <MediaGalleryPage />
    </>
  );
};

export default GaleriaPage;
