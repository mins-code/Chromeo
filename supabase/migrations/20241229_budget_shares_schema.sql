-- Budget Shares Table
-- Tracks which users have shared their budget with which partners

create table public.budget_shares (
  id uuid not null default gen_random_uuid() primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  partner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  
  constraint unique_budget_share unique (owner_id, partner_id),
  constraint different_users check (owner_id <> partner_id)
);

-- Enable RLS
alter table public.budget_shares enable row level security;

-- Policy: Owners can see their own shares
create policy "Owners can view their budget shares" on public.budget_shares
  for select using (auth.uid() = owner_id);

-- Policy: Partners can see budgets shared with them
create policy "Partners can view shares with them" on public.budget_shares
  for select using (auth.uid() = partner_id);

-- Policy: Only owners can create shares
create policy "Owners can create budget shares" on public.budget_shares
  for insert with check (auth.uid() = owner_id);

-- Policy: Only owners can delete shares
create policy "Owners can delete budget shares" on public.budget_shares
  for delete using (auth.uid() = owner_id);

-- Index for performance
create index budget_shares_owner_id_idx on public.budget_shares(owner_id);
create index budget_shares_partner_id_idx on public.budget_shares(partner_id);
