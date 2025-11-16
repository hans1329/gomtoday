-- diary_comments와 profiles 테이블 연결을 위한 foreign key 추가
ALTER TABLE public.diary_comments
ADD CONSTRAINT diary_comments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(user_id)
ON DELETE CASCADE;