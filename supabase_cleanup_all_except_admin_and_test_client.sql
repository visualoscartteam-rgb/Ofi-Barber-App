-- ==============================================================================
-- SCRIPT SQL: Dejar únicamente al Barbero Admin y al Cliente de Prueba (Limpieza Total)
-- ==============================================================================
-- Instrucciones:
-- 1. Ve a tu panel de Supabase: https://supabase.com/dashboard/project/qielchkzjawjnqqpvhil
-- 2. En el menú lateral izquierdo, haz clic en "SQL Editor"
-- 3. Haz clic en "New query"
-- 4. Pega todo este código y haz clic en "Run" (botón verde)
-- ==============================================================================

-- 1. Eliminar de auth.users a TODOS los usuarios EXCEPTO al Admin y al Cliente de Prueba
DELETE FROM auth.users 
WHERE id NOT IN (
  '3b5281b6-52fa-4281-8789-12d2995cc24d',
  '727b07c7-c317-470e-8086-1272f041bb82'
)
AND email NOT IN (
  'admin2@carlosbarbero.app',
  'cliente@carlosbarbero.app'
);

-- 2. Eliminar de public.profiles a todos los perfiles excepto el Admin y el Cliente de Prueba
DELETE FROM public.profiles 
WHERE id NOT IN (
  '3b5281b6-52fa-4281-8789-12d2995cc24d',
  '727b07c7-c317-470e-8086-1272f041bb82'
);

-- 3. Limpiar citas que referencien a barberos o clientes eliminados
DELETE FROM public.appointments 
WHERE (barber_id::text != '3b5281b6-52fa-4281-8789-12d2995cc24d')
   OR (client_id::text != '727b07c7-c317-470e-8086-1272f041bb82');

-- 4. Limpiar permisos, bloqueos y excepciones de barberos eliminados
DELETE FROM public.permisos WHERE barber_id::text != '3b5281b6-52fa-4281-8789-12d2995cc24d';
DELETE FROM public.blocked_hours WHERE barber_id::text != '3b5281b6-52fa-4281-8789-12d2995cc24d';
DELETE FROM public.lunch_exceptions WHERE barber_id::text != '3b5281b6-52fa-4281-8789-12d2995cc24d';

-- 5. Función RPC optimizada para que el Administrador elimine usuarios a futuro sin errores
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- Cast explícito a text para compatibilidad universal con columnas TEXT o UUID
  DELETE FROM public.lunch_exceptions WHERE barber_id::text = target_user_id::text;
  DELETE FROM public.permisos WHERE barber_id::text = target_user_id::text;
  DELETE FROM public.blocked_hours WHERE barber_id::text = target_user_id::text;
  DELETE FROM public.appointments WHERE barber_id::text = target_user_id::text OR client_id::text = target_user_id::text;
  DELETE FROM public.profiles WHERE id::text = target_user_id::text;
  DELETE FROM auth.users WHERE id::text = target_user_id::text;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Usuario eliminado completamente de auth y base de datos'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated, anon;
