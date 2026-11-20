-- ============================================
-- DATOS DE DEMOSTRACIÓN — personas y documentos FICTICIOS.
-- Reproducen los casos del Excel original:
--   titular solo · titular con 2 hijas · titular + cónyuge + hijo con
--   apellidos distintos · solicitud aún sin número de expediente.
-- BORRAR este archivo antes de instalar en producción.
-- ============================================
DO $$
DECLARE
    o_virtual INT := (SELECT "ID_ORIGEN" FROM "ORIGENES" WHERE "NOMBRE" = 'MESA DE PARTES VIRTUAL');
    o_ode     INT := (SELECT "ID_ORIGEN" FROM "ORIGENES" WHERE "NOMBRE" = 'ODE MOQUEGUA');
    p_tit     INT := (SELECT "ID_PARENTESCO" FROM "PARENTESCOS" WHERE "NOMBRE" = 'TITULAR');
    p_con     INT := (SELECT "ID_PARENTESCO" FROM "PARENTESCOS" WHERE "NOMBRE" = 'CONYUGE');
    p_hijo    INT := (SELECT "ID_PARENTESCO" FROM "PARENTESCOS" WHERE "NOMBRE" = 'HIJO');
    p_hija    INT := (SELECT "ID_PARENTESCO" FROM "PARENTESCOS" WHERE "NOMBRE" = 'HIJA');
    d_ced     INT := (SELECT "ID_TIPO_DOCUMENTO" FROM "TIPOS_DOCUMENTO" WHERE "NOMBRE" = 'CEDULA DE IDENTIDAD');
    d_pas     INT := (SELECT "ID_TIPO_DOCUMENTO" FROM "TIPOS_DOCUMENTO" WHERE "NOMBRE" = 'PASAPORTE');
    d_ce      INT := (SELECT "ID_TIPO_DOCUMENTO" FROM "TIPOS_DOCUMENTO" WHERE "NOMBRE" = 'CARNET DE EXTRANJERIA');
    d_acta    INT := (SELECT "ID_TIPO_DOCUMENTO" FROM "TIPOS_DOCUMENTO" WHERE "NOMBRE" = 'ACTA DE NACIMIENTO');
    n_ven     INT := (SELECT "ID_NACIONALIDAD" FROM "NACIONALIDADES" WHERE "NOMBRE" = 'VENEZOLANA');
    e INT;
BEGIN
    IF EXISTS (SELECT 1 FROM "EXPEDIENTES" WHERE "OBSERVACIONES" LIKE 'DEMO%') THEN RETURN; END IF;

    -- Titular solo
    INSERT INTO "EXPEDIENTES" ("NRO_EXPEDIENTE", "ID_ORIGEN", "FECHA_SOLICITUD", "TIPO_TRAMITE", "OBSERVACIONES")
    VALUES ('9000001', o_virtual, '2024-04-30', 'ACTUALIZACION', 'DEMO: titular solo') RETURNING "ID_EXPEDIENTE" INTO e;
    INSERT INTO "PERSONAS" ("ID_EXPEDIENTE", "ID_PARENTESCO", "ES_TITULAR", "APELLIDO_PATERNO", "APELLIDO_MATERNO", "NOMBRES", "SEXO", "ID_NACIONALIDAD", "FECHA_NACIMIENTO", "ID_TIPO_DOCUMENTO", "NRO_DOCUMENTO")
    VALUES (e, p_tit, TRUE, 'PEREZ', 'GOMEZ', 'ANA LUCIA', 'F', n_ven, '1989-05-05', d_ced, '00123456');

    -- Titular con 2 hijas (mismo expediente, otro apellido)
    INSERT INTO "EXPEDIENTES" ("NRO_EXPEDIENTE", "ID_ORIGEN", "FECHA_SOLICITUD", "TIPO_TRAMITE", "OBSERVACIONES")
    VALUES ('9000002', o_ode, '2024-03-10', 'ACTUALIZACION', 'DEMO: titular con hijas') RETURNING "ID_EXPEDIENTE" INTO e;
    INSERT INTO "PERSONAS" ("ID_EXPEDIENTE", "ID_PARENTESCO", "ES_TITULAR", "APELLIDO_PATERNO", "APELLIDO_MATERNO", "NOMBRES", "SEXO", "ID_NACIONALIDAD", "FECHA_NACIMIENTO", "ID_TIPO_DOCUMENTO", "NRO_DOCUMENTO")
    VALUES (e, p_tit,  TRUE,  'TORRES', 'RIVAS',  'CARLA MARIA',  'F', n_ven, '1994-06-17', d_ced,  '20000001'),
           (e, p_hija, FALSE, 'LOPEZ',  'TORRES', 'SOFIA ISABEL', 'F', n_ven, '2018-03-19', d_acta, '1001'),
           (e, p_hija, FALSE, 'LOPEZ',  'TORRES', 'VALERIA',      'F', n_ven, '2023-09-17', d_acta, '1002');

    -- Titular + cónyuge + hijo, apellidos distintos
    INSERT INTO "EXPEDIENTES" ("NRO_EXPEDIENTE", "ID_ORIGEN", "FECHA_SOLICITUD", "TIPO_TRAMITE", "OBSERVACIONES")
    VALUES ('9000003', o_virtual, '2024-05-20', 'SOLICITUD', 'DEMO: familia con apellidos distintos') RETURNING "ID_EXPEDIENTE" INTO e;
    INSERT INTO "PERSONAS" ("ID_EXPEDIENTE", "ID_PARENTESCO", "ES_TITULAR", "APELLIDO_PATERNO", "APELLIDO_MATERNO", "NOMBRES", "SEXO", "ID_NACIONALIDAD", "FECHA_NACIMIENTO", "ID_TIPO_DOCUMENTO", "NRO_DOCUMENTO")
    VALUES (e, p_tit,  TRUE,  'RAMOS',  'DIAZ',  'LAURA ELENA', 'F', n_ven, '2001-04-27', d_ced, '20000002'),
           (e, p_con,  FALSE, 'SUAREZ', 'MEJIA', 'JOSE LUIS',   'M', n_ven, '1996-02-23', d_ced, '20000003'),
           (e, p_hijo, FALSE, 'ROJAS',  'RAMOS', 'MATEO',       'M', n_ven, '2019-04-14', d_ce,  '000900001');

    -- Solicitud aún sin número de expediente
    INSERT INTO "EXPEDIENTES" ("NRO_EXPEDIENTE", "ID_ORIGEN", "FECHA_SOLICITUD", "TIPO_TRAMITE", "OBSERVACIONES")
    VALUES (NULL, o_virtual, '2025-07-22', 'SOLICITUD', 'DEMO: sin número de expediente') RETURNING "ID_EXPEDIENTE" INTO e;
    INSERT INTO "PERSONAS" ("ID_EXPEDIENTE", "ID_PARENTESCO", "ES_TITULAR", "APELLIDO_PATERNO", "APELLIDO_MATERNO", "NOMBRES", "SEXO", "ID_NACIONALIDAD", "FECHA_NACIMIENTO", "ID_TIPO_DOCUMENTO", "NRO_DOCUMENTO")
    VALUES (e, p_tit, TRUE, 'MORALES', 'PAZ', 'DANIEL ANDRES', 'M', n_ven, '1993-05-17', d_pas, 'X1234567');

    -- Estados (colores del Excel). 9000003 mezcla renunciantes y biométricos en el mismo
    -- grupo; la titular de 9000002 queda sin estado (fila blanca).
    UPDATE "PERSONAS" p SET "ID_ESTADO" = s."ID_ESTADO"
    FROM (VALUES ('00123456', 'PASÓ BIOMÉTRICOS'),
                 ('1001', 'MENOR EN PROCESO DE RENUNCIA'),
                 ('1002', 'MENOR EN PROCESO DE RENUNCIA'),
                 ('20000002', 'RENUNCIANTE A LA SOLICITUD'),
                 ('20000003', 'PASÓ BIOMÉTRICOS'),
                 ('000900001', 'RENUNCIANTE A LA SOLICITUD'),
                 ('X1234567', 'NO CONTESTA')) AS v ("DOC", "ESTADO")
    JOIN "ESTADOS" s ON s."NOMBRE" = v."ESTADO"
    WHERE p."NRO_DOCUMENTO" = v."DOC";
END $$;
