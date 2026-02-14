# Sistema de Detector de Intentos Duplicados de Recuperación con CAPTCHA

## Descripción General

Se ha implementado un sistema de seguridad avanzado para detectar intentos duplicados de envío de correos de recuperación de contraseña. Si un usuario reinicia la aplicación o el navegador después de haber enviado un correo de recuperación e intenta enviar otro, el sistema le mostrará un CAPTCHA para verificar que es un humano.

## Características Principales

### 1. **Detector de Reinicio del Navegador/Aplicación**
- Utiliza `sessionStorage` para crear un ID de sesión único por cada carga de página
- Detecta cuando hay un cambio de sesión (reinicio del navegador o app)
- Mantiene registro de intentos en `localStorage`

### 2. **Almacenamiento de Intentos**
- Guarda información del último intento en `localStorage` bajo la clave `recovery_attempt_data`
- Información almacenada:
  - `email`: El correo utilizado
  - `sessionId`: ID único de la sesión
  - `timestamp`: Marca de tiempo del intento

### 3. **Lógica de Detección**
El sistema detecta un intento duplicado sospechoso cuando se cumplen TODAS estas condiciones:
```
1. El correo electrónico es el MISMO
2. El tiempo desde el último intento es MENOR a 15 minutos
3. La sesión es DIFERENTE (indicando un reinicio)
```

### 4. **Verificación con CAPTCHA**
Cuando se detecta un intento duplicado, el usuario debe completar un CAPTCHA antes de continuar:

#### Opción 1: reCAPTCHA v3 (Predeterminado)
- Integración con Google reCAPTCHA v3
- Verificación transparente en segundo plano
- No requiere interacción del usuario

#### Opción 2: CAPTCHA Matemático Simple (Fallback)
- Si reCAPTCHA no está disponible
- Problema matemático simple (suma o multiplicación)
- El usuario debe ingresar la respuesta correcta
- Genera nuevos problemas cada vez

## Flujo de Ejecución

```
1. Usuario intenta enviar correo de recuperación
   ↓
2. Sistema valida el email
   ↓
3. Sistema llama a detectDuplicateRecoveryAttempt(email)
   ↓
4. ¿Intento duplicado detectado?
   ├─ SÍ → Mostrar CAPTCHA
   │       ├─ Usuario completa CAPTCHA
   │       ├─ ¿Respuesta correcta?
   │       │   ├─ SÍ → Continuar con envío
   │       │   └─ NO → Mostrar error y pedir reintentar
   │       └─ Enviar correo
   │
   └─ NO → Validar tiempo de espera de 15 minutos
           ├─ ¿Dentro del período de espera?
           │   └─ SÍ → Mostrar tiempo restante
           └─ NO → Enviar correo
```

## Funciones Principales

### `initializeSessionId()`
Crea o recupera el ID de sesión único
```javascript
const sessionId = initializeSessionId();
```

### `detectDuplicateRecoveryAttempt(email)`
Detecta intentos duplicados
```javascript
const result = detectDuplicateRecoveryAttempt('user@example.com');
if (result.isDuplicate) {
  // Mostrar CAPTCHA
}
```

### `storeRecoveryAttempt(email, sessionId)`
Almacena la información del intento
```javascript
storeRecoveryAttempt('user@example.com', sessionId);
```

### `showCaptchaModal()`
Muestra el modal con CAPTCHA
```javascript
showCaptchaModal();
```

### `verifyCaptchaAndContinue()`
Verifica la respuesta del CAPTCHA
```javascript
verifyCaptchaAndContinue();
```

### `continuePasswordReset(email)`
Realiza el envío del correo de recuperación
```javascript
continuePasswordReset(email);
```

## Configuración de reCAPTCHA

### Para usar reCAPTCHA en producción:

1. **Registrarse en Google reCAPTCHA Admin Console**
   - Ir a: https://www.google.com/recaptcha/admin

2. **Obtener las claves de sitio y secreto**
   - Site Key (clave pública)
   - Secret Key (clave secreta)

3. **Actualizar en el HTML**
   ```html
   <!-- En el modal -->
   <div class="g-recaptcha" data-sitekey="TU_SITE_KEY_AQUI"></div>
   ```

4. **Configurar en Firebase Cloud Functions (si es necesario)**
   - Usar la Secret Key para verificar en backend

### Claves de prueba (Desarrollo)
```
Site Key: 6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
Secret Key: 6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
```

## Flujo de Usuario

### Escenario: Usuario intenta reinviar correo después de reinicio

1. **Primer envío** (ej. 10:00 AM)
   - Usuario envía correo de recuperación
   - Sistema registra: email = "user@example.com", sessionId = "session_1704067200"

2. **Navegador se reinicia** (ej. 10:05 AM)
   - Nueva sesión creada: sessionId = "session_1704067500"

3. **Usuario intenta enviar de nuevo** con el mismo email
   - Sistema detecta:
     - ✓ Mismo email
     - ✓ Solo pasaron 5 minutos (< 15 min)
     - ✓ Sesión diferente
   - **Resultado: Mostrar CAPTCHA**

4. **Usuario completa CAPTCHA**
   - Si es matemático: Resuelve 23 + 45 = 68
   - Si es reCAPTCHA: Click en "No soy un robot"

5. **CAPTCHA verificado**
   - Sistema continúa con el envío del correo
   - Registra nuevo intento con nueva sesión

## Ejemplos de Código

### Llamar manualmente al detector:
```javascript
const check = detectDuplicateRecoveryAttempt('usuario@email.com');

console.log(check);
// {
//   isDuplicate: true,
//   email: 'usuario@email.com',
//   timeSinceLastAttempt: 300000,  // 5 minutos en ms
//   isDifferentSession: true,
//   previousAttemptTime: 1704067200000
// }
```

### Escenarios donde NO se muestra CAPTCHA:
```javascript
// 1. Primer intento (no hay datos previos)
// 2. Diferente email
// 3. Mismo dispositivo sin reinicio (misma sesión)
// 4. Pasaron más de 15 minutos
```

## Seguridad

### Protecciones Implementadas:
✅ Previene ataques de fuerza bruta en recuperación de contraseña
✅ Detecta reinicio de navegador/aplicación
✅ Verifica que sea un humano con CAPTCHA
✅ Mantiene período de espera de 15 minutos
✅ Valida email antes de procesar

### Datos Almacenados:
- **localStorage**: Datos del último intento (sincrónico con dispositivo)
- **sessionStorage**: ID de sesión (se borra al cerrar navegador)
- **Firebase**: Historial completo (en backend)

## Troubleshooting

### "reCAPTCHA no se carga"
- Verificar que la Site Key sea correcta
- Verificar conexión a internet
- Fallback automático a CAPTCHA matemático

### "CAPTCHA no aparece"
- Verificar que el modal tenga `display: flex`
- Revisar console para errores JavaScript
- Asegurar que el DOM esté completamente cargado

### "localStorage no funciona"
- Verificar que no esté en modo incógnito
- Verificar permisos de almacenamiento
- En navegadores con privacidad estricta, usar sessionStorage alternativo

## Testing

### Test 1: Primer intento
```
1. Abrir formulario de recuperación
2. Ingresar email
3. Hacer click en "Enviar enlace"
✓ Debe enviar sin CAPTCHA
```

### Test 2: Reinicio después de intento
```
1. Enviar correo de recuperación
2. Recargar página (F5)
3. Intentar enviar el mismo email
✓ Debe mostrar CAPTCHA
```

### Test 3: Email diferente
```
1. Enviar correo de recuperación con email1@test.com
2. Recargar página
3. Enviar con email2@test.com
✓ Debe enviar sin CAPTCHA
```

### Test 4: Esperar 15 minutos
```
1. Enviar correo de recuperación
2. Recargar página
3. Esperar 15 minutos
4. Intentar enviar el mismo email
✓ Debe enviar sin CAPTCHA
```

## Mejoras Futuras

- [ ] Integrar análisis de comportamiento de usuario
- [ ] Usar Google Safe Browsing API
- [ ] Implementar fingerprinting del dispositivo
- [ ] Agregar verificación por SMS
- [ ] Crear dashboard de intentos fallidos
- [ ] Notificar al usuario sobre intentos sospechosos

## Archivos Modificados

- **index.html**
  - Agregado: reCAPTCHA script
  - Agregado: Modal de CAPTCHA
  - Modificado: Sistema de recuperación de contraseña
  - Agregado: Funciones de detección y verificación
  - Agregado: Estilos CSS para CAPTCHA

## Referencias

- [Google reCAPTCHA Docs](https://developers.google.com/recaptcha/docs/v3)
- [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [MDN sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
- [Firebase Auth Docs](https://firebase.google.com/docs/auth)

---

**Última actualización:** Enero 2026  
**Versión:** 1.0.0
