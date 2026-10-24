-- NovaAI — migrations Supabase (tables, RLS, fonctions crédits)

-- 1. Tables
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  credits integer not null default 50,            -- crédits de bienvenue
  plan text not null default 'gratuit',
  is_admin boolean not null default false,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table if not exists generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  tool text not null check (tool in ('image','text','summary','voice','code')),
  cost integer not null,
  status text not null check (status in ('success','failed')),
  created_at timestamptz not null default now()
);

create table if not exists credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  amount integer not null,             -- négatif = débit, positif = crédit/remboursement
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists webhook_events (
  id text primary key,                 -- id d'événement Stripe
  type text not null,
  created_at timestamptz not null default now()
);

-- 2. RLS : accès à ses propres lignes uniquement, lecture admin pour stats
alter table profiles enable row level security;
alter table generations enable row level security;
alter table credit_transactions enable row level security;
alter table webhook_events enable row level security;

drop policy if exists "profil self" on profiles;
create policy "profil self" on profiles
  for select using (auth.uid() = id);

drop policy if exists "generations self" on generations;
create policy "generations self" on generations
  for select using (auth.uid() = user_id);

drop policy if exists "transactions self" on credit_transactions;
create policy "transactions self" on credit_transactions
  for select using (auth.uid() = user_id);

-- webhook_events : aucune politique => inaccessible aux clients (service role uniquement)

-- 3. Création automatique du profil à l'inscription
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 4. Fonctions crédits (atomiques, appelées via RPC côté serveur)

-- Déduction atomique : retourne true si débit réussi, false si crédits insuffisants
create or replace function spend_credits(p_user uuid, p_cost integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  update profiles
     set credits = credits - p_cost
   where id = p_user and credits >= p_cost
   returning true into ok;
  if ok is null then return false; end if;
  insert into credit_transactions (user_id, amount, reason) values (p_user, -p_cost, 'génération');
  return true;
end $$;

-- Remboursement (génération échouée)
create or replace function refund_credits(p_user uuid, p_amount integer, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update profiles set credits = credits + p_amount where id = p_user;
  insert into credit_transactions (user_id, amount, reason) values (p_user, p_amount, p_reason);
end $$;

-- Octroi de crédits (abonnement / renouvellement)
create or replace function grant_credits(p_user uuid, p_amount integer, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_amount > 0 then
    update profiles set credits = credits + p_amount where id = p_user;
    insert into credit_transactions (user_id, amount, reason) values (p_user, p_amount, p_reason);
  end if;
end $$;

-- 5. Index
create index if not exists idx_generations_user on generations(user_id, created_at desc);
create index if not exists idx_transactions_user on credit_transactions(user_id, created_at desc);
