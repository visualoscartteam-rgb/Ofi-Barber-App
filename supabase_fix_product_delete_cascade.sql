-- ==============================================================================
-- SCRIPT SQL: Permitir eliminación de productos con ventas asociadas (ON DELETE CASCADE)
-- ==============================================================================
-- Instrucciones (Opcional, la app ya maneja la eliminación automáticamente):
-- 1. Ve a tu panel de Supabase: https://supabase.com/dashboard/project/qielchkzjawjnqqpvhil
-- 2. En el menú lateral izquierdo, haz clic en "SQL Editor"
-- 3. Haz clic en "New query"
-- 4. Pega este código y haz clic en "Run" (botón verde)
-- ==============================================================================

ALTER TABLE public.sales
DROP CONSTRAINT IF EXISTS sales_product_id_fkey,
ADD CONSTRAINT sales_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES public.products(id)
  ON DELETE CASCADE;
