-- Settings use keyed JSON (draft + published) so new editable settings need no migration.
-- Content with order, relations or queries gets real tables.
create table admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique, password_hash text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table password_resets (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admins(id) on delete cascade,
  token_hash text not null unique, expires_at timestamptz not null, used_at timestamptz,
  created_at timestamptz not null default now()
);
create table site_settings (
  key text primary key, draft jsonb not null default '{}', published jsonb not null default '{}',
  published_at timestamptz, updated_at timestamptz not null default now()
);
create table settings_versions (
  id uuid primary key default gen_random_uuid(),
  key text not null references site_settings(key) on delete cascade,
  data jsonb not null, created_at timestamptz not null default now()
);
create table skill_categories (
  id uuid primary key default gen_random_uuid(), name text not null unique, sort_order int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table skills (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references skill_categories(id) on delete set null,
  name text not null, icon text, description text,
  level int not null default 50 check (level between 0 and 100), years numeric(4,1) not null default 0,
  featured boolean not null default false, visible boolean not null default true, sort_order int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table services (
  id uuid primary key default gen_random_uuid(),
  title text not null, short_description text, long_description text, icon text, image_url text,
  features text[] not null default '{}', price text, cta_label text, cta_url text,
  visible boolean not null default true, sort_order int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, title text not null, short_description text, full_description text,
  category text, main_image_url text, video_url text, live_url text, github_url text,
  case_study text, client text, completed_on date,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  url text not null, alt text, sort_order int not null default 0, created_at timestamptz not null default now()
);
create table technologies (id uuid primary key default gen_random_uuid(), name text not null unique);
create table project_technologies (
  project_id uuid not null references projects(id) on delete cascade,
  technology_id uuid not null references technologies(id) on delete cascade,
  primary key (project_id, technology_id)
);
create table social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null, label text, url text not null, icon text,
  visible boolean not null default true, sort_order int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table navigation_items (
  id uuid primary key default gen_random_uuid(),
  label text not null, href text not null, visible boolean not null default true, sort_order int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table faq_categories (
  id uuid primary key default gen_random_uuid(), name text not null, sort_order int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table faqs (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references faq_categories(id) on delete set null,
  question text not null, answer text not null, keywords text[] not null default '{}',
  priority int not null default 0, active boolean not null default true, sort_order int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text not null, subject text, message text not null,
  status text not null default 'new' check (status in ('new','read','replied','archived')),
  ip_hash text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table media_assets (
  id uuid primary key default gen_random_uuid(),
  file_name text not null, storage_path text not null unique, url text not null,
  mime_type text not null, size_bytes bigint not null, created_at timestamptz not null default now()
);
-- Analytics: no IPs or personal data stored, only an anonymous visitor id and coarse device info.
create table analytics_sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null, started_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
  country text, region text, device text, browser text, os text, screen text,
  referrer text, landing_path text, is_new_visitor boolean not null default true, page_count int not null default 0
);
create table analytics_events (
  id bigserial primary key,
  session_id uuid not null references analytics_sessions(id) on delete cascade,
  type text not null, path text, target text, meta jsonb not null default '{}', created_at timestamptz not null default now()
);
create index on skills (category_id);
create index on projects (status, sort_order);
create index on project_images (project_id);
create index on faqs (active);
create index on contact_messages (status, created_at desc);
create index on analytics_sessions (started_at);
create index on analytics_events (created_at);
create index on analytics_events (type, created_at);
create index on analytics_events (session_id);

create function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['admins','site_settings','skill_categories','skills','services','projects','social_links','navigation_items','faq_categories','faqs','contact_messages'] loop
    execute format('create trigger %I_updated before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
  -- Supabase exposes public tables through its own API. With RLS on and no policies, that API sees nothing;
  -- only this server (direct Postgres connection) can read and write.
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
