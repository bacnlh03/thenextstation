-- Add allow_wishes column to guests table (defaults to true)
alter table public.guests 
add column if not exists allow_wishes boolean not null default true;

-- Update get_guest_public RPC to include allow_wishes
drop function if exists public.get_guest_public(uuid);

create or replace function public.get_guest_public(guest_id uuid)
returns table (
  id uuid,
  full_name text,
  status smallint,
  allow_wishes boolean,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select g.id, g.full_name, g.status, g.allow_wishes, g.updated_at
  from public.guests g
  where g.id = guest_id;
$$;

grant execute on function public.get_guest_public(uuid) to anon, authenticated;
