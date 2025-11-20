
-- Add is_new column to perspectives table
ALTER TABLE perspectives 
ADD COLUMN is_new boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN perspectives.is_new IS '새로운 시점 여부 (NEW 뱃지 표시용)';
