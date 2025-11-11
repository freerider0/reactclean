/**
 * Aperture utilities - helpers for working with doors and windows
 */

import type { Aperture, FloorplanConfig, GlassType, WindowColor, WindowMaterial } from '../types';

/**
 * Get effective aperture properties with config defaults fallback
 * Properties that are undefined inherit from config.apertureDefaults
 */
export function getApertureProperties(aperture: Aperture, config: FloorplanConfig) {
  const defaults = config.apertureDefaults || {
    cristal: 'doble' as GlassType,
    color: 'blanco' as WindowColor,
    material: 'pvc' as WindowMaterial,
    persiana: false,
    porcentajeMarcoVentana: 20,
    porcentajeMarcoPuerta: 100
  };

  return {
    // Basic properties (always defined)
    id: aperture.id,
    type: aperture.type,
    anchorVertex: aperture.anchorVertex,
    distance: aperture.distance,
    width: aperture.width,
    height: aperture.height,
    sillHeight: aperture.sillHeight,

    // Material properties with defaults fallback
    cristal: aperture.cristal ?? (aperture.type === 'window' ? defaults.cristal : undefined),
    color: aperture.color ?? defaults.color,
    material: aperture.material ?? defaults.material,
    persiana: aperture.persiana ?? (aperture.type === 'window' ? defaults.persiana : undefined),
    porcentajeMarco: aperture.porcentajeMarco ?? (aperture.type === 'door'
      ? defaults.porcentajeMarcoPuerta
      : defaults.porcentajeMarcoVentana)
  };
}

/**
 * Check if an aperture has any custom (non-default) properties
 */
export function hasCustomProperties(aperture: Aperture): boolean {
  return !!(
    aperture.cristal !== undefined ||
    aperture.color !== undefined ||
    aperture.material !== undefined ||
    aperture.persiana !== undefined ||
    aperture.porcentajeMarco !== undefined
  );
}
