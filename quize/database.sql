create extension if not exists pgcrypto;

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  duration_minutes int,
  created_at timestamp default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references public.exams(id) on delete cascade,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_option text,
  created_at timestamp default now()
);

alter table public.exams enable row level security;
alter table public.questions enable row level security;

create policy "Public can read exams"
  on public.exams for select to anon, authenticated using (true);
create policy "Public can insert exams"
  on public.exams for insert to anon, authenticated with check (true);
create policy "Public can update exams"
  on public.exams for update to anon, authenticated using (true) with check (true);
create policy "Public can delete exams"
  on public.exams for delete to anon, authenticated using (true);

create policy "Public can read questions"
  on public.questions for select to anon, authenticated using (true);
create policy "Public can insert questions"
  on public.questions for insert to anon, authenticated with check (true);
create policy "Public can update questions"
  on public.questions for update to anon, authenticated using (true) with check (true);
create policy "Public can delete questions"
  on public.questions for delete to anon, authenticated using (true);

grant select, insert, update, delete on public.exams, public.questions to anon, authenticated;
