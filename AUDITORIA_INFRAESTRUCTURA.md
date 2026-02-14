# Auditoría de infraestructura (Firebase vs AWS vs Vercel)

## Resultado corto
No: **la plataforma todavía no está en modo “Firebase solo autenticación”**.

Actualmente Firebase se usa en:
- **Auth** (correcto)
- **Realtime Database** (incorrecto para el objetivo) para múltiples módulos: perfiles, seguidores, comunidad, live, chat, mensajes, notificaciones y capítulos programados.

## Evidencia encontrada
- `index.html` sigue cargando SDK de Realtime Database y Storage de Firebase en el frontend.
- `index.html` contiene un volumen alto de llamadas `firebase.database().ref(...)` para funcionalidades críticas.
- A nivel backend, los endpoints bajo `api/` sí están preparados para Vercel + AWS S3 (con `runVercelHandler` y AWS SDK).

## Estado de despliegue
- Objetivo de despliegue: **Vercel**.
- El directorio `netlify/` fue retirado del repositorio en esta actualización.

## Conclusión técnica
Para cumplir 100% tu regla (“Firebase solo autenticación”), falta migrar del frontend todos los módulos que todavía escriben/leen de `firebase.database()` hacia `/api/*` en Vercel (persistiendo en AWS/S3 o la base que definas en Vercel).
