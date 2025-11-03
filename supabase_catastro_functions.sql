-- =============================================================================
-- SUPABASE RPC FUNCTIONS FOR CATASTRO MAP
-- =============================================================================
-- Run this in your Supabase SQL Editor to create the functions needed for
-- the cadastral map implementation
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Function 1: buscar_parcela_por_coordenadas
-- Purpose: Find parcel containing a clicked point (for map click queries)
-- Parameters: x, y coordinates and SRID
-- Returns: Complete parcel data as JSON
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION buscar_parcela_por_coordenadas(
  x_coord DOUBLE PRECISION,
  y_coord DOUBLE PRECISION,
  srid_value INTEGER DEFAULT 25831
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'refcat', p.refcat,
    'area', p.area,
    'coordenadas', json_build_object(
      'x', ST_X(ST_Centroid(p.geom)),
      'y', ST_Y(ST_Centroid(p.geom))
    ),
    'wkt', ST_AsText(p.geom),
    'srid', ST_SRID(p.geom),
    'epsg', 'EPSG:' || ST_SRID(p.geom),
    'datos_finca', (
      SELECT row_to_json(f.*)
      FROM public.finca f
      WHERE f.parcela_catastral = p.refcat
      LIMIT 1
    ),
    'estadisticas', (
      SELECT json_build_object(
        'total_inmuebles', COUNT(*),
        'superficie_total', SUM(COALESCE(superficie_elementos_constructivos, 0))
      )
      FROM public.inmueble
      WHERE referencia_catastral_parcela = p.refcat
    )
  ) INTO result
  FROM shapefile.parcela p
  WHERE ST_Contains(p.geom, ST_SetSRID(ST_MakePoint(x_coord, y_coord), srid_value))
  LIMIT 1;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION buscar_parcela_por_coordenadas TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Function 2: get_parcela_completa
-- Purpose: Get complete parcel data by 14-character cadastral reference
-- Parameters: 14-character reference (refcat)
-- Returns: Complete parcel data with properties, constructions, stats as JSON
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_parcela_completa(refcat_param VARCHAR(14))
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'refcat', p.refcat,
    'parcela', json_build_object(
      'datos_finca', (
        SELECT row_to_json(f.*)
        FROM public.finca f
        WHERE f.parcela_catastral = refcat_param
        LIMIT 1
      ),
      'geometria', json_build_object(
        'area', p.area,
        'coordenadas', json_build_object(
          'x', ST_X(ST_Centroid(p.geom)),
          'y', ST_Y(ST_Centroid(p.geom))
        ),
        'wkt', ST_AsText(p.geom),
        'srid', ST_SRID(p.geom),
        'epsg', 'EPSG:' || ST_SRID(p.geom)
      )
    ),
    'inmuebles', (
      SELECT COALESCE(json_agg(json_build_object(
        'refcat_completa', i.referencia_catastral_parcela ||
          LPAD(i.numero_secuencial_bien_inmueble::TEXT, 4, '0') ||
          i.primer_caracter_control ||
          i.segundo_caracter_control,
        'direccion', CONCAT(
          COALESCE(i.tipo_via_inmueble, ''), ' ',
          COALESCE(i.nombre_via_inmueble, ''), ' ',
          COALESCE(i.primer_numero_policia_inmueble::TEXT, '')
        ),
        'escalera', i.escalera,
        'planta', i.planta,
        'puerta', i.puerta,
        'superficie', i.superficie_elementos_constructivos
      )), '[]'::json)
      FROM public.inmueble i
      WHERE i.referencia_catastral_parcela = refcat_param
    ),
    'construcciones_geometria', (
      SELECT COALESCE(json_agg(json_build_object(
        'tipo', c.constru,
        'wkt', ST_AsText(c.geom),
        'area', c.area,
        'tipo_suelo', c.tipo,
        'fecha_alta', c.fechaalta,
        'coorx', c.coorx,
        'coory', c.coory
      )), '[]'::json)
      FROM shapefile.constru c
      WHERE c.refcat = refcat_param
    ),
    'estadisticas', json_build_object(
      'total_inmuebles', (
        SELECT COUNT(*)
        FROM public.inmueble
        WHERE referencia_catastral_parcela = refcat_param
      ),
      'superficie_total', (
        SELECT COALESCE(SUM(superficie_elementos_constructivos), 0)
        FROM public.inmueble
        WHERE referencia_catastral_parcela = refcat_param
      )
    )
  ) INTO result
  FROM shapefile.parcela p
  WHERE p.refcat = refcat_param
  LIMIT 1;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_parcela_completa TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Function 3: get_parcelas_colindantes
-- Purpose: Get adjacent parcels (sharing boundaries) for a given parcel
-- Parameters: 14-character reference (refcat)
-- Returns: Array of adjacent parcels with shared boundary length as JSON
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_parcelas_colindantes(refcat_param VARCHAR(14))
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(json_agg(json_build_object(
    'refcat', p2.refcat,
    'area', p2.area,
    'longitud_frontera', ROUND(ST_Length(ST_Intersection(p1.geom, p2.geom))::NUMERIC, 2)
  )), '[]'::json) INTO result
  FROM shapefile.parcela p1
  INNER JOIN shapefile.parcela p2 ON ST_Touches(p1.geom, p2.geom)
  WHERE p1.refcat = refcat_param
  ORDER BY ST_Length(ST_Intersection(p1.geom, p2.geom)) DESC;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_parcelas_colindantes TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Function 4: get_parcelas_cercanas
-- Purpose: Get nearby parcels within a radius (for proximity analysis)
-- Parameters: 14-character reference, radius in meters, limit
-- Returns: Array of nearby parcels with distance as JSON
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_parcelas_cercanas(
  refcat_param VARCHAR(14),
  radio_metros INTEGER DEFAULT 50,
  limite INTEGER DEFAULT 10
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(json_agg(json_build_object(
    'refcat', p2.refcat,
    'area', p2.area,
    'distancia', ROUND(ST_Distance(p1.geom, p2.geom)::NUMERIC, 2)
  )), '[]'::json) INTO result
  FROM shapefile.parcela p1
  CROSS JOIN shapefile.parcela p2
  WHERE p1.refcat = refcat_param
    AND p2.refcat != refcat_param
    AND ST_DWithin(p1.geom, p2.geom, radio_metros)
  ORDER BY ST_Distance(p1.geom, p2.geom)
  LIMIT limite;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_parcelas_cercanas TO anon, authenticated;

-- =============================================================================
-- TESTING THE FUNCTIONS
-- =============================================================================
-- Uncomment and run these to test your functions:

-- Test 1: Find parcel by coordinates
-- SELECT buscar_parcela_por_coordenadas(430000, 4580000, 25831);

-- Test 2: Get complete parcel data
-- SELECT get_parcela_completa('7623209DF2872D');

-- Test 3: Get adjacent parcels
-- SELECT get_parcelas_colindantes('7623209DF2872D');

-- Test 4: Get nearby parcels
-- SELECT get_parcelas_cercanas('7623209DF2872D', 100, 10);

-- =============================================================================
-- NOTES:
-- =============================================================================
-- 1. These functions use SECURITY DEFINER to run with the privileges of the
--    function creator, allowing access to tables even if RLS is enabled.
--
-- 2. Functions are granted to both 'anon' and 'authenticated' roles for
--    public and logged-in access.
--
-- 3. All functions return JSON for easy consumption by the API/frontend.
--
-- 4. The functions handle NULL values with COALESCE to prevent errors.
--
-- 5. ST_* functions are PostGIS spatial operations:
--    - ST_Contains: Check if point is inside polygon
--    - ST_Touches: Check if polygons share a boundary
--    - ST_DWithin: Check if features are within distance
--    - ST_Distance: Calculate distance between features
--    - ST_Intersection: Get intersection geometry
--    - ST_Length: Calculate length of lines/boundaries
--
-- =============================================================================
