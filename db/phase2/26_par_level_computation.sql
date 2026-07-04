-- Automatic par-level computation (Phase 2, step 5 — see
-- BUILD_PLAN_PHASES_2-4.md 2.3): par_quantity = (average_daily_usage
-- x days_to_delivery) + safety_stock, where average_daily_usage is
-- derived from recipe_lines x pmix_sales over a trailing window.
--
-- The computed value is stored separately (suggested_par_quantity),
-- never overwriting par_levels.par_quantity directly — same "draft,
-- never trusted directly" pattern as invoice OCR. A manager sees the
-- suggestion and applies it explicitly; a computed number never
-- silently overrides a manual reorder threshold.
alter table par_levels add column if not exists avg_daily_usage numeric;
alter table par_levels add column if not exists suggested_par_quantity numeric;

create or replace function compute_par_levels(
  p_restaurant_id uuid,
  p_location_id uuid,
  p_window_days int default 28
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- security definer bypasses RLS, so without this check any
  -- authenticated user could pass another tenant's restaurant_id and
  -- force a write to that tenant's par_levels.
  if p_restaurant_id not in (select my_restaurants()) then
    raise exception 'not a member of this restaurant';
  end if;

  if not exists (
    select 1 from locations
    where id = p_location_id and restaurant_id = p_restaurant_id
  ) then
    raise exception 'location does not belong to this restaurant';
  end if;

  insert into par_levels (
    restaurant_id, location_id, ingredient_id,
    par_quantity, safety_stock, days_to_delivery,
    avg_daily_usage, suggested_par_quantity, updated_at
  )
  select
    p_restaurant_id,
    p_location_id,
    usage.ingredient_id,
    coalesce(existing.par_quantity, 0),
    coalesce(existing.safety_stock, 0),
    coalesce(existing.days_to_delivery, 3),
    usage.avg_daily_usage,
    (usage.avg_daily_usage * coalesce(existing.days_to_delivery, 3)) + coalesce(existing.safety_stock, 0),
    now()
  from (
    select
      rl.ingredient_id,
      sum(rl.quantity * ps.quantity_sold) / p_window_days::numeric as avg_daily_usage
    from recipe_lines rl
    join pmix_sales ps
      on ps.menu_item_pos_id = rl.menu_item_pos_id
     and ps.location_id = rl.location_id
     and ps.restaurant_id = rl.restaurant_id
    where rl.restaurant_id = p_restaurant_id
      and rl.location_id = p_location_id
      and ps.business_date >= current_date - p_window_days
    group by rl.ingredient_id
  ) usage
  left join par_levels existing
    on existing.location_id = p_location_id
   and existing.ingredient_id = usage.ingredient_id
  on conflict (location_id, ingredient_id)
  do update set
    avg_daily_usage = excluded.avg_daily_usage,
    suggested_par_quantity = excluded.suggested_par_quantity,
    updated_at = now();
end;
$$;

revoke all on function compute_par_levels(uuid, uuid, int) from public;
grant execute on function compute_par_levels(uuid, uuid, int) to authenticated;
