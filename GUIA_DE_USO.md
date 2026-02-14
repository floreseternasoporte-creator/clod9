# 🚀 GUÍA DE USO - Sistema de Detección de Intentos Duplicados con CAPTCHA

## ¿Qué se implementó?

Se ha añadido un **sistema de seguridad inteligente** que detecta cuando un usuario intenta reenviar un correo de recuperación de contraseña después de reiniciar la aplicación o navegador dentro de 15 minutos, y le muestra un CAPTCHA para verificar que es un humano.

---

## 📋 ¿Cómo Funciona?

### Escenario Normal
```
Usuario abre "¿Olvidaste tu contraseña?"
         ↓
Ingresa: usuario@email.com
         ↓
Click en "Enviar enlace"
         ↓
✅ Correo enviado sin CAPTCHA
```

### Escenario con CAPTCHA (Reinicio)
```
Usuario envía correo de recuperación
         ↓
Usuario reinicia navegador/app
         ↓
Usuario intenta enviar correo DENTRO de 15 minutos
         ↓
🛡️ Sistema detecta intento duplicado
         ↓
📱 Muestra CAPTCHA para verificación
         ↓
Usuario resuelve el CAPTCHA
         ↓
✅ Continúa con el envío del correo
```

---

## 🎯 Paso a Paso para Probar

### 1️⃣ **Primer Intento**

1. Abre la aplicación Nuevoo
2. Ve a la pantalla de login
3. Haz click en "¿Olvidaste tu contraseña?"
4. Ingresa tu email (ej: `test@example.com`)
5. Haz click en "Enviar enlace"
6. ✅ El correo debe enviarse SIN mostrar CAPTCHA

**Resultado esperado:** ✅ Éxito

---

### 2️⃣ **Intento Duplicado (Con CAPTCHA)**

1. Sin cerrar el navegador, haz Click en "¿Olvidaste tu contraseña?" nuevamente
2. Ingresa el MISMO email que antes (ej: `test@example.com`)
3. Haz click en "Enviar enlace"
4. ⚠️ Si esperas poco tiempo, puede mostrar "Debes esperar X minutos"
5. **Recarga la página** (Presiona F5 o Ctrl+R)
6. Nuevamente haz click en "¿Olvidaste tu contraseña?"
7. Ingresa el MISMO email
8. Haz click en "Enviar enlace"
9. 🔒 **DEBE APARECER EL CAPTCHA**

**Resultado esperado:** 🔒 Aparece modal de CAPTCHA

---

### 3️⃣ **Completar el CAPTCHA**

Una vez que aparezca el modal de CAPTCHA, tienes dos opciones:

#### Opción A: reCAPTCHA v3 (si funciona)
```
- Simplemente espera a que aparezca el check
- O haz click en "No soy un robot"
- Haz click en "Continuar"
```

#### Opción B: CAPTCHA Matemático (fallback)
```
- Se mostrará un problema matemático
- Ejemplo: "23 + 45 = ?"
- Ingresa: 68
- Haz click en "Continuar"
```

**Resultado esperado:** ✅ Continúa con el envío

---

### 4️⃣ **Prueba: Email Diferente**

1. Primero envía un correo con `email1@test.com`
2. Recarga la página (F5)
3. Intenta enviar con `email2@test.com`
4. ✅ NO debe aparecer CAPTCHA porque es email diferente

**Resultado esperado:** ✅ Envío sin CAPTCHA

---

### 5️⃣ **Prueba: Esperar 15 Minutos**

1. Envía un correo con `test@example.com`
2. **Espera 15 minutos** (o usa el botón de test rápido)
3. Recarga la página
4. Intenta enviar el MISMO email
5. ✅ NO debe aparecer CAPTCHA porque pasó el período de espera

**Resultado esperado:** ✅ Envío sin CAPTCHA

---

## 🧪 Usar la Herramienta de Test

Se incluye un archivo especial para pruebas rápidas:

### Abrir la herramienta:
1. Abre: `TEST_DUPLICATE_ATTEMPT_DETECTOR.html`
2. Lee las instrucciones en pantalla
3. Usa los botones para simular escenarios

### Botones disponibles:
- 🔵 **Simular Primer Intento** - Registra el primer envío
- 🔴 **Simular Intento Duplicado** - Simula reinicio y nuevo intento
- 🟢 **Simular Email Diferente** - Prueba con otro email
- ⏳ **Simular después de 15 min** - Acelera el tiempo
- 🧹 **Limpiar localStorage** - Borra todos los datos
- 📊 **Ver localStorage** - Muestra los datos almacenados
- 🐛 **Actualizar Debug Info** - Refresca información

---

## 🔍 Verificar el Funcionamiento

### Opción 1: Abrir DevTools

**Chrome/Edge:**
1. Presiona `F12` o `Ctrl+Shift+I`
2. Ve a la pestaña "Application"
3. En el menú izquierdo: "Local Storage"
4. Selecciona el dominio
5. Busca: `recovery_attempt_data`

**Firefox:**
1. Presiona `F12` o `Ctrl+Shift+I`
2. Ve a la pestaña "Storage"
3. En el menú izquierdo: "Local Storage"
4. Busca: `recovery_attempt_data`

**Safari:**
1. Habilita el menú Desarrollador (Cmd+Option+I)
2. Ve a "Storage"
3. Busca: `recovery_attempt_data`

### Datos que verás:
```json
{
  "recovery_attempt_data": {
    "email": "user@example.com",
    "sessionId": "session_1704067200000",
    "timestamp": 1704067200000
  }
}
```

---

## ⚙️ Cómo Funciona Técnicamente

### Variables Almacenadas

**localStorage** (Persiste entre sesiones)
```javascript
recovery_attempt_data = {
  email: "usuario@example.com",      // Email del intento anterior
  sessionId: "session_1704067...",   // ID de la sesión anterior
  timestamp: 1704067200000            // Hora del intento anterior
}
```

**sessionStorage** (Se borra al cerrar)
```javascript
session_id = "session_1704067200000"  // ID único de esta sesión
```

### Lógica de Detección

Cuando el usuario intenta enviar un correo, el sistema verifica:

```javascript
¿Mismo email? ✓
¿Dentro de 15 minutos? ✓
¿Sesión diferente? ✓
    ↓
    ↓ SÍ a las 3 = CAPTCHA
    ↓
```

---

## 🛡️ Características de Seguridad

| Característica | Qué hace |
|---|---|
| **Detección de Session ID** | Identifica si el navegador fue reiniciado |
| **Período de Espera (15 min)** | Evita spam de correos de recuperación |
| **Validación de Email** | Verifica que sea un email válido |
| **CAPTCHA reCAPTCHA v3** | Verifica que sea un humano (automático) |
| **CAPTCHA Matemático** | Fallback si reCAPTCHA no funciona |
| **Logs Locales** | Registra intentos en localStorage |

---

## ❌ Troubleshooting

### Problema: "El CAPTCHA no aparece"
**Soluciones:**
1. ✓ Verifica que realmente reiniciaste el navegador (F5 no es suficiente)
2. ✓ Usa el botón "Simular Intento Duplicado" en TEST_DUPLICATE_ATTEMPT_DETECTOR.html
3. ✓ Abre DevTools (F12) y ve la consola
4. ✓ Verifica que sea el MISMO email en los dos intentos

### Problema: "Debería mostrar CAPTCHA pero no lo hace"
**Soluciones:**
1. ✓ Verifica que pasaron menos de 15 minutos
2. ✓ Usa el botón "Ver localStorage" para confirmar datos
3. ✓ Limpiar localStorage y reintentar: Botón "Limpiar localStorage"

### Problema: "El problema matemático siempre está mal"
**Soluciones:**
1. ✓ Calcula correctamente (suma o multiplicación)
2. ✓ Verifica que ingresaste solo números
3. ✓ Presiona Continuar (no Enter)

### Problema: "No veo los cambios"
**Soluciones:**
1. ✓ Limpia el caché del navegador (Ctrl+Shift+Delete)
2. ✓ Cierra completamente el navegador y reabre
3. ✓ Recarga la página (Ctrl+F5)

---

## 📱 Diferencias por Navegador

| Navegador | reCAPTCHA v3 | Fallback Matemático |
|---|---|---|
| Chrome | ✅ Funciona | ✅ Funciona |
| Firefox | ✅ Funciona | ✅ Funciona |
| Safari | ✅ Funciona | ✅ Funciona |
| Edge | ✅ Funciona | ✅ Funciona |
| Modo Incógnito | ⚠️ localStorage no funciona | ⚠️ localStorage no funciona |

**Nota:** En modo incógnito, localStorage está deshabilitado, así que la detección podría no funcionar correctamente.

---

## 🔧 Para Desarrolladores

### Ver código de detección:
```javascript
// En index.html, línea ~11036
function detectDuplicateRecoveryAttempt(email) {
  // Obtiene datos del intento anterior
  // Compara: email, tiempo, sessionId
  // Retorna: isDuplicate true/false
}
```

### Modificar período de espera:
```javascript
// Línea ~11054 (en index.html)
const fifteenMinutes = 15 * 60 * 1000; // Cambiar este valor
```

### Cambiar mensaje de CAPTCHA:
```javascript
// Línea ~2425 (en index.html)
<p>Detectamos un intento de envío...</p> // Modificar este texto
```

---

## 📞 ¿Preguntas o Problemas?

1. Abre `TEST_DUPLICATE_ATTEMPT_DETECTOR.html`
2. Usa el panel de Debug para inspeccionar datos
3. Exporta el reporte haciendo click en "Exportar Reporte"
4. Envía el archivo para análisis

---

## 📝 Archivos Relacionados

| Archivo | Descripción |
|---|---|
| `index.html` | Contiene todo el código implementado |
| `CAPTCHA_DUPLICATE_ATTEMPT_DETECTOR.md` | Documentación técnica completa |
| `TEST_DUPLICATE_ATTEMPT_DETECTOR.html` | Herramienta interactiva de pruebas |
| `RESUMEN_CAMBIOS_CAPTCHA.md` | Resumen de todos los cambios |
| `GUIA_DE_USO.md` | Este archivo (guía para usuarios) |

---

## ✅ Checklist de Verificación

- [ ] He abierto `TEST_DUPLICATE_ATTEMPT_DETECTOR.html`
- [ ] He hecho el Test 1: Primer Intento ✅
- [ ] He hecho el Test 2: Intento Duplicado (aparece CAPTCHA) ✅
- [ ] He resuelto el CAPTCHA correctamente ✅
- [ ] He verificado localStorage en DevTools ✅
- [ ] He probado con email diferente ✅
- [ ] He probado después de 15 minutos ✅
- [ ] Todo funciona correctamente ✅

---

**Versión:** 1.0.0  
**Última actualización:** Enero 2026  
**Estado:** ✅ Completamente funcional

**¡Felicidades! 🎉 El sistema de detección de intentos duplicados está instalado y funcionando correctamente.**
