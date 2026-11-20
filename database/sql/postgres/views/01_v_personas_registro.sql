-- ============================================
-- V_PERSONAS_REGISTRO: una fila por persona, como una fila del Excel.
-- Datos del expediente + persona + nombres de catálogo. EDAD se calcula
-- (no se guarda). Solo expedientes y personas activos.
-- security_invoker: respeta el RLS de las tablas (en Supabase, sin esto la
-- vista quedaría expuesta por la API REST).
-- ============================================
-- DROP … CASCADE para poder cambiar columnas; las views 02–05 dependen de esta y se
-- vuelven a crear a continuación (mismo db:setup).
DROP VIEW IF EXISTS "V_PERSONAS_REGISTRO" CASCADE;
CREATE VIEW "V_PERSONAS_REGISTRO" WITH (security_invoker = true) AS
SELECT
    p."ID_PERSONA",
    e."ID_EXPEDIENTE",
    e."NRO_EXPEDIENTE",
    e."FECHA_SOLICITUD",
    EXTRACT(YEAR FROM e."FECHA_SOLICITUD")::INT AS "ANIO",
    e."TIPO_TRAMITE",
    e."ID_ORIGEN",
    o."NOMBRE" AS "ORIGEN",
    e."ARCHIVO_RUTA",
    e."ARCHIVO_NOMBRE",
    e."OBSERVACIONES",
    p."ES_TITULAR",
    p."ID_PARENTESCO",
    pa."NOMBRE" AS "PARENTESCO",
    pa."ORDEN" AS "ORDEN_PARENTESCO",
    p."APELLIDO_PATERNO",
    p."APELLIDO_MATERNO",
    p."NOMBRES",
    p."SEXO",
    p."ID_NACIONALIDAD",
    n."NOMBRE" AS "NACIONALIDAD",
    p."FECHA_NACIMIENTO",
    DATE_PART('year', AGE(p."FECHA_NACIMIENTO"))::INT AS "EDAD",
    p."ID_TIPO_DOCUMENTO",
    td."NOMBRE" AS "TIPO_DOCUMENTO",
    p."NRO_DOCUMENTO",
    p."ID_ESTADO",
    es."NOMBRE" AS "ESTADO",
    es."COLOR" AS "ESTADO_COLOR",
    es."ORDEN" AS "ESTADO_ORDEN"
FROM "PERSONAS" p
JOIN "EXPEDIENTES" e ON e."ID_EXPEDIENTE" = p."ID_EXPEDIENTE"
JOIN "ORIGENES" o ON o."ID_ORIGEN" = e."ID_ORIGEN"
JOIN "PARENTESCOS" pa ON pa."ID_PARENTESCO" = p."ID_PARENTESCO"
LEFT JOIN "NACIONALIDADES" n ON n."ID_NACIONALIDAD" = p."ID_NACIONALIDAD"
LEFT JOIN "TIPOS_DOCUMENTO" td ON td."ID_TIPO_DOCUMENTO" = p."ID_TIPO_DOCUMENTO"
LEFT JOIN "ESTADOS" es ON es."ID_ESTADO" = p."ID_ESTADO"
WHERE p."ACTIVO" AND e."ACTIVO";
