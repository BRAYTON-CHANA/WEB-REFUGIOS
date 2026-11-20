-- ============================================
-- V_EXPEDIENTES_PENDIENTES: expedientes activos a los que les falta el
-- número de expediente o el archivo, con su titular.
-- ============================================
CREATE OR REPLACE VIEW "V_EXPEDIENTES_PENDIENTES" WITH (security_invoker = true) AS
SELECT
    r."ID_EXPEDIENTE",
    r."NRO_EXPEDIENTE",
    r."FECHA_SOLICITUD",
    r."ANIO",
    r."TIPO_TRAMITE",
    r."ORIGEN",
    CONCAT_WS(' ', r."APELLIDO_PATERNO", r."APELLIDO_MATERNO") AS "TITULAR_APELLIDOS",
    r."NOMBRES" AS "TITULAR_NOMBRES",
    (r."NRO_EXPEDIENTE" IS NULL) AS "SIN_NRO",
    (r."ARCHIVO_RUTA" IS NULL) AS "SIN_ARCHIVO"
FROM "V_PERSONAS_REGISTRO" r
WHERE r."ES_TITULAR" AND (r."NRO_EXPEDIENTE" IS NULL OR r."ARCHIVO_RUTA" IS NULL);
