-- 연필 상품 테이블 생성
CREATE TABLE public.pencil_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  pencil_count INTEGER NOT NULL,
  price INTEGER NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.pencil_products ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 활성 상품 조회 가능
CREATE POLICY "Anyone can view active pencil products"
ON public.pencil_products
FOR SELECT
USING (is_active = true);

-- 관리자만 상품 추가 가능
CREATE POLICY "Admins can insert pencil products"
ON public.pencil_products
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 관리자만 상품 수정 가능
CREATE POLICY "Admins can update pencil products"
ON public.pencil_products
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 관리자만 상품 삭제 가능
CREATE POLICY "Admins can delete pencil products"
ON public.pencil_products
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_pencil_products_updated_at
BEFORE UPDATE ON public.pencil_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 기본 상품 데이터 추가
INSERT INTO public.pencil_products (name, pencil_count, price, display_order) VALUES
  ('연필 10개', 10, 1000, 1),
  ('연필 50개', 50, 4500, 2),
  ('연필 100개', 100, 8000, 3),
  ('연필 300개', 300, 20000, 4);