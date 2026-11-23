-- 0002 : largeur du papier thermique par structure
alter table public.structures
  add column if not exists paper_width_mm integer not null default 80;

alter table public.structures
  add constraint structures_paper_width_chk
  check (paper_width_mm in (58, 80));