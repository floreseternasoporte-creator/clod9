# BeaBoo Platform - Despliegue en Vercel

## Problemas Solucionados

1. ✅ Base de datos PostgreSQL ahora se conecta y usa correctamente
2. ✅ APIs funcionan con Vercel Serverless Functions
3. ✅ Imágenes se almacenan en AWS S3 con URLs firmadas

## Configuración en Vercel

### 1. Crear Base de Datos PostgreSQL

Opción A - **Vercel Postgres** (Recomendado):
```bash
# En tu proyecto de Vercel, ve a Storage > Create Database > Postgres
# Copia el DATABASE_URL que te proporciona
```

Opción B - **AWS RDS PostgreSQL**:
- Crea una instancia RDS PostgreSQL en AWS
- Usa el connection string en DATABASE_URL

### 2. Ejecutar Schema SQL

Conecta a tu base de datos y ejecuta:
```bash
psql $DATABASE_URL -f schema.sql
```

### 3. Variables de Entorno en Vercel

Ve a tu proyecto en Vercel > Settings > Environment Variables y agrega:

```
DATABASE_URL=postgresql://usuario:password@host:5432/database
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=tu_access_key_id
AWS_SECRET_ACCESS_KEY=tu_secret_access_key
AWS_S3_BUCKET=mi-bucket
# Compatibles también: MY_AWS_REGION, MY_AWS_ACCESS_KEY_ID, MY_AWS_SECRET_ACCESS_KEY, MY_AWS_S3_BUCKET_NAME
NODE_ENV=production
```

### 4. Desplegar

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel
```

## Arquitectura

- **Frontend**: HTML/CSS/JS estáticos servidos por Vercel
- **Backend**: Vercel Serverless Function unificada en `api/index.js` (catch-all)
- **Base de Datos**: PostgreSQL (metadata de usuarios, notas, historias)
- **Almacenamiento**: AWS S3 (imágenes y archivos)

## Endpoints API

- `GET /api/get-notes` - Obtener notas
- `POST /api/upload-note` - Crear nota
- `GET /api/get-stories` - Obtener historias
- `POST /api/upload-story` - Crear historia
- `POST /api/like-note` - Dar like a nota


## Diagnóstico rápido en producción

- `GET /api/health` → confirma si las variables de entorno críticas están presentes.
- `GET /api/health-s3` → prueba conectividad real con tu bucket S3 (sin exponer secretos).

Si `health-s3` falla, revisa IAM, bucket policy y región del bucket.
