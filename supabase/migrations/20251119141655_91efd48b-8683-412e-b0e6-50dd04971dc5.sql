-- 일기장 생성 비용 설정 추가
INSERT INTO public.pencil_settings (setting_key, setting_value, description)
VALUES ('notebook_create_cost', 5, '일기장 생성 시 차감되는 연필 개수')
ON CONFLICT (setting_key) DO NOTHING;