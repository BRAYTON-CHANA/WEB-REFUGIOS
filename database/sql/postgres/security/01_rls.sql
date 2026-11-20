-- ============================================
-- RLS en todas las tablas de "public", sin políticas.
-- En Supabase el schema public se expone por la API REST (PostgREST) a quien
-- tenga la publishable key: sin RLS cualquiera podría leer/escribir USUARIOS,
-- PERSONAS, etc. Con RLS activo y sin políticas, la API no ve nada.
-- El backend se conecta como dueño de las tablas (postgres), que no está
-- sujeto a RLS: la app funciona igual. En un Postgres normal no cambia nada.
-- Idempotente. Si se crean tablas a mano, volver a correr db:setup.
-- ============================================
DO $$
DECLARE t TEXT;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- Vistas: se crean con security_invoker (respetan el RLS de las tablas) y además
-- se quita todo permiso a los roles de la API de Supabase, si existen.
DO $$
DECLARE v TEXT; r TEXT;
BEGIN
    FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
        FOR v IN SELECT viewname FROM pg_views WHERE schemaname = 'public' LOOP
            EXECUTE format('REVOKE ALL ON public.%I FROM %I', v, r);
        END LOOP;
    END LOOP;
END $$;
