-- =============================================================================
-- SUPABASE RPC FUNCTION FOR SHADOW CALCULATION
-- =============================================================================
-- Function to get geometries that intersect with a specified bounding box
-- This function is designed to work with Supabase and returns data in a format
-- suitable for shadow calculation
-- =============================================================================

-- Drop function if it exists (for updates)
DROP FUNCTION IF EXISTS get_intersecting_geometries(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);

-- Create the function
CREATE OR REPLACE FUNCTION get_intersecting_geometries(
    bottom_left_x DOUBLE PRECISION,
    bottom_left_y DOUBLE PRECISION,
    top_right_x DOUBLE PRECISION,
    top_right_y DOUBLE PRECISION
)
RETURNS TABLE (
    -- Returns all columns from shapefile.constru as a JSONB object
    -- This makes it easy to consume from client libraries
    data jsonb,
    -- The geometry in GeoJSON format for easy visualization
    json_geometria text
)
SECURITY DEFINER -- This ensures the function runs with the permissions of the creator
SET search_path = public -- Prevents search path attacks
AS $$
BEGIN
    RETURN QUERY
    SELECT
        to_jsonb(c.*) as data,
        ST_AsGeoJSON(c.geom) as json_geometria
    FROM shapefile.constru c
    WHERE ST_Intersects(
        c.geom,
        ST_MakeEnvelope(
            bottom_left_x,
            bottom_left_y,
            top_right_x,
            top_right_y,
            25831  -- UTM Zone 31N SRID (adjust if needed)
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_intersecting_geometries TO anon, authenticated;

-- =============================================================================
-- TESTING THE FUNCTION
-- =============================================================================
-- Uncomment and run this to test your function:
-- Replace coordinates with actual values from your area

-- Test: Get constructions in a 200m x 200m box
-- SELECT * FROM get_intersecting_geometries(430900, 4581900, 431100, 4582100);

-- =============================================================================
-- NOTES:
-- =============================================================================
-- 1. This function uses SECURITY DEFINER to run with the privileges of the
--    function creator, allowing access to tables even if RLS is enabled.
--
-- 2. Function is granted to both 'anon' and 'authenticated' roles for
--    public and logged-in access.
--
-- 3. Returns JSON for easy consumption by the frontend/API.
--
-- 4. The function uses ST_Intersects to find all constructions that overlap
--    with the specified bounding box.
--
-- 5. SRID 25831 is UTM Zone 31N. Adjust if your cadastre uses a different
--    coordinate reference system.
--
-- 6. The shapefile.constru table must exist and contain:
--    - gid: unique identifier
--    - area: area of the construction
--    - geom: geometry (MultiPolygon)
--    - refcat: cadastral reference
--    - constru: construction type (contains Roman numerals for floors)
--
-- =============================================================================
