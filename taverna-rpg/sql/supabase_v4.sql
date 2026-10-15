create table if not exists public.online (user_id uuid primary key references auth.users(id) on delete cascade, name text not null, seen_at timestamptz not null default now());
alter table public.online enable row level security;
drop policy if exists "online: ler" on public.online;
create policy "online: ler" on public.online for select to authenticated using (true);
create or replace function public.ping() returns void language plpgsql security definer set search_path = public as $$ begin if auth.uid() is null then return; end if; insert into online (user_id, name) select id, name from profiles where id = auth.uid() on conflict (user_id) do update set name = excluded.name, seen_at = now(); end $$;
