-- ==============================================================================
-- SCRIPT SQL: Resetear todos los barberos (excepto Admin) y habilitar eliminación limpia
-- ==============================================================================
-- Instrucciones:
-- 1. Abre tu panel de Supabase: https://supabase.com/dashboard/project/qielchkzjawjnqqpvhil
-- 2. En el menú de la izquierda, entra a "SQL Editor"
-- 3. Crea una "New query"
-- 4. Pega todo este código y haz clic en "Run" (botón verde)
-- ==============================================================================

-- 1. Eliminar de auth.users a todos los barberos anteriores (para liberar sus celulares/correos al 100%)
-- Conserva intacto al Super Administrador (admin2@carlosbarbero.app / 99998888)
DELETE FROM auth.users 
WHERE (
  email LIKE 'barbero506%' 
  OR email = 'barbero@carlosbarbero.app'
  OR (raw_user_meta_data->>'role' IN ('barber', 'barbero'))
) 
AND email NOT IN ('admin2@carlosbarbero.app', 'admin@carlosbarbero.app')
AND id != '3b5281b6-52fa-4281-8789-12d2995cc24d';

-- 2. Eliminar de public.profiles a cualquier barbero previo (excepto el Super Administrador)
DELETE FROM public.profiles 
WHERE role IN ('barber', 'barbero') 
  AND role != 'admin' 
  AND id != '3b5281b6-52fa-4281-8789-12d2995cc24d';

-- 3. Limpiar horarios excepcionales, permisos y bloqueos huérfanos de barberos antiguos
DELETE FROM public.lunch_exceptions WHERE barber_id != '3b5281b6-52fa-4281-8789-12d2995cc24d';
DELETE FROM public.permisos WHERE barber_id != '3b5281b6-52fa-4281-8789-12d2995cc24d';
DELETE FROM public.blocked_hours WHERE barber_id != '3b5281b6-52fa-4281-8789-12d2995cc24d';

-- 4. Función RPC para que el Administrador elimine usuarios COMPLETAMENTE (de profiles y auth.users)
-- Así, cuando borres un cliente o barbero desde el panel, su celular queda 100% libre para volverse a registrar
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- Borrar registros asociados
  DELETE FROM public.lunch_exceptions WHERE barber_id = target_user_id::text;
  DELETE FROM public.permisos WHERE barber_id = target_user_id::text;
  DELETE FROM public.blocked_hours WHERE barber_id = target_user_id::text;
  
  -- Borrar de la tabla profiles
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- Borrar del sistema de autenticación de Supabase (auth.users)
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Usuario eliminado completamente de auth y base de datos'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated, anon;

-- 5. Función RPC para limpiar usuarios huérfanos en auth.users por email
CREATE OR REPLACE FUNCTION public.admin_delete_auth_user_by_email(target_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  found_id UUID;
BEGIN
  SELECT id INTO found_id FROM auth.users WHERE lower(email) = lower(trim(target_email));
  
  IF found_id IS NOT NULL THEN
    DELETE FROM public.profiles WHERE id = found_id;
    DELETE FROM auth.users WHERE id = found_id;
    RETURN jsonb_build_object('success', true, 'deleted_id', found_id);
  END IF;

  RETURN jsonb_build_object('success', false, 'message', 'Email no encontrado en auth.users');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_auth_user_by_email(TEXT) TO authenticated, anon;
