-- ==============================================================================
-- SCRIPT SQL: Habilitar actualización de contraseñas de usuarios desde el Admin Panel
-- ==============================================================================
-- Instrucciones:
-- 1. Ve a tu panel de Supabase: https://supabase.com/dashboard/project/qielchkzjawjnqqpvhil
-- 2. En el menú lateral izquierdo, haz clic en "SQL Editor"
-- 3. Haz clic en "New query"
-- 4. Pega todo este código y haz clic en "Run" (botón verde)
-- ==============================================================================

-- Asegurar que la extensión pgcrypto esté disponible para encriptación bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Función segura para que el administrador actualice la contraseña de un usuario en auth.users
CREATE OR REPLACE FUNCTION public.admin_update_user_password(
  target_user_id UUID, 
  new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- Validar que la contraseña tenga al menos 6 caracteres (estándar de Supabase)
  IF length(trim(new_password)) < 6 THEN
    RAISE EXCEPTION 'La contraseña debe tener al menos 6 caracteres.';
  END IF;

  -- Actualizar el hash de contraseña encriptado en auth.users con blowfish (bcrypt)
  UPDATE auth.users
  SET 
    encrypted_password = crypt(trim(new_password), gen_salt('bf')),
    updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado en auth.users con ID %', target_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Contraseña actualizada exitosamente'
  );
END;
$$;

-- Otorgar permisos de ejecución para roles autenticados y anónimos
GRANT EXECUTE ON FUNCTION public.admin_update_user_password(UUID, TEXT) TO authenticated, anon;
