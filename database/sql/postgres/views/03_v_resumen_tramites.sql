-- ============================================
-- V_RESUMEN_TRAMITES: expedientes, personas y menores por año y trámite
-- (equivale a las hojas del Excel: 2025, 2026, actualizaciones, renuncias).
-- ============================================
CREATE OR REPLACE VIEW "V_RESUMEN_TRAMITES" WITH (security_invoker = true) AS
SELECT
    r."ANIO",
    r."TIPO_TRAMITE",
    COUNT(DISTINCT r."ID_EXPEDIENTE")::INT AS "EXPEDIENTES",
    COUNT(*)::INT AS "PERSONAS",
    COUNT(*) FILTER (WHERE r."EDAD" < 18)::INT AS "MENORES"
FROM "V_PERSONAS_REGISTRO" r
GROUP BY r."ANIO", r."TIPO_TRAMITE";
