-- Add additional profile fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS mbti VARCHAR(4),
ADD COLUMN IF NOT EXISTS blood_type VARCHAR(3),
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(10),
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add check constraints for data validation
ALTER TABLE public.profiles
ADD CONSTRAINT mbti_check CHECK (mbti IS NULL OR mbti ~ '^[EIST][NST][FT][JP]$'),
ADD CONSTRAINT blood_type_check CHECK (blood_type IS NULL OR blood_type IN ('A', 'B', 'AB', 'O')),
ADD CONSTRAINT gender_check CHECK (gender IS NULL OR gender IN ('남성', '여성', '기타'));