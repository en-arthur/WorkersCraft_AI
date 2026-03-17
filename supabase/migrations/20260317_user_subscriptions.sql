create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  polar_customer_id text,
  polar_subscription_id text,
  plan text not null default 'starter', -- starter | pro | max
  status text not null default 'active', -- active | inactive | past_due
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

alter table public.user_subscriptions enable row level security;

create policy "Users can read own subscription"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);
