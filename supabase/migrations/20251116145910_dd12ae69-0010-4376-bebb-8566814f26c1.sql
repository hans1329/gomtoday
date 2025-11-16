-- profiles 테이블에 email 컬럼 추가
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text;

-- 기존 사용자들의 이메일 업데이트를 위한 함수
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT u.id, u.email
    FROM auth.users u
  LOOP
    UPDATE public.profiles
    SET email = user_record.email
    WHERE user_id = user_record.id;
  END LOOP;
END;
$$;

-- 함수 실행하여 기존 사용자들의 이메일 동기화
SELECT sync_user_email();

-- handle_new_user 함수 수정하여 이메일도 저장
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  INSERT INTO public.notebooks (user_id, name, visibility, is_default)
  VALUES 
    (NEW.id, '나만의 일기장', 'private', true),
    (NEW.id, '공개 일기장', 'public', true);
  
  RETURN NEW;
END;
$$;