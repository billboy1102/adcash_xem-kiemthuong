-- Adcash: Xem & Kiếm Thưởng
-- Production-oriented Supabase schema blueprint.
-- Apply this to a Supabase project only after reviewing environment-specific settings.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Người dùng Adcash',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  lifetime_earned bigint not null default 0 check (lifetime_earned >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.reward_tasks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null,
  category text not null,
  reward_amount bigint not null check (reward_amount > 0),
  duration_label text,
  provider text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.earning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.reward_tasks(id) on delete set null,
  provider text not null,
  provider_event_id text not null unique,
  title text not null,
  amount bigint not null check (amount > 0),
  status text not null default 'confirmed' check (status in ('confirmed', 'reversed')),
  created_at timestamptz not null default now()
);

create index if not exists earning_events_user_id_idx on public.earning_events(user_id);
create index if not exists earning_events_created_at_idx on public.earning_events(created_at desc);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount bigint not null check (amount >= 50000),
  method text not null check (method in ('momo', 'bank')),
  destination_masked text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'rejected', 'cancelled')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists withdrawals_user_id_idx on public.withdrawals(user_id);
create index if not exists withdrawals_status_idx on public.withdrawals(status);

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.reward_tasks enable row level security;
alter table public.earning_events enable row level security;
alter table public.withdrawals enable row level security;

grant select, update on public.profiles to authenticated;
grant select on public.wallets to authenticated;
grant select on public.reward_tasks to anon, authenticated;
grant select on public.earning_events to authenticated;
grant select on public.withdrawals to authenticated;

-- Profiles: users can only read and edit their own profile row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id)
with check ((select auth.uid()) is not null and (select auth.uid()) = id);

-- Wallets are read-only to the client. Only trusted server-side logic may change balances.
drop policy if exists "wallets_select_own" on public.wallets;
create policy "wallets_select_own"
on public.wallets
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- Active tasks are public catalog data.
drop policy if exists "reward_tasks_select_active" on public.reward_tasks;
create policy "reward_tasks_select_active"
on public.reward_tasks
for select
to anon, authenticated
using (active = true);

-- Earning history is visible only to its owner; clients cannot insert earnings.
drop policy if exists "earning_events_select_own" on public.earning_events;
create policy "earning_events_select_own"
on public.earning_events
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- Withdrawal history is visible only to its owner. Creation is intentionally server-side
-- so balance validation and atomic deduction cannot be bypassed from the app.
drop policy if exists "withdrawals_select_own" on public.withdrawals;
create policy "withdrawals_select_own"
on public.withdrawals
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- Automatically create a profile and wallet for each Auth user.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;

  insert into public.wallets (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Seed demo catalog. These rows describe possible partner-funded tasks only.
insert into public.reward_tasks (slug, title, description, category, reward_amount, duration_label, provider)
values
  ('sponsor-video', 'Xem video tài trợ', 'Xem trọn nội dung từ đối tác có chương trình thưởng.', 'Video', 350, '30–45 giây', 'Partner Demo'),
  ('quick-survey', 'Khảo sát nhanh 2 phút', 'Trả lời một khảo sát ngắn phù hợp với hồ sơ.', 'Khảo sát', 1200, '2–3 phút', 'Survey Demo'),
  ('daily-check', 'Điểm danh hôm nay', 'Mở ứng dụng mỗi ngày để nhận phần thưởng duy trì.', 'Hằng ngày', 150, '10 giây', 'Adcash'),
  ('app-offer', 'Trải nghiệm ứng dụng', 'Hoàn thành yêu cầu của đối tác và chờ hệ thống xác nhận.', 'Offer', 4500, '5–10 phút', 'Offer Demo'),
  ('mini-poll', 'Bình chọn nhanh', 'Hoàn thành một bình chọn ngắn.', 'Bình chọn', 250, '30 giây', 'Poll Demo')
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  reward_amount = excluded.reward_amount,
  duration_label = excluded.duration_label,
  provider = excluded.provider,
  active = true;

-- IMPORTANT PRODUCTION RULES
-- 1) Never expose a secret/service-role key in web, APK, or AAB.
-- 2) Never let the client insert earning_events or update wallets directly.
-- 3) Verify partner postback signatures server-side and deduplicate provider_event_id.
-- 4) Create withdrawals server-side in one transaction that validates and deducts balance.
-- 5) Store full payout destination details only in an appropriately protected server-side flow.
