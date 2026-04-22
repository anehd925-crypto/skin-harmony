-- ═════════════════════════════════════════════════════════════
-- BeautyLens v2 · Supabase Schema Migration
-- supabase/migrations/20260421_beautylens_v2.sql
-- 
-- 실행 방법:
-- 1. Supabase Dashboard → SQL Editor → New query
-- 2. 아래 전체 복사 붙여넣기
-- 3. Run
-- ═════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- 1. profiles 테이블 (피부 프로필 + 온보딩 데이터)
-- ───────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,

  -- 온보딩 Step 1: 피부 타입 (필수)
  skin_type text check (
    skin_type in ('dry', 'oily', 'combination', 'sensitive', 'normal')
  ),

  -- 온보딩 Step 2: 피부 고민 (최대 3개)
  skin_concerns text[] default array[]::text[],
  -- allowed: hydration, sebum, wrinkles, sensitive, pigmentation, pores, clean_beauty

  -- 온보딩 Step 2: 민감도 (1-5 척도)
  sensitivity_level int check (sensitivity_level between 1 and 5),

  -- 온보딩 Step 2: 알러지/피하는 성분 (선택)
  allergens text[] default array[]::text[],

  -- 온보딩 Step 2: 임신/수유 (선택, 레티놀 등 필터용)
  pregnancy_status boolean default false,

  -- 온보딩 Step 3: 연령대 (선택)
  age_range text check (
    age_range in ('teens', '20s_early', '20s_late', '30s', '40s', '50s_plus') 
    or age_range is null
  ),

  -- 온보딩 Step 3: 선호 루틴 (선택)
  preferred_routines text[] default array[]::text[],
  -- allowed: minimalist, layering, kbeauty_10, clean_beauty, anti_aging

  -- 자유 서술 (선택, ML 학습용)
  skin_condition_history text,

  -- 메타
  onboarding_completed boolean default false,
  onboarding_completed_at timestamptz,
  theme_preference text default 'system' check (
    theme_preference in ('light', 'dark', 'system')
  ),
  notifications_enabled boolean default true,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- 신규 가입 시 자동 profiles row 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────────────────────────────────────────
-- 2. products 테이블 (올리브영 제품 캐시)
-- ───────────────────────────────────────────────────────────
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  source_url text unique not null,
  brand text,
  name text not null,
  image_url text,
  price int,
  category text,

  -- AI 분석으로 얻은 성분 배열
  ingredients jsonb default '[]'::jsonb,
  -- each: { name_kr, name_en, category, ewg_grade?, evaluation: 'beneficial'|'caution'|'harmful'|'neutral', note? }

  -- 메타
  raw_scraped_data jsonb,
  analyzed_at timestamptz,
  analyzer_model text, -- 'grok-beta', 'claude-haiku-4-5', etc.

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists products_source_url_idx on public.products (source_url);
create index if not exists products_brand_idx on public.products (brand);

alter table public.products enable row level security;

-- 제품 정보는 모든 로그인 유저가 읽기 가능 (공유 자원)
drop policy if exists "products_select_all" on public.products;
create policy "products_select_all" on public.products
  for select using (auth.role() = 'authenticated');

-- ───────────────────────────────────────────────────────────
-- 3. analyses 테이블 (유저별 분석 히스토리 + 매치율)
-- ───────────────────────────────────────────────────────────
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,

  -- 이 유저 기준 매치율 (유저 프로필 스냅샷 + 제품 성분 기반)
  match_score int check (match_score between 0 and 100),
  match_reason text, -- '지성·민감 피부에 매우 적합'

  -- 매치 분석 상세
  beneficial_count int default 0,
  caution_count int default 0,
  harmful_count int default 0,

  -- 유저 액션
  bookmarked boolean default false,
  user_rating int check (user_rating between 1 and 5),

  -- 분석 당시 프로필 스냅샷 (프로필이 변해도 과거 매치율 유지)
  profile_snapshot jsonb,

  created_at timestamptz default now()
);

create index if not exists analyses_user_id_idx on public.analyses (user_id);
create index if not exists analyses_created_at_idx on public.analyses (user_id, created_at desc);

alter table public.analyses enable row level security;

drop policy if exists "analyses_select_own" on public.analyses;
create policy "analyses_select_own" on public.analyses
  for select using (auth.uid() = user_id);

drop policy if exists "analyses_insert_own" on public.analyses;
create policy "analyses_insert_own" on public.analyses
  for insert with check (auth.uid() = user_id);

drop policy if exists "analyses_update_own" on public.analyses;
create policy "analyses_update_own" on public.analyses
  for update using (auth.uid() = user_id);

drop policy if exists "analyses_delete_own" on public.analyses;
create policy "analyses_delete_own" on public.analyses
  for delete using (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────
-- 4. events 테이블 (애널리틱스 · PM용)
-- ───────────────────────────────────────────────────────────
create table if not exists public.events (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  properties jsonb default '{}'::jsonb,
  session_id text,
  created_at timestamptz default now()
);

create index if not exists events_user_id_idx on public.events (user_id);
create index if not exists events_event_name_idx on public.events (event_name, created_at desc);
create index if not exists events_created_at_idx on public.events (created_at desc);

alter table public.events enable row level security;

-- 유저는 자기 이벤트만 INSERT 가능
drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own" on public.events
  for insert with check (
    auth.uid() = user_id or user_id is null
  );

-- SELECT 는 서버 사이드(service role)만 — 유저는 자기 것도 못 봄 (개인정보 보호)
-- 필요 시 관리자용 view 별도 생성

-- ───────────────────────────────────────────────────────────
-- 5. ingredients_dictionary 테이블 (성분 사전)
-- ───────────────────────────────────────────────────────────
create table if not exists public.ingredients_dictionary (
  id uuid primary key default gen_random_uuid(),
  name_kr text unique not null,
  name_en text,
  inci_name text,
  category text,
  -- 'preservative', 'fragrance', 'surfactant', 'humectant', 'antioxidant', ...
  description text,
  ewg_grade int check (ewg_grade between 1 and 10),
  is_common_allergen boolean default false,
  pregnancy_safe boolean default true,
  evaluation_default text check (
    evaluation_default in ('beneficial', 'caution', 'harmful', 'neutral')
  ) default 'neutral',
  created_at timestamptz default now()
);

create index if not exists ingredients_name_kr_idx on public.ingredients_dictionary (name_kr);
create index if not exists ingredients_name_en_idx on public.ingredients_dictionary (name_en);

alter table public.ingredients_dictionary enable row level security;

drop policy if exists "ingredients_select_all" on public.ingredients_dictionary;
create policy "ingredients_select_all" on public.ingredients_dictionary
  for select using (true);

-- ───────────────────────────────────────────────────────────
-- 6. updated_at 자동 갱신 트리거
-- ───────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_products on public.products;
create trigger set_updated_at_products
  before update on public.products
  for each row execute function public.set_updated_at();

-- ═════════════════════════════════════════════════════════════
-- 마이그레이션 끝. 이제 기존 user들의 profiles row를 생성하려면:
-- 
-- insert into public.profiles (id, email)
-- select id, email from auth.users
-- on conflict (id) do nothing;
-- ═════════════════════════════════════════════════════════════
