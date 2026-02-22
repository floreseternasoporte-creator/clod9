# BeaBoo Platform - Despliegue en Vercel (Firebase)

## Estado

1. ✅ Backend de datos unificado en Firebase Realtime Database
2. ✅ APIs funcionando en Vercel Serverless Functions
3. ✅ Imágenes y portadas manejadas en flujo base64 con Firebase

## Variables de entorno en Vercel

Configura en tu proyecto:

```bash
FIREBASE_DATABASE_URL=https://<tu-proyecto>.firebaseio.com
FIREBASE_DATABASE_SECRET=<opcional_si_tus_reglas_lo_requieren>
SUPPORT_EMAIL=support@zenvio.app
NODE_ENV=production
```

## Arquitectura

- **Frontend**: HTML/CSS/JS estáticos servidos por Vercel
- **Backend**: Vercel Serverless Function unificada en `api/index.js` (catch-all)
- **Base de datos**: Firebase Realtime Database
- **Autenticación**: Firebase Auth

## Endpoints de diagnóstico

- `GET /api/health` → estado del runtime y variables de Firebase.
- `GET /api/health-firebase` → prueba conectividad real con Firebase Realtime Database.
