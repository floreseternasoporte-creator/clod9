# Auditoría profunda de errores detectados

Fecha: 2026-03-05
Alcance: revisión estática de backend serverless Node + frontend JS/HTML del repositorio.

## 1) Errores críticos

1. **Borrado de historias sin autorización de propietario**
   - `delete-story.js` elimina cualquier historia solo con `storyId`.
   - No valida `userId`, sesión ni ownership antes de borrar.
   - Impacto: cualquier cliente puede eliminar contenido de terceros.

2. **Actualización de historias sin autorización**
   - `update-story.js` permite modificar cualquier historia con `storyId` + `updates`.
   - No valida autor, token ni reglas de permiso.
   - Impacto: alteración de contenido de terceros.

3. **XSS en render de comunidad (inyección HTML directa)**
   - `community-firebase.js` usa `innerHTML` con `note.authorName`, `note.content`, `note.imageUrl` sin sanitizar.
   - Impacto: ejecución de scripts inyectados desde contenido persistido.

4. **XSS en visor de historias (inyección HTML directa)**
   - `stories.js` construye `innerHTML` con `displayName` y `story.coverImage` sin sanitización estricta.
   - Impacto: ejecución de payloads en clientes.

## 2) Errores altos

5. **CORS/preflight incompleto en endpoints usados por frontend**
   - `notifications.js`, `get-chapters.js`, `send-support-email.js`, `check-user-limits.js` no manejan `OPTIONS`.
   - Varias respuestas tampoco adjuntan headers CORS consistentes.
   - Impacto: fallos intermitentes de navegador (405/blocked by CORS).

6. **Inconsistencia de contrato API en `scheduled-chapters.js`**
   - Requiere `chapterId` para cualquier `POST`, incluso para crear nuevos registros.
   - Eso impide alta simple sin ID generado por backend.

7. **Desfase entre endpoints duplicados de capítulos**
   - Existen `chapters.js` y `get-chapters.js` con comportamientos distintos.
   - Riesgo de divergencia funcional y bugs por consumo mixto.

8. **Pérdida de consistencia por falta de transacciones en likes agregados**
   - `likes.js` recalcula y parchea contadores de `notes` y `community_notes` en pasos separados.
   - En concurrencia alta, el total mostrado puede desfasarse.

9. **Seguimientos sin actualización de contadores de usuario**
   - `following.js` escribe relaciones `following/followers`, pero no sincroniza `followersCount/followingCount` en `users`.
   - Impacto: perfiles muestran métricas incorrectas.

10. **Sin validación de tamaño de payload (base64)**
   - `upload-image.js`, `upload-story.js`, `notes.js`, `community-notes.js` aceptan `imageData/coverImageData` sin límite.
   - Impacto: DoS por memoria/costos y latencias altas.

## 3) Errores medios

11. **`send-support-email.js` no envía email real**
   - El endpoint guarda ticket en RTDB, pero el nombre implica envío de correo.
   - Impacto: expectativa funcional incorrecta de producto/soporte.

12. **`upload-image.js` devuelve `imageUrl` como `imageData` crudo**
   - Responde `{ imageUrl: String(imageData) }` en lugar de URL servible estable.
   - Impacto: confusión de cliente y no hay URL compartible real.

13. **Generación de timestamps al leer datos faltantes**
   - `users.js` y `get-stories.js` usan `Date.now()` como fallback en lectura.
   - Impacto: puede “simular actividad reciente” para datos incompletos y alterar ordenamientos.

14. **`discover-feed.js` y `trending-tags.js` escalan con scans amplios sin cache**
   - Cargan hasta cientos de registros por colección en cada request.
   - Impacto: latencia/costo en frío y riesgo de timeout en serverless.

15. **Modelo de errores HTTP poco consistente**
   - Algunos endpoints devuelven string plano en errores (`Method Not Allowed`) y otros JSON.
   - Impacto: clientes deben manejar formatos heterogéneos.

## 4) Observaciones de mantenimiento

16. **Lista de rutas en `index.js` es manual**
   - Si se agrega endpoint y no se registra en `allowedRoutes`, queda “invisible”.
   - Riesgo de despliegues con endpoints no enrutable.

17. **Nombres de claves en RTDB no unificados (`community`, `community_notes`, `communityNotes`)**
   - Ya existen rutas con fallbacks y merge por diferencias de naming.
   - Riesgo de datos partidos y lógica duplicada.

18. **Falta de rate limiting / auth fuerte en endpoints sensibles**
   - Varios endpoints confían en `userId` enviado por cliente.
   - Riesgo de abuso (spam, escritura masiva, suplantación).

---

## Comandos usados para la revisión

- `git log --oneline -n 3`
- `rg -n "TODO|FIXME|throw new Error|console\\.error|Math\\.random|Date\\.now\\(|JSON\\.parse\\(|queryStringParameters|event\\.body|module\\.exports" *.js api/index.js`
- Inspección manual de archivos clave con `sed -n` y `nl -ba`.

## Nota de alcance

Esta lista corresponde a **todos los errores detectables en revisión estática profunda** del estado actual del repositorio. Para una cobertura total de ejecución real faltaría:
- pruebas E2E con Firebase real,
- pruebas de carga,
- pruebas de seguridad (XSS/IDOR) automatizadas.
