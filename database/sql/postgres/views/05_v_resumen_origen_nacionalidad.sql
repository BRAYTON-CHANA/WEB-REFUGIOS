-- ============================================
-- Resúmenes por origen (Mesa de partes, ODE…) y por nacionalidad.
-- ============================================
CREATE OR REPLACE VIEW "V_RESUMEN_ORIGENES" WITH (security_invoker = true) AS
SELECT
    r."ANIO",
    r."TIPO_TRAMITE",
    r."ID_ORIGEN",
    r."ORIGEN",
    COUNT(DISTINCT r."ID_EXPEDIENTE")::INT AS "EXPEDIENTES",
    COUNT(*)::INT AS "PERSONAS"
FROM "V_PERSONAS_REGISTRO" r
GROUP BY r."ANIO", r."TIPO_TRAMITE", r."ID_ORIGEN", r."ORIGEN";

CREATE OR REPLACE VIEW "V_RESUMEN_NACIONALIDADES" WITH (security_invoker = true) AS
SELECT
    r."ANIO",
    r."TIPO_TRAMITE",
    r."ID_NACIONALIDAD",
    COALESCE(r."NACIONALIDAD", 'SIN DATO') AS "NACIONALIDAD",
    COUNT(*)::INT AS "PERSONAS",
    COUNT(*) FILTER (WHERE r."EDAD" < 18)::INT AS "MENORES"
FROM "V_PERSONAS_REGISTRO" r
GROUP BY r."ANIO", r."TIPO_TRAMITE", r."ID_NACIONALIDAD", r."NACIONALIDAD";
