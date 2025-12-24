-- Enable Row Level Security on all tables
-- This will be done after table creation

-- 1. PROFILES
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),

  primary key (id)
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. PARTNERSHIPS
create table public.partnerships (
  id uuid not null default gen_random_uuid() primary key,
  user_id_1 uuid not null references public.profiles(id) on delete cascade,
  user_id_2 uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending', -- 'pending', 'accepted'
  created_at timestamptz default now(),

  constraint different_users check (user_id_1 <> user_id_2),
  constraint unique_partnership unique (user_id_1, user_id_2)
);

alter table public.partnerships enable row level security;

create policy "Users can see their own partnerships" on public.partnerships
  for select using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

create policy "Users can create partnerships" on public.partnerships
  for insert with check (auth.uid() = user_id_1);

create policy "Users can update their own partnerships" on public.partnerships
  for update using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

create policy "Users can delete their own partnerships" on public.partnerships
  for delete using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

-- 3. TASKS
create table public.tasks (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  status text default 'TODO',
  priority text default 'MEDIUM',
  due_date timestamptz,
  reminder_time timestamptz,
  subtasks jsonb default '[]'::jsonb,
  tags text[] default array[]::text[],
  type text default 'TASK',
  duration int,
  location text,
  dependency_ids uuid[] default array[]::uuid[],
  is_shared boolean default false,
  recurrence jsonb,
  next_recurrence_date timestamptz, -- Used to schedule the next instance
  created_at timestamptz default now()
);

alter table public.tasks enable row level security;

create policy "Users can view their own tasks" on public.tasks
  for select using (
    auth.uid() = user_id
    OR
    (is_shared = true AND exists (
      select 1 from public.partnerships
      where (user_id_1 = auth.uid() and user_id_2 = tasks.user_id)
         or (user_id_1 = tasks.user_id and user_id_2 = auth.uid())
         and status = 'accepted'
    ))
  );

create policy "Users can create their own tasks" on public.tasks
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own tasks" on public.tasks
  for update using (auth.uid() = user_id);

create policy "Users can delete their own tasks" on public.tasks
  for delete using (auth.uid() = user_id);

-- 4. TRANSACTIONS (Budget)
create table public.transactions (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  description text not null,
  amount numeric not null,
  type text not null, -- 'income', 'expense'
  date timestamptz default now(),
  frequency text, -- 'daily', 'weekly', 'monthly', 'yearly' (for recurring templates)
  next_due_date timestamptz, -- if set, this is a recurring template
  created_at timestamptz default now()
);

alter table public.transactions enable row level security;

create policy "Users can view own transactions" on public.transactions
  for select using (auth.uid() = user_id);

create policy "Users can insert own transactions" on public.transactions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own transactions" on public.transactions
  for update using (auth.uid() = user_id);

create policy "Users can delete own transactions" on public.transactions
  for delete using (auth.uid() = user_id);

-- 5. USER SETTINGS
create table public.user_settings (
  user_id uuid not null references public.profiles(id) on delete cascade primary key,
  budget_limit numeric default 0,
  budget_duration text default 'Monthly',
  savings numeric default 0,
  display_name text,
  theme text default 'dark',
  updated_at timestamptz default now()
);

alter table public.user_settings enable row level security;

create policy "Users can view own settings" on public.user_settings
  for select using (auth.uid() = user_id);

create policy "Users can insert/update own settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Indexes for performance
create index tasks_user_id_idx on public.tasks(user_id);
create index transactions_user_id_idx on public.transactions(user_id);
create index transactions_next_due_date_idx on public.transactions(next_due_date) where next_due_date is not null;
