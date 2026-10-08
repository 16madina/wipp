-- Gagne des récompenses : parrainage, badges, épinglage d'entreprise.
-- badge : null (personne), 'blue' (Ambassadeur : 3 amis invités actifs), 'gold' (certifié par WIPP / admin).
alter table wipp_profiles add column if not exists badge text check (badge in ('blue', 'gold'));
alter table wipp_profiles add column if not exists referred_by text references wipp_profiles(id) on delete set null;
-- Rempli au premier message envoyé par le filleul : seule une invitation « active » compte.
alter table wipp_profiles add column if not exists referral_qualified_at timestamptz;
create index if not exists wipp_profiles_referred_by_idx on wipp_profiles (referred_by) where referred_by is not null;

-- Codes d'épinglage gagnés (5 amis → 7 jours, 10 amis → 30 jours). Un code s'utilise une fois,
-- sur sa propre entreprise ou offert à une autre.
create table if not exists wipp_pin_rewards (
  id text primary key,
  owner_id text not null references wipp_profiles(id) on delete cascade,
  tier int not null,
  days int not null,
  code text not null unique,
  created_at timestamptz not null default now(),
  redeemed_card_id uuid references wipp_business_cards(id) on delete set null,
  redeemed_by text references wipp_profiles(id) on delete set null,
  redeemed_at timestamptz,
  unique (owner_id, tier)
);
alter table wipp_pin_rewards enable row level security;

alter table wipp_business_cards add column if not exists pinned_until timestamptz;

-- L'admin est certifiée (badge doré).
update wipp_profiles set badge = 'gold' where role = 'admin';
