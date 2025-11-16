-- 1. notebooks 테이블 생성
CREATE TABLE public.notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'shared', 'public')),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. notebooks 테이블에 RLS 활성화
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;

-- 3. notebook_members 테이블 생성
CREATE TABLE public.notebook_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')) DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(notebook_id, user_id)
);

-- 4. notebook_members 테이블에 RLS 활성화
ALTER TABLE public.notebook_members ENABLE ROW LEVEL SECURITY;

-- 5. notebooks RLS 정책
CREATE POLICY "Users can view their own notebooks"
ON public.notebooks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared notebooks they are members of"
ON public.notebooks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.notebook_members
    WHERE notebook_id = id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can view public notebooks"
ON public.notebooks FOR SELECT
USING (visibility = 'public');

CREATE POLICY "Users can create their own notebooks"
ON public.notebooks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notebooks"
ON public.notebooks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notebooks"
ON public.notebooks FOR DELETE
USING (auth.uid() = user_id AND is_default = false);

-- 6. notebook_members RLS 정책
CREATE POLICY "Notebook owners can manage members"
ON public.notebook_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.notebooks
    WHERE id = notebook_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own memberships"
ON public.notebook_members FOR SELECT
USING (auth.uid() = user_id);

-- 7. diary_notebooks 테이블 생성
CREATE TABLE public.diary_notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID REFERENCES public.diaries(id) ON DELETE CASCADE NOT NULL,
  notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(diary_id, notebook_id)
);

-- 8. diary_notebooks 테이블에 RLS 활성화
ALTER TABLE public.diary_notebooks ENABLE ROW LEVEL SECURITY;

-- 9. diary_notebooks RLS 정책
CREATE POLICY "Users can link diaries to their notebooks"
ON public.diary_notebooks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.diaries
    WHERE id = diary_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their diary-notebook links"
ON public.diary_notebooks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.diaries
    WHERE id = diary_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their diary-notebook links"
ON public.diary_notebooks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.diaries
    WHERE id = diary_id AND user_id = auth.uid()
  )
);

-- 10. updated_at 트리거 추가
CREATE TRIGGER update_notebooks_updated_at
BEFORE UPDATE ON public.notebooks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 11. handle_new_user 함수 업데이트
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  INSERT INTO public.notebooks (user_id, name, visibility, is_default)
  VALUES (NEW.id, '나만의 일기장', 'private', true);
  
  INSERT INTO public.notebooks (user_id, name, visibility, is_default)
  VALUES (NEW.id, '공개 일기장', 'public', true);
  
  RETURN NEW;
END;
$$;