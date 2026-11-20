-- ============================================
-- Seed base — roles
-- Los usuarios admin/editor/lector los crea scripts/run-sql.js (necesita bcrypt)
--   admin  → todo, incluida la configuración
--   editor → registra y edita expedientes
--   lector → solo consulta
-- ============================================
INSERT INTO "ROLES" ("NOMBRE_ROL", "DESCRIPCION", "NIVEL_ACCESO", "ES_SISTEMA")
VALUES ('admin', 'Administrador del sistema', 100, TRUE),
       ('editor', 'Registra y edita expedientes', 50, TRUE),
       ('lector', 'Solo consulta expedientes', 10, TRUE)
ON CONFLICT ("NOMBRE_ROL") DO NOTHING;
