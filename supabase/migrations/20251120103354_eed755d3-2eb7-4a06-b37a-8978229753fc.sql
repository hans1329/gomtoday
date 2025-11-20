-- Add prompt_template column to perspectives table
ALTER TABLE public.perspectives 
ADD COLUMN prompt_template TEXT;

-- Update existing perspectives with their current prompt templates
UPDATE public.perspectives 
SET prompt_template = CASE perspective_key
  WHEN 'my_view' THEN '나의 시선으로, 내가 직접 경험하고 느낀 것을 1인칭 시점에서 서술합니다.'
  WHEN 'camera' THEN '핸드폰 카메라의 시점에서, 촬영된 순간을 객관적이면서도 생생하게 묘사합니다.'
  WHEN 'pet' THEN '반려동물의 시선으로, 순수하고 직관적인 관점에서 상황을 바라봅니다.'
  WHEN 'friend' THEN '친구의 시선으로, 친근하고 이해심 있는 관점에서 상황을 해석합니다.'
  WHEN 'family' THEN '가족의 시선으로, 따뜻하고 애정 어린 관점에서 순간을 기록합니다.'
  WHEN 'stranger' THEN '지나가는 행인의 시선으로, 객관적이고 중립적인 제3자의 관점에서 관찰합니다.'
  WHEN 'old_man' THEN '훗날의 나의 시선으로, 회고적이고 성찰적인 관점에서 과거를 돌아봅니다.'
  WHEN 'future' THEN '미래의 나의 시선으로, 현재를 미래에서 바라보는 시간을 초월한 관점에서 기록합니다.'
END
WHERE prompt_template IS NULL;