# 📦 Instrucciones de Instalación - Extensión Twitch Volume & Quality Manager

## 🔧 Instalación Paso a Paso

### Paso 1: Preparar los Archivos
1. Asegúrate de tener todos estos archivos en una carpeta:
   - `manifest.json`
   - `background.js`
   - `content.js`
   - `injected.js`
   - `README.md`

### Paso 2: Abrir Chrome Extensions
1. Abre Google Chrome
2. Ve a la barra de direcciones y escribe: `chrome://extensions/`
3. Presiona Enter

### Paso 3: Habilitar Modo Desarrollador
1. En la página de extensiones, busca el interruptor **"Modo de desarrollador"** en la esquina superior derecha
2. Haz clic para **activarlo** (debe ponerse azul/verde)

### Paso 4: Cargar la Extensión
1. Haz clic en el botón **"Cargar extensión sin empaquetar"**
2. Navega hasta la carpeta que contiene los archivos de la extensión
3. Selecciona la carpeta y haz clic en **"Seleccionar carpeta"**

### Paso 5: Verificar Instalación
1. La extensión debe aparecer en la lista con el nombre **"Twitch Volume & Quality Manager"**
2. Verifica que el estado sea **"Activado"** (interruptor azul/verde)
3. Debe mostrar **"Manifest V3"** en la descripción

## 🚀 Primera Prueba

### Paso 1: Ir a Twitch
1. Ve a [https://www.twitch.tv/](https://www.twitch.tv/)
2. Entra a cualquier stream que esté en vivo
3. Asegúrate de que el video se esté reproduciendo

### Paso 2: Abrir la Consola de Desarrollador
1. Presiona **F12** o clic derecho → **"Inspeccionar elemento"**
2. Ve a la pestaña **"Console"**
3. Deberías ver mensajes como:
   ```
   Twitch Extension: Content Script iniciado
   Twitch Extension: Reproductor detectado
   Twitch Extension: Timer volume creado - 180000ms (3 min)
   ```

### Paso 3: Verificar Service Worker
1. Ve a `chrome://extensions/`
2. Busca tu extensión y haz clic en **"service worker"**
3. Se abrirá otra consola donde verás:
   ```
   Twitch Extension: Service Worker iniciado
   Twitch Extension: Timer quality creado - 2700000ms (45 min)
   ```

## 🔍 Solución de Problemas Comunes

### ❌ "La extensión no aparece en la lista"
**Solución:**
- Verifica que estés en la carpeta correcta
- Asegúrate de que `manifest.json` esté en la carpeta raíz
- Verifica que no hay errores de sintaxis en `manifest.json`

### ❌ "Extension manifest must request..."
**Solución:**
- El archivo `manifest.json` tiene un error de sintaxis
- Verifica las comas y llaves del JSON
- Copia nuevamente el contenido del archivo

### ❌ "No se ven logs en la consola"
**Solución:**
1. Verifica que estés en una página de Twitch con stream activo
2. Recarga la página de Twitch (F5)
3. En la consola, cambia el filtro de "Default" a "All levels"
4. Busca por "Twitch Extension" en el filtro de la consola

### ❌ "Service worker no se activa"
**Solución:**
1. Ve a `chrome://extensions/`
2. Haz clic en **"Recargar"** en tu extensión
3. Ve a un stream de Twitch
4. El service worker debería activarse automáticamente

## ⚡ Comandos Útiles para Debugging

### En la Consola de la Página de Twitch (F12):
```javascript
// Ver estado de la extensión
console.log('Verificando reproductor:', document.querySelector('[data-a-target="video-player"]'));

// Ver controles de volumen
console.log('Control volumen:', document.querySelector('[data-a-target="player-volume-button"]'));

// Ver menú de configuración
console.log('Menú configuración:', document.querySelector('[data-a-target="player-settings-button"]'));
```

### En la Consola del Service Worker:
```javascript
// Ver storage de la extensión
chrome.storage.local.get(null, (data) => console.log('Storage:', data));

// Ver estado de timers
chrome.storage.local.get(['volumeTimer', 'qualityTimer'], (data) => {
    console.log('Timer volumen:', data.volumeTimer);
    console.log('Timer calidad:', data.qualityTimer);
});
```

## 🎯 Confirmación de Funcionamiento Correcto

### ✅ Checkpoints de Funcionamiento:

1. **Extensión instalada**: Aparece en `chrome://extensions/`
2. **Service worker activo**: Se puede hacer clic en "service worker"
3. **Content script cargado**: Logs visibles en consola de Twitch
4. **Reproductor detectado**: Mensaje "Reproductor detectado" en consola
5. **Timers creados**: Logs de creación de timers en service worker
6. **Storage funcionando**: `chrome.storage.local` tiene datos de timers

### 🎉 ¡Todo listo!
Si ves todos estos elementos, la extensión está funcionando correctamente y comenzará a:
- **Desmutear automáticamente** streams que estén muteados
- **Cambiar volumen** aleatoriamente cada 2-30 minutos
- **Cambiar calidad** aleatoriamente cada 30 minutos - 3 horas
- **Mantener persistencia** aunque cambies de stream o cierres el navegador

## 📞 Soporte Adicional

Si tienes problemas específicos:
1. Revisa que Chrome esté actualizado
2. Verifica que no tengas otras extensiones que interfieran con Twitch
3. Prueba en una ventana de incógnito
4. Reinstala la extensión desde cero

---

**¡Disfruta de tu experiencia automatizada en Twitch! 🎮**
