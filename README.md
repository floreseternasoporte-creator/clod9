# Configuración de Vercel Functions

## Arquitectura
- **Firebase**: Autenticación + aún hay uso de Realtime Database en frontend (pendiente migración completa)
- **AWS S3**: TODO (datos + imágenes)
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
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
AWS_S3_BUCKET
SUPPORT_EMAIL
```

## Funciones

- `notes.js` - GET/POST/DELETE notas
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
