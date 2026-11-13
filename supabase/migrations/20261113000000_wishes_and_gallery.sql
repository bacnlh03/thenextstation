-- Wishes: guests leave a message
create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete set null,
  guest_name text not null default 'Khách mời',
  message text not null check (char_length(message) >= 1 and char_length(message) <= 500),
  created_at timestamptz not null default now()
);

create index wishes_created_at_idx on public.wishes (created_at desc);

-- RLS: anyone can read; anyone can insert (anon guests leave wishes)
alter table public.wishes enable row level security;

create policy "Public read wishes"
  on public.wishes for select
  to anon, authenticated
  using (true);

create policy "Public insert wishes"
  on public.wishes for insert
  to anon, authenticated
  with check (true);

create policy "Authenticated manage wishes"
  on public.wishes for all
  to authenticated
  using (true)
  with check (true);

-- Public RPC to submit a wish (safe, rate-limited via Supabase)
create or replace function public.submit_wish(
  p_guest_id uuid,
  p_guest_name text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.wishes (guest_id, guest_name, message)
  values (p_guest_id, p_guest_name, p_message);
end;
$$;

grant execute on function public.submit_wish(uuid, text, text) to anon, authenticated;

