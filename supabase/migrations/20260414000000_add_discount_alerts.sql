-- products 테이블에 가격 컬럼 추가
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS original_price INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_price  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_rate  NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_on_sale     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS oliveyoung_name TEXT DEFAULT '';

-- 할인 알림 테이블
CREATE TABLE IF NOT EXISTS public.discount_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  is_active       BOOLEAN DEFAULT TRUE,
  last_price      INTEGER DEFAULT 0,
  last_discount_rate NUMERIC(5,2) DEFAULT 0,
  last_checked_at TIMESTAMPTZ,
  alerted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- RLS
ALTER TABLE public.discount_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own discount alerts"
  ON public.discount_alerts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 찜 추가 시 discount_alerts 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_wish_list_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.discount_alerts (user_id, product_id)
  VALUES (NEW.user_id, NEW.product_id)
  ON CONFLICT (user_id, product_id) DO UPDATE SET is_active = TRUE;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_wish_list_insert
  AFTER INSERT ON public.wish_list
  FOR EACH ROW EXECUTE FUNCTION public.handle_wish_list_insert();

-- 찜 삭제 시 discount_alerts 비활성화
CREATE OR REPLACE FUNCTION public.handle_wish_list_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.discount_alerts
  SET is_active = FALSE
  WHERE user_id = OLD.user_id AND product_id = OLD.product_id;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER on_wish_list_delete
  AFTER DELETE ON public.wish_list
  FOR EACH ROW EXECUTE FUNCTION public.handle_wish_list_delete();
