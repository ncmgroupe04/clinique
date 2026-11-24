-- Add print_format column to structures (thermal 80mm, thermal 58mm, or A6 paper)
alter table public.structures
  add column if not exists print_format text not null default '80';

-- Backfill from existing paper_width_mm
update public.structures
  set print_format = case when paper_width_mm = 58 then '58' else '80' end
  where print_format = '80' and paper_width_mm = 58;

-- Allow the value 'a6' as well (no constraint needed beyond app validation)