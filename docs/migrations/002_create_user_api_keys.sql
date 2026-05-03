create type plan_tier as enum ('free', 'indie', 'pro', 'team');

create table if not exists public.user_api_keys (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  api_key text not null unique,
  plan_tier plan_tier not null default 'free',
  scans_used_this_month integer not null default 0,
  scans_limit integer not null default 5,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_api_keys_user_id_idx on public.user_api_keys (user_id);
create index if not exists user_api_keys_api_key_idx on public.user_api_keys (api_key);

create or replace function public.set_user_api_keys_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_user_api_keys_updated_at on public.user_api_keys;
create trigger set_user_api_keys_updated_at
before update on public.user_api_keys
for each row
execute function public.set_user_api_keys_updated_at();
