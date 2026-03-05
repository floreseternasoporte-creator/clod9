# Roadmap de expansión tipo TikTok

Este plan amplía la plataforma sin eliminar funcionalidades existentes y prioriza crecimiento en líneas de código útiles (producto + infraestructura + calidad).

## Fase 1: Descubrimiento y retención (actualizada)
- Feed de descubrimiento con scoring (`discover-feed.js`).
- Tendencias por hashtags (`trending-tags.js`).
- Señales de engagement cruzadas (likes + frescura + follows).

## Fase 2: Experiencia de video corto
- Endpoint para timeline de clips verticales con paginación por cursor.
- Sistema de música/sonidos reutilizables.
- Métricas por reproducción (view-through, completion rate, replay).

## Fase 3: Creator economy
- Programas de monetización por creador y panel de rendimiento.
- Herramientas de campañas patrocinadas por categoría.
- Roles de moderación y verificación avanzada.

## Fase 4: IA y personalización profunda
- Embeddings de contenido para recomendaciones semánticas.
- Clasificación de riesgo para moderación preventiva.
- Detección de contenido duplicado multimedia (texto + imagen + audio).

## Fase 5: Escalabilidad
- Cache distribuido para endpoints calientes.
- Workers asíncronos para pre-cómputo de rankings.
- Observabilidad completa (trazas, SLO, alertas de latencia por endpoint).
