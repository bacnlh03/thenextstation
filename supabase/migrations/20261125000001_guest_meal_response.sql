alter table public.guests
  add column if not exists meal_status smallint not null default 0;

alter table public.guests
  drop constraint if exists guests_meal_status_check;

alter table public.guests
  add constraint guests_meal_status_check check (meal_status between 0 and 2);

create or replace function public.respond_guest_meal(guest_id uuid, meal_status smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if meal_status not between 1 and 2 then
    raise exception 'Invalid meal response';
  end if;
  update public.guests
  set meal_status = respond_guest_meal.meal_status
  where id = respond_guest_meal.guest_id;
end;
$$;

grant execute on function public.respond_guest_meal(uuid, smallint) to anon, authenticated;

drop function if exists public.get_guest_public(uuid);
create or replace function public.get_guest_public(guest_id uuid)
returns table (id uuid, full_name text, status smallint, allow_wishes boolean, allow_meal_invite boolean, meal_status smallint, updated_at timestamptz)
language sql security definer set search_path = public stable as $$
  select g.id, g.full_name, g.status, g.allow_wishes, g.allow_meal_invite, g.meal_status, g.updated_at
  from public.guests g where g.id = guest_id;
$$;
grant execute on function public.get_guest_public(uuid) to anon, authenticated;

drop function if exists public.get_guest_by_slug_or_id(text);
create or replace function public.get_guest_by_slug_or_id(query_key text)
returns table (id uuid, slug text, full_name text, status smallint, allow_wishes boolean, allow_meal_invite boolean, meal_status smallint, updated_at timestamptz)
language plpgsql security definer set search_path = public stable as $$
declare parsed_uuid uuid;
begin
  begin parsed_uuid := query_key::uuid; exception when others then parsed_uuid := null; end;
  return query select g.id, g.slug, g.full_name, g.status, g.allow_wishes, g.allow_meal_invite, g.meal_status, g.updated_at
    from public.guests g where g.slug = query_key or (parsed_uuid is not null and g.id = parsed_uuid) limit 1;
end;
$$;
grant execute on function public.get_guest_by_slug_or_id(text) to anon, authenticated;
