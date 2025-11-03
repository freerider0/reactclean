/**
 * Catastro API Service
 * Client for accessing Spanish cadastral data via the API server
 */

import type {
  ParcelaResponse,
  ParcelaCompleta,
  ParcelaColindante,
  ParcelaCercana,
  DatabaseStats,
} from '@/types/catastro';

// Get API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class CatastroApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/api/catastro`;
  }

  /**
   * Check if catastro API is available
   */
  async healthCheck(): Promise<{ status: string; service: string; supabase: boolean }> {
    const response = await fetch(`${this.baseURL}/health`);
    if (!response.ok) {
      throw new Error('Catastro API not available');
    }
    return response.json();
  }

  /**
   * Find parcel by coordinates (for map click queries)
   * @param x - X coordinate in UTM
   * @param y - Y coordinate in UTM
   * @param srid - Spatial Reference ID (25828-25831)
   * @returns Parcel data or null if not found
   */
  async buscarParcelaPorCoordenadas(
    x: number,
    y: number,
    srid: number
  ): Promise<ParcelaResponse | null> {
    try {
      const response = await fetch(
        `${this.baseURL}/buscar-parcela-por-coordenadas?x=${x}&y=${y}&srid=${srid}`
      );

      if (response.status === 404) {
        return null; // No parcel found
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al buscar parcela');
      }

      return response.json();
    } catch (error) {
      console.error('Error in buscarParcelaPorCoordenadas:', error);
      throw error;
    }
  }

  /**
   * Get complete parcel data by cadastral reference
   * @param refcat - 14-character cadastral reference
   * @returns Complete parcel data
   */
  async getParcela(refcat: string): Promise<ParcelaCompleta> {
    if (refcat.length !== 14) {
      throw new Error('La referencia catastral debe tener 14 caracteres');
    }

    const response = await fetch(`${this.baseURL}/parcela/${refcat.toUpperCase()}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`No se encontró la parcela con referencia ${refcat}`);
      }
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener parcela');
    }

    return response.json();
  }

  /**
   * Get adjacent parcels (sharing boundaries)
   * @param refcat - 14-character cadastral reference
   * @returns Array of adjacent parcels
   */
  async getParcelasColindantes(refcat: string): Promise<ParcelaColindante[]> {
    if (refcat.length !== 14) {
      throw new Error('La referencia catastral debe tener 14 caracteres');
    }

    const response = await fetch(
      `${this.baseURL}/parcelas/colindantes/${refcat.toUpperCase()}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener parcelas colindantes');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  /**
   * Get nearby parcels within radius
   * @param refcat - 14-character cadastral reference
   * @param radio - Radius in meters (default: 50)
   * @param limit - Max number of results (default: 10)
   * @returns Array of nearby parcels
   */
  async getParcelasCercanas(
    refcat: string,
    radio: number = 50,
    limit: number = 10
  ): Promise<ParcelaCercana[]> {
    if (refcat.length !== 14) {
      throw new Error('La referencia catastral debe tener 14 caracteres');
    }

    const response = await fetch(
      `${this.baseURL}/parcelas/cercanas/${refcat.toUpperCase()}?radio=${radio}&limit=${limit}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener parcelas cercanas');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  /**
   * Get database statistics
   * @returns Database counts
   */
  async getStats(): Promise<DatabaseStats> {
    const response = await fetch(`${this.baseURL}/stats`);

    if (!response.ok) {
      throw new Error('Error al obtener estadísticas');
    }

    return response.json();
  }

  /**
   * Format cadastral reference (ensure uppercase and correct length)
   * @param refcat - Raw cadastral reference
   * @returns Formatted reference
   */
  static formatRefcat(refcat: string): string {
    return refcat.toUpperCase().trim();
  }

  /**
   * Validate cadastral reference format
   * @param refcat - Cadastral reference to validate
   * @returns true if valid
   */
  static isValidRefcat(refcat: string): boolean {
    const cleaned = refcat.trim();
    return cleaned.length === 14 || cleaned.length === 20;
  }

  /**
   * Extract parcel reference from complete reference
   * @param refcatCompleta - 20-character complete reference
   * @returns 14-character parcel reference
   */
  static extractParcelRefcat(refcatCompleta: string): string {
    if (refcatCompleta.length === 20) {
      return refcatCompleta.substring(0, 14);
    }
    return refcatCompleta;
  }
}

// Export singleton instance
export const catastroApi = new CatastroApiService();

// Export class for testing
export default CatastroApiService;
