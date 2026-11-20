-- ============================================
-- V_RESUMEN_ESTADOS: personas por estado (color del Excel), año y trámite.
-- ID_ESTADO NULL = sin estado.
-- ============================================
CREATE OR REPLACE VIEW "V_RESUMEN_ESTADOS" WITH (security_invoker = true) AS
SELECT
    r."ANIO",
    r."TIPO_TRAMITE",
    r."ID_ESTADO",
    r."ESTADO",
    r."ESTADO_COLOR" AS "COLOR",
    r."ESTADO_ORDEN" AS "ORDEN",
    COUNT(*)::INT AS "PERSONAS"
FROM "V_PERSONAS_REGISTRO" r
GROUP BY r."ANIO", r."TIPO_TRAMITE", r."ID_ESTADO", r."ESTADO", r."ESTADO_COLOR", r."ESTADO_ORDEN";
