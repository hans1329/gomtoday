
-- Add emoji column to perspectives table
ALTER TABLE perspectives 
ADD COLUMN emoji text;

-- Update with current emojis
UPDATE perspectives 
SET emoji = CASE perspective_key
  WHEN 'my_view' THEN '👁️'
  WHEN 'camera' THEN '📱'
  WHEN 'pet' THEN '🐶'
  WHEN 'friend' THEN '👫'
  WHEN 'family' THEN '👨‍👩‍👧‍👦'
  WHEN 'stranger' THEN '🚶'
  WHEN 'old_man' THEN '👴'
  WHEN 'future' THEN '🔮'
END;
