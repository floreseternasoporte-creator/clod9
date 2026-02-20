# Supabase setup completo (datos + fotos)

## 1) Variables de entorno

Configura en Vercel/local:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo backend)
- `SUPABASE_STORAGE_BUCKET` (opcional, default: `media`)

> Seguridad: nunca subas claves `sb_secret_*` al repositorio ni al frontend.

## 2) Storage (fotos)

1. Crea bucket `media` (o el nombre de `SUPABASE_STORAGE_BUCKET`).
2. Márcalo como **public** para URLs directas.

Rutas usadas por backend:
- `story-covers/{userId}/{storyId}.jpg`
- `notes/{userId}/{noteId}.jpg|png`
- `{imageType}/{userId}/{timestamp}_{fileName}`

## 3) SQL inicial (tablas)

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

create table if not exists public.stories (
  id bigint generated always as identity primary key,
  story_id text unique not null,
  user_id text not null,
  username text not null default 'Usuario',
  email text not null default '',
  title text not null default 'Story',
  category text not null default 'story',
  rating text not null default 'all',
  language text not null default 'es',
  synopsis text not null default '',
  cover_image text,
  timestamp bigint not null,
  views integer not null default 0,
  likes integer not null default 0,
  created_at bigint not null,
  updated_at bigint not null
);

create table if not exists public.notes (
  id bigint generated always as identity primary key,
  note_id text unique not null,
  user_id text not null,
  author_name text not null default 'Usuario',
  author_image text,
  content text not null default '',
  image_url text,
  file_name text,
  timestamp bigint not null,
  likes integer not null default 0,
  blocked boolean not null default false
);

create table if not exists public.community_notes (
  id bigint generated always as identity primary key,
  note_id text unique not null,
  user_id text not null,
  author_name text not null default 'Usuario',
  author_image text,
  content text not null default '',
  image_url text,
  timestamp bigint not null,
  likes integer not null default 0
);

create index if not exists idx_users_username on public.users (username);
create index if not exists idx_users_email on public.users (email);
create index if not exists idx_likes_note_id on public.likes (note_id);
create index if not exists idx_stories_user_id on public.stories (user_id);
create index if not exists idx_notes_user_id on public.notes (user_id);
```

## 4) APIs ya migradas a Supabase

- `users.js` (perfiles + búsqueda)
- `likes.js`
- `following.js`
- `upload-image.js` (fotos a Storage)
- `upload-story.js`, `get-stories.js`, `update-story.js`, `delete-story.js`
- `notes.js` (incluye imagen en Storage)
- `community-notes.js`
- `user-stats.js`
