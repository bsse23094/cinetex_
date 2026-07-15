-- Cinetex identity and taste-based recommendation schema.
-- This migration is safe to run on an existing Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  favorite_genres integer[] not null default '{}'::integer[],
  taste_profile jsonb not null default '{}'::jsonb,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_movie_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id bigint not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  signal text not null check (signal in ('view', 'favorite', 'rate', 'dismiss', 'list')),
  rating smallint check (rating between 1 and 5),
  genre_ids integer[] not null default '{}'::integer[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, tmdb_id, signal)
);

create index if not exists user_movie_signals_user_created_idx
  on public.user_movie_signals (user_id, created_at desc);
create index if not exists user_movie_signals_genres_idx
  on public.user_movie_signals using gin (genre_ids);

create table if not exists public.user_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id bigint not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  score numeric(7, 3) not null default 0,
  reasons jsonb not null default '[]'::jsonb,
  source text not null default 'taste-profile',
  status text not null default 'active' check (status in ('active', 'seen', 'dismissed')),
  generated_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  unique (user_id, tmdb_id, media_type)
);

create index if not exists user_recommendations_active_idx
  on public.user_recommendations (user_id, status, score desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists user_movie_signals_set_updated_at on public.user_movie_signals;
create trigger user_movie_signals_set_updated_at
before update on public.user_movie_signals
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Returns a compact genre-affinity profile for the authenticated user. The
-- Angular client can use this as input to TMDB's discover endpoint.
create or replace function public.get_user_taste_profile()
returns table (genre_id integer, affinity numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    genre_id,
    round(sum(
      case signal
        when 'favorite' then 4
        when 'rate' then coalesce(rating, 3) - 2
        when 'list' then 2
        when 'view' then 1
        when 'dismiss' then -4
        else 0
      end
    )::numeric, 3) as affinity
  from public.user_movie_signals,
       unnest(genre_ids) as genre_id
  where user_id = auth.uid()
  group by genre_id
  having sum(
    case signal
      when 'favorite' then 4
      when 'rate' then coalesce(rating, 3) - 2
      when 'list' then 2
      when 'view' then 1
      when 'dismiss' then -4
      else 0
    end
  ) > 0
  order by affinity desc, genre_id;
$$;

alter table public.profiles enable row level security;
alter table public.user_movie_signals enable row level security;
alter table public.user_recommendations enable row level security;

drop policy if exists "profiles are visible to their owner" on public.profiles;
create policy "profiles are visible to their owner"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles are editable by their owner" on public.profiles;
create policy "profiles are editable by their owner"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "users manage their own taste signals" on public.user_movie_signals;
create policy "users manage their own taste signals"
on public.user_movie_signals for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "users can read their recommendations" on public.user_recommendations;
create policy "users can read their recommendations"
on public.user_recommendations for select to authenticated
using ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_movie_signals to authenticated;
grant select on public.user_recommendations to authenticated;
grant execute on function public.get_user_taste_profile() to authenticated;
