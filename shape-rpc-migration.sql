-- RPC: geeft distinct shapes terug voor een gebruiker
-- Vervangt het ophalen van alle selected_options enkel voor shape-detectie
-- Gebruik: supabase.rpc('get_user_configured_shapes', { p_user_id: user.id })

create or replace function get_user_configured_shapes(p_user_id uuid)
returns table(shape text)
language sql
stable
security definer
as $$
  select distinct (selected_options->>'shape')::text as shape
  from configurations
  where user_id = p_user_id
    and (selected_options->>'shape') is not null
$$;

-- Rechten voor authenticated gebruikers
grant execute on function get_user_configured_shapes(uuid) to authenticated;
