-- 일기 좋아요 테이블
CREATE TABLE public.diary_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diary_id UUID NOT NULL REFERENCES public.diaries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(diary_id, user_id)
);

-- 일기 댓글 테이블
CREATE TABLE public.diary_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diary_id UUID NOT NULL REFERENCES public.diaries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.diary_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_comments ENABLE ROW LEVEL SECURITY;

-- diary_likes RLS 정책
CREATE POLICY "Users can view likes on diaries they can see"
ON public.diary_likes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.diaries d
    LEFT JOIN public.diary_notebooks dn ON d.id = dn.diary_id
    LEFT JOIN public.notebooks nb ON dn.notebook_id = nb.id
    WHERE d.id = diary_likes.diary_id
    AND (
      d.user_id = auth.uid()
      OR nb.visibility = 'public'
      OR EXISTS (
        SELECT 1 FROM public.notebook_members nm
        WHERE nm.notebook_id = nb.id
        AND nm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can add likes to diaries they can see"
ON public.diary_likes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.diaries d
    LEFT JOIN public.diary_notebooks dn ON d.id = dn.diary_id
    LEFT JOIN public.notebooks nb ON dn.notebook_id = nb.id
    WHERE d.id = diary_likes.diary_id
    AND (
      d.user_id = auth.uid()
      OR nb.visibility = 'public'
      OR EXISTS (
        SELECT 1 FROM public.notebook_members nm
        WHERE nm.notebook_id = nb.id
        AND nm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can delete their own likes"
ON public.diary_likes
FOR DELETE
USING (auth.uid() = user_id);

-- diary_comments RLS 정책
CREATE POLICY "Users can view comments on diaries they can see"
ON public.diary_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.diaries d
    LEFT JOIN public.diary_notebooks dn ON d.id = dn.diary_id
    LEFT JOIN public.notebooks nb ON dn.notebook_id = nb.id
    WHERE d.id = diary_comments.diary_id
    AND (
      d.user_id = auth.uid()
      OR nb.visibility = 'public'
      OR EXISTS (
        SELECT 1 FROM public.notebook_members nm
        WHERE nm.notebook_id = nb.id
        AND nm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can add comments to diaries they can see"
ON public.diary_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.diaries d
    LEFT JOIN public.diary_notebooks dn ON d.id = dn.diary_id
    LEFT JOIN public.notebooks nb ON dn.notebook_id = nb.id
    WHERE d.id = diary_comments.diary_id
    AND (
      d.user_id = auth.uid()
      OR nb.visibility = 'public'
      OR EXISTS (
        SELECT 1 FROM public.notebook_members nm
        WHERE nm.notebook_id = nb.id
        AND nm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update their own comments"
ON public.diary_comments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.diary_comments
FOR DELETE
USING (auth.uid() = user_id);

-- 댓글 업데이트 트리거
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_diary_comments_updated_at
BEFORE UPDATE ON public.diary_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 인덱스 생성
CREATE INDEX idx_diary_likes_diary_id ON public.diary_likes(diary_id);
CREATE INDEX idx_diary_likes_user_id ON public.diary_likes(user_id);
CREATE INDEX idx_diary_comments_diary_id ON public.diary_comments(diary_id);
CREATE INDEX idx_diary_comments_user_id ON public.diary_comments(user_id);