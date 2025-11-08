/**
 * Shadow Service
 * Client service for calculating shadows from cadastral data
 * This service uses local calculation with data from Supabase
 */

import type {
  ShadowCalculationRequest,
  ShadowCalculationResponse,
  CatastroBuilding,
  Shadow,
  Point3D,
} from '@/types/shadow';
import { getShadowsForAPoint } from '@/utils/shadows/shadowDriver';
import { createClient } from '@/lib/supabase';

class ShadowService {
  private supabase;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Calculate shadows for a specific point
   * @param request - Shadow calculation request parameters
   * @returns Array of shadows with query metadata
   */
  async calculateShadows(
    request: ShadowCalculationRequest
  ): Promise<ShadowCalculationResponse> {
    const {
      centerX,
      centerY,
      centerZ = 0,
      bufferMeters = 100,
    } = request;

    // Calculate bounding box coordinates
    const bottom_left_x = centerX - bufferMeters;
    const bottom_left_y = centerY - bufferMeters;
    const top_right_x = centerX + bufferMeters;
    const top_right_y = centerY + bufferMeters;

    try {
      // Call Supabase RPC function to get intersecting geometries
      const { data: catastroBuildings, error } = await this.supabase.rpc(
        'get_intersecting_geometries',
        {
          bottom_left_x,
          bottom_left_y,
          top_right_x,
          top_right_y,
        }
      );

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      if (!catastroBuildings || catastroBuildings.length === 0) {
        return {
          message: 'No buildings found in the specified area',
          data: [],
          query: {
            center: { x: centerX, y: centerY, z: centerZ },
            buffer: bufferMeters,
            bounds: {
              bottom_left: { x: bottom_left_x, y: bottom_left_y },
              top_right: { x: top_right_x, y: top_right_y },
            },
          },
        };
      }

      // Parse the geometry data
      const buildings: CatastroBuilding[] = catastroBuildings.map((item: any) => ({
        data: {
          ...item.data,
          geom: typeof item.data.geom === 'string'
            ? JSON.parse(item.data.geom)
            : item.data.geom,
        },
        json_geometria: item.json_geometria,
      }));

      // Reference point for shadow calculation
      const referencePoint: Point3D = {
        x: centerX,
        y: centerY,
        z: centerZ,
      };

      // Calculate shadows
      // For now, we don't have overhangs, so we pass an empty array
      const shadows = getShadowsForAPoint(buildings, [], referencePoint);

      return {
        message: 'Shadow calculation successful',
        data: shadows,
        query: {
          center: referencePoint,
          buffer: bufferMeters,
          bounds: {
            bottom_left: { x: bottom_left_x, y: bottom_left_y },
            top_right: { x: top_right_x, y: top_right_y },
          },
        },
      };
    } catch (error) {
      console.error('Error calculating shadows:', error);
      throw new Error(
        `Failed to calculate shadows: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Calculate shadows for a cadastral reference
   * First fetches the parcel geometry, then calculates shadows
   * @param refcat - Cadastral reference (14 characters)
   * @param bufferMeters - Radius to search for nearby buildings
   * @returns Array of shadows with query metadata
   */
  async calculateShadowsForParcel(
    refcat: string,
    bufferMeters: number = 100
  ): Promise<ShadowCalculationResponse> {
    try {
      // Get parcel data including centroid
      const { data: parcelData, error: parcelError } = await this.supabase.rpc(
        'get_parcela_completa',
        { refcat_param: refcat }
      );

      if (parcelError) {
        throw new Error(`Error fetching parcel: ${parcelError.message}`);
      }

      if (!parcelData || !parcelData.parcela?.geometria?.coordenadas) {
        throw new Error('Parcel not found or missing geometry');
      }

      const { x, y } = parcelData.parcela.geometria.coordenadas;

      // Calculate shadows using the parcel's centroid
      return this.calculateShadows({
        centerX: x,
        centerY: y,
        centerZ: 0,
        bufferMeters,
      });
    } catch (error) {
      console.error('Error calculating shadows for parcel:', error);
      throw new Error(
        `Failed to calculate shadows for parcel: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get raw building data for debugging
   * @param request - Shadow calculation request parameters
   * @returns Array of buildings with geometry
   */
  async getBuildingsInArea(
    request: ShadowCalculationRequest
  ): Promise<CatastroBuilding[]> {
    const { centerX, centerY, bufferMeters = 100 } = request;

    const bottom_left_x = centerX - bufferMeters;
    const bottom_left_y = centerY - bufferMeters;
    const top_right_x = centerX + bufferMeters;
    const top_right_y = centerY + bufferMeters;

    try {
      const { data, error } = await this.supabase.rpc('get_intersecting_geometries', {
        bottom_left_x,
        bottom_left_y,
        top_right_x,
        top_right_y,
      });

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      return (data || []).map((item: any) => ({
        data: {
          ...item.data,
          geom: typeof item.data.geom === 'string'
            ? JSON.parse(item.data.geom)
            : item.data.geom,
        },
        json_geometria: item.json_geometria,
      }));
    } catch (error) {
      console.error('Error fetching buildings:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const shadowService = new ShadowService();
export default shadowService;
