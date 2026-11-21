-- ═══════════════════════════════════════════════════════════════════════
-- Sabkaam — initial schema
-- Users live in auth.users (Supabase Auth). Everything else is in public.
-- Amounts are stored in paise (integer).
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists pg_trgm;

-- ─────────── enums ───────────
create type public.app_role as enum ('user', 'staff', 'admin');
create type public.verification_status as enum ('demo', 'unverified', 'verified');
create type public.service_kind as enum ('scheme', 'service', 'scholarship', 'job', 'exam', 'guidance');
create type public.application_status as enum (
  'submitted',
  'payment_pending',
  'payment_successful',
  'under_review',
  'documents_required',
  'in_progress',
  'completed',
  'rejected',
  'cancelled'
);
create type public.payment_status as enum (
  'created',
  'pending',
  'success',
  'failed',
  'cancelled',
  'refund_pending',
  'refunded',
  'partially_refunded'
);

-- ─────────── helpers ───────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─────────── profiles ───────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone text check (phone is null or phone ~ '^\+?[0-9]{10,15}$'),
  email text check (char_length(email) <= 254),
  state text check (char_length(state) <= 60),
  preferred_locale text not null default 'en' check (preferred_locale in ('en', 'hi')),
  notify_email boolean not null default true,
  notify_sms boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile row for every new auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, phone, full_name)
  values (
    new.id,
    new.email,
    case when new.phone is not null and new.phone <> '' then '+' || ltrim(new.phone, '+') end,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────── admin / staff roles ───────────
-- Roles are NOT stored on profiles so a user can never escalate by editing their own profile.
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null check (role in ('staff', 'admin')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid() and role = 'admin');
$$;

-- ─────────── catalogue ───────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  name_hi text not null default '',
  description text not null default '',
  description_hi text not null default '',
  icon text not null default 'layers',
  keywords text[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category_id uuid not null references public.categories (id) on delete restrict,
  kind public.service_kind not null default 'service',
  title text not null check (char_length(title) between 2 and 200),
  title_hi text not null default '',
  summary text not null default '',
  summary_hi text not null default '',
  overview text not null default '',
  benefits text[] not null default '{}',
  eligibility text[] not null default '{}',
  documents text[] not null default '{}',
  process text[] not null default '{}',
  important_dates jsonb not null default '[]'::jsonb,
  faqs jsonb not null default '[]'::jsonb,
  official_source_name text not null default '',
  official_url text not null default '' check (official_url = '' or official_url ~ '^https://'),
  fee_paise int check (fee_paise is null or (fee_paise >= 100 and fee_paise <= 10000000)),
  assistance_scope text[] not null default '{}',
  verification_status public.verification_status not null default 'demo',
  last_verified_at timestamptz,
  is_popular boolean not null default false,
  is_trending boolean not null default false,
  is_published boolean not null default true,
  sort_order int not null default 0,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(title_hi, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(summary, '') || ' ' || coalesce(summary_hi, '')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_category_idx on public.services (category_id);
create index services_published_idx on public.services (is_published, sort_order);
create index services_search_idx on public.services using gin (search_vector);
create index services_title_trgm_idx on public.services using gin (title gin_trgm_ops);
create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

create table public.service_keywords (
  id bigint generated always as identity primary key,
  service_id uuid not null references public.services (id) on delete cascade,
  keyword text not null check (char_length(keyword) between 1 and 80),
  unique (service_id, keyword)
);
create index service_keywords_service_idx on public.service_keywords (service_id);
create index service_keywords_trgm_idx on public.service_keywords using gin (keyword gin_trgm_ops);

create table public.saved_services (
  user_id uuid not null references auth.users (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, service_id)
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  question_hi text not null default '',
  answer_hi text not null default '',
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger faqs_updated_at before update on public.faqs
  for each row execute function public.set_updated_at();

-- Editable homepage copy (announcement banner, hero description…)
create table public.site_content (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value_en text not null default '',
  value_hi text not null default '',
  updated_at timestamptz not null default now()
);
create trigger site_content_updated_at before update on public.site_content
  for each row execute function public.set_updated_at();

-- ─────────── applications ───────────
create sequence public.application_ref_seq start 100001;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('SK' || nextval('public.application_ref_seq')::text),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  status public.application_status not null default 'submitted',
  fee_paise int not null default 0 check (fee_paise >= 0),   -- snapshot of fee at request time
  applicant_name text not null check (char_length(applicant_name) between 2 and 120),
  applicant_phone text not null check (applicant_phone ~ '^\+?[0-9]{10,15}$'),
  applicant_state text check (char_length(applicant_state) <= 60),
  notes text check (char_length(notes) <= 2000),
  eligibility_answers jsonb not null default '{}'::jsonb,
  consent_at timestamptz not null,
  assigned_to uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index applications_user_idx on public.applications (user_id, created_at desc);
create index applications_status_idx on public.applications (status, created_at desc);
create index applications_assigned_idx on public.applications (assigned_to);
create trigger applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

create table public.application_status_history (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.applications (id) on delete cascade,
  status public.application_status not null,
  note text check (char_length(note) <= 2000),
  changed_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index status_history_app_idx on public.application_status_history (application_id, created_at);

create table public.staff_assignments (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.applications (id) on delete cascade,
  staff_id uuid not null references auth.users (id),
  assigned_by uuid references auth.users (id),
  assigned_at timestamptz not null default now()
);
create index staff_assignments_app_idx on public.staff_assignments (application_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) <= 200),
  label text check (char_length(label) <= 120),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 5242880),
  created_at timestamptz not null default now()
);
create index documents_app_idx on public.documents (application_id);

-- ─────────── payments ───────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete restrict,
  order_id text not null unique,
  cf_order_id text,
  cf_payment_id text,
  payment_session_id text,
  amount_paise int not null check (amount_paise > 0),
  currency text not null default 'INR',
  status public.payment_status not null default 'created',
  payment_method text,
  failure_reason text,
  paid_at timestamptz,
  refund_id text unique,
  refund_amount_paise int check (refund_amount_paise is null or refund_amount_paise > 0),
  refund_status text,
  refund_note text,
  refunded_at timestamptz,
  gateway_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_user_idx on public.payments (user_id, created_at desc);
create index payments_app_idx on public.payments (application_id);
create index payments_status_idx on public.payments (status, created_at desc);
-- A given application can only ever have ONE successful payment.
create unique index payments_one_success_per_app on public.payments (application_id) where status = 'success';
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

create table public.payment_webhooks (
  id bigint generated always as identity primary key,
  event_hash text not null unique,     -- sha256 of timestamp+raw body; de-duplicates retries
  event_type text,
  order_id text,
  signature_valid boolean not null,
  payload jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);
create index payment_webhooks_order_idx on public.payment_webhooks (order_id);

-- ─────────── notifications & support ───────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null default '',
  link text check (link is null or link ~ '^/'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  contact text not null check (char_length(contact) between 5 and 160),
  message text not null check (char_length(message) between 5 and 2000),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
