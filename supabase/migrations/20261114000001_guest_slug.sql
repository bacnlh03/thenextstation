-- Migration: Add guest slug support and RPC to lookup by slug or UUID
-- File: supabase/migrations/20261114000001_guest_slug.sql

-- 1. Add slug column
alter table public.guests 
add column if not exists slug text unique;

-- 2. Helper function to generate clean Vietnamese slug
create or replace function public.generate_slug(str text)
returns text language plpgsql as $$
declare
  cleaned text;
begin
  cleaned := lower(str);
  cleaned := regexp_replace(cleaned, '[àáạảãâầấậẩẫăằắặẳẵ]', 'a', 'g');
  cleaned := regexp_replace(cleaned, '[èéẹẻẽêềếệểễ]', 'e', 'g');
  cleaned := regexp_replace(cleaned, '[ìíịỉĩ]', 'i', 'g');
  cleaned := regexp_replace(cleaned, '[òóọỏõôồốộổỗơờớợởỡ]', 'o', 'g');
  cleaned := regexp_replace(cleaned, '[ùúụủũưừứựửữ]', 'u', 'g');
  cleaned := regexp_replace(cleaned, '[ỳýỵỷỹ]', 'y', 'g');
  cleaned := regexp_replace(cleaned, 'đ', 'd', 'g');
  cleaned := regexp_replace(cleaned, '[^a-z0-9\s-]', '', 'g');
  cleaned := regexp_replace(cleaned, '\s+', '-', 'g');
  cleaned := regexp_replace(cleaned, '-+', '-', 'g');
  return trim(both '-' from cleaned);
end;
$$;

-- 3. Trigger to auto-generate slug on insert if not provided
create or replace function public.set_guest_slug()
returns trigger
language plpgsql
as $$
declare
  base_slug text;
  new_slug text;
  counter integer := 1;
begin
  if new.slug is null or trim(new.slug) = '' then
    base_slug := generate_slug(new.full_name);
    if base_slug is null or base_slug = '' then
      base_slug := 'khach-moi';
    end if;

    new_slug := base_slug;
    while exists (select 1 from public.guests where slug = new_slug and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)) loop
      counter := counter + 1;
      new_slug := base_slug || '-' || counter;
    end loop;
    new.slug := new_slug;
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_set_guest_slug on public.guests;
create trigger trigger_set_guest_slug
  before insert or update of full_name on public.guests
  for each row execute function public.set_guest_slug();

-- 4. Backfill existing guests with unique slugs
do $$
declare
  r record;
  base_slug text;
  new_slug text;
  counter integer;
begin
  for r in select id, full_name from public.guests where slug is null loop
    base_slug := generate_slug(r.full_name);
    if base_slug is null or base_slug = '' then
      base_slug := 'khach-moi';
    end if;
    
    new_slug := base_slug;
    counter := 1;
    while exists (select 1 from public.guests where slug = new_slug and id != r.id) loop
      counter := counter + 1;
      new_slug := base_slug || '-' || counter;
    end loop;

    update public.guests set slug = new_slug where id = r.id;
  end loop;
end;
$$;

-- 5. Public RPC: lookup guest by slug or UUID
create or replace function public.get_guest_by_slug_or_id(query_key text)
returns table (
  id uuid,
  slug text,
  full_name text,
  status smallint,
  allow_wishes boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  parsed_uuid uuid;
begin
  begin
    parsed_uuid := query_key::uuid;
  exception when others then
    parsed_uuid := null;
  end;

  return query
  select g.id, g.slug, g.full_name, g.status, g.allow_wishes, g.updated_at
  from public.guests g
  where g.slug = query_key or (parsed_uuid is not null and g.id = parsed_uuid)
  limit 1;
end;
$$;

grant execute on function public.get_guest_by_slug_or_id(text) to anon, authenticated;
