# Configuración de Vercel Functions

## Arquitectura
- **Firebase**: Autenticación + Realtime Database para notas (incluye soporte de imágenes base64).
- **Firebase Realtime Database**: usuarios, likes, follows, historias, notas, comunidad, imágenes y métricas en tiempo real.
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
FIREBASE_DATABASE_URL
FIREBASE_DATABASE_SECRET (opcional, para reglas restringidas)
```

## Funciones

- `notes.js` - GET/POST/DELETE notas (Firebase Realtime + base64)
- `community-notes.js` - GET/POST notas de comunidad (Firebase Realtime + base64)
- `likes.js` - POST likes (Firebase Realtime)
- `following.js` - POST follow/unfollow (Firebase Realtime)
- `users.js` - GET/POST perfiles de usuario (Firebase Realtime)
- `get-stories.js` - GET historias (Firebase Realtime)
- `upload-story.js` - POST historias con portada base64 (Firebase Realtime)
- `update-story.js` - POST actualización de historias (Firebase Realtime)
- `delete-story.js` - POST borrado de historias (Firebase Realtime)
- `upload-image.js` - POST imágenes base64 (Firebase Realtime)
- `user-stats.js` - GET estadísticas (Firebase Realtime)
- `notifications.js` - GET/POST notificaciones
- `scheduled-chapters.js` - GET/POST capítulos programados
- `send-support-email.js` - POST emails

## Instalación

```bash
npm install
```

## Documentación

- Documentación duplicada del módulo CAPTCHA eliminada para mantener el repositorio limpio.


## Estado real de migración

- Ver auditoría técnica en `AUDITORIA_INFRAESTRUCTURA.md` para el detalle de dependencias activas.
- Objetivo vigente: backend de datos consolidado en Firebase Realtime Database mediante APIs en Vercel.


## Diagnóstico

- `GET /api/health` estado del runtime y variables Firebase.
- `GET /api/health-firebase` (o `GET /api/health-supabase` por compatibilidad) prueba conectividad real contra Firebase Realtime Database.
