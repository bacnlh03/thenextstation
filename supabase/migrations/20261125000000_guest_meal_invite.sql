alter table public.guests add column if not exists allow_meal_invite boolean not null default false;

drop function if exists public.get_guest_public(uuid);
create or replace function public.get_guest_public(guest_id uuid)
returns table (id uuid, full_name text, status smallint, allow_wishes boolean, allow_meal_invite boolean, updated_at timestamptz)
language sql security definer set search_path = public stable as $$
  select g.id, g.full_name, g.status, g.allow_wishes, g.allow_meal_invite, g.updated_at from public.guests g where g.id = guest_id;
$$;
grant execute on function public.get_guest_public(uuid) to anon, authenticated;

drop function if exists public.get_guest_by_slug_or_id(text);
create or replace function public.get_guest_by_slug_or_id(query_key text)
returns table (id uuid, slug text, full_name text, status smallint, allow_wishes boolean, allow_meal_invite boolean, updated_at timestamptz)
language plpgsql security definer set search_path = public stable as $$
declare parsed_uuid uuid;
begin
  begin parsed_uuid := query_key::uuid; exception when others then parsed_uuid := null; end;
  return query select g.id, g.slug, g.full_name, g.status, g.allow_wishes, g.allow_meal_invite, g.updated_at
    from public.guests g where g.slug = query_key or (parsed_uuid is not null and g.id = parsed_uuid) limit 1;
end;
$$;
grant execute on function public.get_guest_by_slug_or_id(text) to anon, authenticated;
