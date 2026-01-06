-- Create notes table for storing user notes and checklists
create table public.notes (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text default '',
  is_checklist boolean default false,
  checklist_items jsonb default '[]'::jsonb,
  is_shared boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.notes enable row level security;

-- Create note_shares table for managing sharing
create table public.note_shares (
  id uuid not null default gen_random_uuid() primary key,
  note_id uuid not null references public.notes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  shared_with_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  
  constraint unique_note_share unique (note_id, shared_with_id),
  constraint different_users_share check (owner_id <> shared_with_id)
);

-- Enable RLS on note_shares
alter table public.note_shares enable row level security;

-- RLS Policies for notes table
-- Users can view their own notes
create policy "Users can view own notes" on public.notes
  for select using (auth.uid() = user_id);

-- Users can view notes shared with them
create policy "Users can view shared notes" on public.notes
  for select using (
    is_shared = true AND exists (
      select 1 from public.note_shares
      where note_shares.note_id = notes.id
        and note_shares.shared_with_id = auth.uid()
    )
  );

-- Users can create their own notes
create policy "Users can create own notes" on public.notes
  for insert with check (auth.uid() = user_id);

-- Users can update their own notes
create policy "Users can update own notes" on public.notes
  for update using (auth.uid() = user_id);

-- Users can delete their own notes
create policy "Users can delete own notes" on public.notes
  for delete using (auth.uid() = user_id);

-- RLS Policies for note_shares table
-- Users can view shares for their notes or notes shared with them
create policy "Users can view note shares" on public.note_shares
  for select using (
    auth.uid() = owner_id OR auth.uid() = shared_with_id
  );

-- Users can create shares for their own notes
create policy "Users can create note shares" on public.note_shares
  for insert with check (auth.uid() = owner_id);

-- Users can delete shares for their own notes
create policy "Users can delete note shares" on public.note_shares
  for delete using (auth.uid() = owner_id);

-- Indexes for performance
create index notes_user_id_idx on public.notes(user_id);
create index notes_is_shared_idx on public.notes(is_shared) where is_shared = true;
create index note_shares_note_id_idx on public.note_shares(note_id);
create index note_shares_shared_with_id_idx on public.note_shares(shared_with_id);

-- Function to update updated_at timestamp
create or replace function public.update_notes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger update_notes_timestamp
  before update on public.notes
  for each row
  execute function public.update_notes_updated_at();
