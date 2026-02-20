# Supabase setup (likes, follows, users)

## 1) Variables de entorno

Configura estas variables en Vercel (o local):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo backend)

> Seguridad: nunca subas claves `sb_secret_*` al repositorio ni al frontend.

## 2) SQL inicial

```sql
create table if not exists public.users (
  id bigint generated always as identity primary key,
  user_id text unique not null,
  username text not null default 'Usuario',
  email text not null default '',
  bio text not null default '',
  profile_image text not null default '',
  followers_count integer not null default 0,
  following_count integer not null default 0,
  rated_count integer not null default 0,
  is_verified boolean not null default false,
  founder boolean not null default false,
  registration_timestamp bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at timestamptz not null default now()
);

create table if not exists public.likes (
  id bigint generated always as identity primary key,
  note_id text not null,
  user_id text not null,
  created_at timestamptz not null default now(),
  unique (note_id, user_id)
);

create table if not exists public.following (
  id bigint generated always as identity primary key,
  follower_id text not null,
  following_id text not null,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id)
);

create index if not exists idx_users_username on public.users (username);
create index if not exists idx_users_email on public.users (email);
create index if not exists idx_likes_note_id on public.likes (note_id);
```

## 3) APIs migradas

- `users.js`: lectura, búsqueda (`q`) y upsert de perfiles.
- `likes.js`: like/unlike y conteo exacto por nota.
- `following.js`: follow/unfollow con upsert.

