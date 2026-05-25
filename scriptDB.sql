-- ============================================================================
--  GEOPORTAL DE ASISTENCIA MÉDICA - EL SALVADOR
--  Script de creación de base de datos desde cero (Supabase / PostgreSQL)
-- ----------------------------------------------------------------------------

-- Extensión para gen_random_uuid() (en Supabase ya suele venir, por si acaso)
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Función genérica para mantener updated_at al día
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. PERFILES DE USUARIO  (ligados a auth.users, id de tipo uuid)
-- ============================================================================
create table public.user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

-- Cada quien ve y edita SOLO su propio perfil
create policy "profiles_select_own"
  on public.user_profiles for select
  to authenticated using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.user_profiles for insert
  to authenticated with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.user_profiles for update
  to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- Crea el perfil automáticamente cuando alguien se registra en auth.users.
-- SECURITY DEFINER + search_path fijo = se ejecuta con permisos correctos.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 2. CENTROS MÉDICOS
--    type DEBE ser 'hospital' | 'clinic' | 'health_center' (lo filtra la app)
-- ============================================================================
create table public.medical_centers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null check (type in ('hospital', 'clinic', 'health_center')),
  lat         double precision not null,
  lng         double precision not null,
  address     text not null default '',
  phone       text not null default '',
  schedule    text not null default '',
  services    text[] not null default '{}',
  emergency   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.medical_centers enable row level security;

-- Lectura pública (info de centros médicos es de interés público)
create policy "medical_centers_read_all"
  on public.medical_centers for select
  to public using (true);

-- Gestión (alta/edición/borrado) para usuarios autenticados (panel admin)
create policy "medical_centers_insert_auth"
  on public.medical_centers for insert
  to authenticated with check (true);
create policy "medical_centers_update_auth"
  on public.medical_centers for update
  to authenticated using (true) with check (true);
create policy "medical_centers_delete_auth"
  on public.medical_centers for delete
  to authenticated using (true);

create index idx_medical_centers_type      on public.medical_centers(type);
create index idx_medical_centers_emergency on public.medical_centers(emergency);

create trigger trg_medical_centers_updated_at
  before update on public.medical_centers
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 3. ZONAS DE EMERGENCIA
-- ============================================================================
create table public.emergency_zones (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  municipality           text,
  department             text,
  lat                    double precision not null,
  lng                    double precision not null,
  radius                 integer not null default 1000,
  population             integer not null default 0,
  emergency_rate         double precision not null default 0,
  risk_level             text not null default 'low' check (risk_level in ('low','medium','high','critical')),
  nearest_hospitals      text[] not null default '{}',
  average_response_time  double precision not null default 0,
  monthly_incidents      integer not null default 0,
  yearly_incidents       integer not null default 0,
  active                 boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.emergency_zones enable row level security;

create policy "emergency_zones_read_all"
  on public.emergency_zones for select to public using (true);
create policy "emergency_zones_insert_auth"
  on public.emergency_zones for insert to authenticated with check (true);
create policy "emergency_zones_update_auth"
  on public.emergency_zones for update to authenticated using (true) with check (true);
create policy "emergency_zones_delete_auth"
  on public.emergency_zones for delete to authenticated using (true);

create index idx_emergency_zones_active     on public.emergency_zones(active);
create index idx_emergency_zones_risk_level on public.emergency_zones(risk_level);

create trigger trg_emergency_zones_updated_at
  before update on public.emergency_zones
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 4. ZONAS DE DENSIDAD POBLACIONAL
-- ============================================================================
create table public.population_density_zones (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  municipality         text,
  department           text,
  lat                  double precision not null,
  lng                  double precision not null,
  radius               integer not null default 1000,
  population           integer not null default 0,
  population_density   double precision not null default 0,
  density_level        text not null default 'low' check (density_level in ('very_low','low','medium','high','very_high')),
  area_km2             double precision not null default 0,
  urban_percentage     double precision not null default 0,
  rural_percentage     double precision not null default 0,
  growth_rate          double precision not null default 0,
  age_groups           jsonb not null default '{"children":0,"adults":0,"elderly":0}',
  economic_activity    text[] not null default '{}',
  infrastructure_level text not null default 'basic' check (infrastructure_level in ('basic','intermediate','advanced')),
  active               boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.population_density_zones enable row level security;

create policy "population_zones_read_all"
  on public.population_density_zones for select to public using (true);
create policy "population_zones_insert_auth"
  on public.population_density_zones for insert to authenticated with check (true);
create policy "population_zones_update_auth"
  on public.population_density_zones for update to authenticated using (true) with check (true);
create policy "population_zones_delete_auth"
  on public.population_density_zones for delete to authenticated using (true);

create index idx_population_zones_active on public.population_density_zones(active);

create trigger trg_population_zones_updated_at
  before update on public.population_density_zones
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 5. INCIDENTES DE EMERGENCIA
-- ============================================================================
create table public.emergency_incidents (
  id             uuid primary key default gen_random_uuid(),
  incident_type  text not null default 'medical' check (incident_type in ('medical','accident','cardiac','respiratory','trauma','other')),
  severity       text not null default 'low' check (severity in ('low','medium','high','critical')),
  lat            double precision not null,
  lng            double precision not null,
  zone_id        uuid references public.emergency_zones(id) on delete set null,
  hospital_id    uuid references public.medical_centers(id) on delete set null,
  response_time  double precision,
  resolved       boolean not null default false,
  description    text,
  reported_at    timestamptz not null default now(),
  resolved_at    timestamptz,
  updated_at     timestamptz not null default now()
);

alter table public.emergency_incidents enable row level security;

create policy "emergency_incidents_read_all"
  on public.emergency_incidents for select to public using (true);
create policy "emergency_incidents_insert_auth"
  on public.emergency_incidents for insert to authenticated with check (true);
create policy "emergency_incidents_update_auth"
  on public.emergency_incidents for update to authenticated using (true) with check (true);
create policy "emergency_incidents_delete_auth"
  on public.emergency_incidents for delete to authenticated using (true);

create index idx_emergency_incidents_zone        on public.emergency_incidents(zone_id);
create index idx_emergency_incidents_reported_at on public.emergency_incidents(reported_at);

create trigger trg_emergency_incidents_updated_at
  before update on public.emergency_incidents
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 6. ESTADÍSTICAS DE EMERGENCIA
-- ============================================================================
create table public.emergency_stats (
  id                       uuid primary key default gen_random_uuid(),
  total_incidents          integer not null default 0,
  total_resolved           integer not null default 0,
  average_response_time    double precision not null default 0,
  critical_zones           integer not null default 0,
  hospitals_with_emergency integer not null default 0,
  last_calculated          timestamptz not null default now()
);

alter table public.emergency_stats enable row level security;

create policy "emergency_stats_read_all"
  on public.emergency_stats for select to public using (true);
create policy "emergency_stats_insert_auth"
  on public.emergency_stats for insert to authenticated with check (true);
create policy "emergency_stats_update_auth"
  on public.emergency_stats for update to authenticated using (true) with check (true);

-- ============================================================================
-- 7. DATOS DE EJEMPLO (para que el mapa no salga vacío)
-- ============================================================================
insert into public.medical_centers (name, type, lat, lng, address, phone, schedule, services, emergency) values
('Hospital Nacional Rosales', 'hospital', 13.7041, -89.2042, 'Boulevard de Los Héroes, San Salvador', '2231-9200', '24 horas', array['Emergencias','Cirugía','Medicina Interna','Cardiología'], true),
('Hospital Nacional de Niños Benjamin Bloom', 'hospital', 13.7089, -89.2156, 'Boulevard de Los Héroes, San Salvador', '2231-9200', '24 horas', array['Pediatría','Neonatología','Emergencias Pediátricas'], true),
('Hospital Nacional Jorge Mazzini', 'hospital', 13.9944, -89.5594, 'Santa Ana', '2440-9200', '24 horas', array['Emergencias','Cirugía','Maternidad'], true),
('Hospital Nacional San Juan de Dios', 'hospital', 13.4833, -88.1833, 'San Miguel', '2661-1717', '24 horas', array['Emergencias','Cirugía','Traumatología'], true),
('Clínica Comunal San Jacinto', 'clinic', 13.6822, -89.1885, 'Barrio San Jacinto, 10a Avenida Sur, San Salvador', '2235-8900', 'Lunes a Viernes 7:00-18:00', array['Medicina General','Pediatría','Odontología'], false),
('Clínica Comunal Antiguo Cuscatlán', 'clinic', 13.6683, -89.2506, 'Antiguo Cuscatlán, La Libertad', '2243-7400', 'Lunes a Sábado 7:00-17:00', array['Medicina General','Laboratorio','Rayos X'], false),
('UCSF San Antonio Abad', 'health_center', 13.7153, -89.2156, 'Final Calle San Antonio Abad, San Salvador', '2200-0000', 'Lunes a Viernes 7:00-16:00', array['Consulta General','Vacunación','Control Prenatal'], false),
('Unidad Médica Soyapango', 'health_center', 13.7420, -89.1401, 'Soyapango, San Salvador', '2277-4500', 'Lunes a Viernes 7:00-16:00', array['Consulta General','Vacunación','Medicina Preventiva'], false),
('Unidad Médica Santa Ana Centro', 'health_center', 13.9956, -89.5625, 'Centro de Santa Ana', '2447-8800', 'Lunes a Viernes 7:00-16:00', array['Consulta General','Odontología','Laboratorio'], false);

insert into public.emergency_zones (name, municipality, department, lat, lng, radius, population, emergency_rate, risk_level, nearest_hospitals, average_response_time, monthly_incidents, yearly_incidents) values
('Zona Centro Histórico', 'San Salvador', 'San Salvador', 13.6980, -89.1910, 1500, 50000, 8.5, 'high', array['Hospital Nacional Rosales'], 12.5, 150, 1800),
('Zona Soyapango', 'Soyapango', 'San Salvador', 13.7420, -89.1401, 2000, 80000, 6.2, 'medium', array['Hospital Nacional Rosales'], 15.0, 120, 1440);

insert into public.population_density_zones (name, municipality, department, lat, lng, radius, population, population_density, density_level, area_km2, urban_percentage, rural_percentage, growth_rate, age_groups, economic_activity, infrastructure_level) values
('Área Metropolitana San Salvador', 'San Salvador', 'San Salvador', 13.7042, -89.2042, 5000, 316090, 11175.4, 'very_high', 28.3, 95.2, 4.8, 0.8, '{"children":85000,"adults":205000,"elderly":26090}', array['Comercio','Servicios','Industria'], 'advanced'),
('Santa Ana Centro', 'Santa Ana', 'Santa Ana', 13.9944, -89.5594, 4000, 245421, 2845.6, 'high', 86.2, 78.5, 21.5, 1.2, '{"children":68000,"adults":155000,"elderly":22421}', array['Agricultura','Comercio','Industria Textil'], 'intermediate');

insert into public.emergency_stats (total_incidents, total_resolved, average_response_time, critical_zones, hospitals_with_emergency)
values (0, 0, 11.2, 1, 4);

