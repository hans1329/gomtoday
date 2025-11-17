-- 기존 일기들을 각 사용자의 기본 나만보기 일기장에 자동 연결
INSERT INTO diary_notebooks (diary_id, notebook_id)
SELECT 
  d.id as diary_id,
  n.id as notebook_id
FROM diaries d
INNER JOIN notebooks n ON n.user_id = d.user_id
WHERE n.visibility = 'private' 
  AND n.is_default = true
  AND NOT EXISTS (
    SELECT 1 FROM diary_notebooks dn 
    WHERE dn.diary_id = d.id
  )
ON CONFLICT DO NOTHING;