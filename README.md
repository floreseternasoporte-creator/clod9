# Configuración de Vercel Functions

## Arquitectura
- **Firebase**: Autenticación + Realtime Database para notas (incluye soporte de imágenes base64).
- **Supabase (PostgreSQL + Storage)**: usuarios, likes, follows, historias, notas, búsqueda e imágenes
- **AWS SES**: Emails
- **Vercel Functions**: Serverless

## Estructura en S3

```
zenvio-storage/
├── notes/
│   └── {userId}/
│       └── {noteId}.json
├── likes/
│   └── {noteId}/
│       └── {userId}.json
├── following/
│   └── {userId}/
│       └── {targetUserId}.json
├── notifications/
│   └── {userId}/
│       └── {notifId}.json
└── images/
    ├── profile/{userId}/
    ├── stories/{userId}/
    └── notes/{userId}/
```

## Variables de Entorno

```
SUPPORT_EMAIL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
FIREBASE_DATABASE_URL
FIREBASE_DATABASE_SECRET (opcional, para reglas restringidas)
```

## Funciones

- `notes.js` - GET/POST/DELETE notas en Firebase Realtime Database (con soporte base64)
- `community-notes.js` - GET/POST notas de comunidad
- `likes.js` - POST likes
- `following.js` - POST follow/unfollow
- `notifications.js` - GET/POST notificaciones

- `scheduled-chapters.js` - GET/POST capítulos programados
- `user-stats.js` - GET estadísticas
- `users.js` - GET/POST perfiles de usuario
- `upload-image.js` - POST imágenes
- `send-support-email.js` - POST emails

## Instalación

```bash
npm install
```

## Documentación

- Documentación duplicada del módulo CAPTCHA eliminada para mantener el repositorio limpio.


## Estado real de migración

- Ver auditoría técnica en `AUDITORIA_INFRAESTRUCTURA.md` para el detalle de dependencias activas.
- Objetivo vigente: Firebase solo para auth; datos/tiempo real a través de APIs en Vercel.

- Setup de Supabase: `SUPABASE_SETUP.md`


## Diagnóstico

- `GET /api/health` estado del runtime y variables Supabase.
- `GET /api/health-supabase` prueba conectividad real contra Supabase REST.
