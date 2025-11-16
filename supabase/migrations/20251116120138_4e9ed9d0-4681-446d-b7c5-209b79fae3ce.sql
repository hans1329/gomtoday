-- Drop existing problematic policies
DROP POLICY IF EXISTS "Notebook owners can manage members" ON notebook_members;
DROP POLICY IF EXISTS "Users can view shared notebooks" ON notebooks;

-- Create security definer function to check notebook ownership
CREATE OR REPLACE FUNCTION public.is_notebook_owner(_notebook_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.notebooks
    WHERE id = _notebook_id
      AND user_id = _user_id
  )
$$;

-- Recreate notebook_members policy using security definer function
CREATE POLICY "Notebook owners can manage members"
ON notebook_members
FOR ALL
USING (public.is_notebook_owner(notebook_id, auth.uid()));

-- Recreate notebooks policy for shared access
CREATE POLICY "Users can view shared notebooks"
ON notebooks
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM notebook_members
    WHERE notebook_members.notebook_id = notebooks.id
      AND notebook_members.user_id = auth.uid()
  )
);