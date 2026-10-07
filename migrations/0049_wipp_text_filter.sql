-- Filtre de mots injurieux sur les textes PUBLICS (exigence Apple 1.2 pour le contenu des utilisateurs).
-- Profils (pseudo, nom, bio, devise), boutiques (nom, description, tags, services), groupes, événements, annonces.
-- NON DESTRUCTIF : n'efface rien. Ne contrôle que les champs qui CHANGENT (une ancienne valeur ne bloque pas
-- la modification d'un autre champ). Erreur SQLSTATE WP001, message en français affiché tel quel par l'app.

create or replace function public.wipp_text_normalize(t text)
returns text language sql immutable as $$
  select regexp_replace(
    translate(lower(coalesce(t, '')),
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœ013457@$_.-*',
      'aaaaaaceeeeiiiinooooouuuuyyooieastas    '),
    '\s+', ' ', 'g')
$$;

create or replace function public.wipp_text_is_offensive(t text)
returns boolean language sql immutable as $$
  select public.wipp_text_normalize(t) ~ (
    '\m('
    -- français
    || 'connards?|connasses?|salopes?|salauds?|encules?|enculee?s?|putes?|putains?|batards?|batardes?'
    || '|niquer?|nique ta|ntm|fdp|pd|pedes?|tapettes?|gouines?|negres?|negresses?|bougnoules?|youpins?'
    || '|petasses?|grognasses?|enfoires?|enfoiree?s?|trou du cul|branleurs?|branlette|couilles?'
    || '|suceuses?|nazis?|hitler'
    -- anglais
    || '|fuck|fucks|fucker|fuckers|fucking|motherfuckers?|shits?|bitch|bitches|cunts?|cocks?'
    || '|pussy|pussies|whores?|sluts?|niggers?|niggas?|faggots?|fags?|porn|porno|rapist'
    || '|assholes?|bastards?'
    || ')\M'
  )
$$;

create or replace function public.wipp_reject_offensive(variadic vals text[])
returns void language plpgsql as $$
declare v text;
begin
  foreach v in array vals loop
    if v is not null and public.wipp_text_is_offensive(v) then
      raise exception using errcode = 'WP001', message = 'Ce texte contient un mot interdit. Modifie-le et réessaie.';
    end if;
  end loop;
end $$;

-- Profils
create or replace function public.wipp_filter_profiles() returns trigger language plpgsql as $$
begin
  perform public.wipp_reject_offensive(
    case when tg_op = 'INSERT' or new.username is distinct from old.username then new.username end,
    case when tg_op = 'INSERT' or new.display_name is distinct from old.display_name then new.display_name end,
    case when tg_op = 'INSERT' or new.bio is distinct from old.bio then new.bio end,
    case when tg_op = 'INSERT' or new.motto is distinct from old.motto then new.motto end);
  return new;
end $$;
drop trigger if exists wipp_filter_profiles on public.wipp_profiles;
create trigger wipp_filter_profiles before insert or update of username, display_name, bio, motto
  on public.wipp_profiles for each row execute function public.wipp_filter_profiles();

-- Boutiques
create or replace function public.wipp_filter_business_cards() returns trigger language plpgsql as $$
begin
  perform public.wipp_reject_offensive(
    case when tg_op = 'INSERT' or new.name is distinct from old.name then new.name end,
    case when tg_op = 'INSERT' or new.description is distinct from old.description then new.description end,
    case when tg_op = 'INSERT' or new.tags is distinct from old.tags then array_to_string(new.tags, ' ') end,
    case when tg_op = 'INSERT' or new.services is distinct from old.services then
      (select string_agg(coalesce(s->>'name', ''), ' ') from jsonb_array_elements(coalesce(new.services, '[]'::jsonb)) s) end);
  return new;
end $$;
drop trigger if exists wipp_filter_business_cards on public.wipp_business_cards;
create trigger wipp_filter_business_cards before insert or update of name, description, tags, services
  on public.wipp_business_cards for each row execute function public.wipp_filter_business_cards();

-- Groupes, événements, annonces (titre / nom + description)
create or replace function public.wipp_filter_groups() returns trigger language plpgsql as $$
begin
  perform public.wipp_reject_offensive(
    case when tg_op = 'INSERT' or new.name is distinct from old.name then new.name end,
    case when tg_op = 'INSERT' or new.description is distinct from old.description then new.description end);
  return new;
end $$;
drop trigger if exists wipp_filter_groups on public.wipp_groups;
create trigger wipp_filter_groups before insert or update of name, description
  on public.wipp_groups for each row execute function public.wipp_filter_groups();

create or replace function public.wipp_filter_titled() returns trigger language plpgsql as $$
begin
  perform public.wipp_reject_offensive(
    case when tg_op = 'INSERT' or new.title is distinct from old.title then new.title end,
    case when tg_op = 'INSERT' or new.description is distinct from old.description then new.description end);
  return new;
end $$;
drop trigger if exists wipp_filter_events on public.wipp_events;
create trigger wipp_filter_events before insert or update of title, description
  on public.wipp_events for each row execute function public.wipp_filter_titled();
drop trigger if exists wipp_filter_listings on public.wipp_listings;
create trigger wipp_filter_listings before insert or update of title, description
  on public.wipp_listings for each row execute function public.wipp_filter_titled();
