# Auditoría de infraestructura (modo Firebase)

## Resultado corto
Sí: la plataforma está orientada a **Firebase** para autenticación y persistencia de datos.

## Alcance actual
- **Firebase Auth** para autenticación.
- **Firebase Realtime Database** para usuarios, notas, historias, comunidad, likes, follows, imágenes en base64 y tickets de soporte.
- **Vercel Functions** como capa API.

## Exclusiones actuales
- No se usan proveedores alternos de base de datos o storage en este despliegue.

## Nota operativa
Si en el futuro se requiere otro proveedor, deberá implementarse explícitamente y documentarse en este archivo.
