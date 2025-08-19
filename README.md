# 🎮 Twitch Volume & Quality Manager

Extensión de Chrome avanzada que gestiona automáticamente el volumen y la calidad de video en Twitch de forma realista y persistente, ahora con **interfaz de configuración y testing integrada**.

## Características

### 🔊 Control de Volumen Automático
- **Desmuteo automático**: Al cargar un stream, si el audio está muteado, se desmutea automáticamente
- **Cambios aleatorios de volumen**: Cada 2-30 minutos cambia el volumen a un valor entre 1% y 100%
- **Control nativo**: Usa el control de volumen real de Twitch, no la API de HTML5

### 🎥 Control de Calidad Automático
- **Cambios aleatorios de calidad**: Cada 30 minutos a 3 horas cambia la calidad
- **Calidades disponibles**: 160p, 360p, o 480p (elegida aleatoriamente)
- **Interacción realista**: Simula clics reales en el menú de calidad de Twitch

### 💾 Persistencia Completa
- **Timers persistentes**: Los temporizadores se mantienen aunque cierres el navegador
- **Cambio de streams**: Funciona aunque cambies de canal o recargues la página
- **Almacenamiento local**: Usa `chrome.storage.local` para mantener el estado

### 🔍 Detección Inteligente
- **MutationObserver**: Detecta cambios dinámicos en el DOM de Twitch
- **Múltiples modos**: Funciona en modo normal, theater y fullscreen
- **Selectores flexibles**: Resistente a cambios en la interfaz de Twitch

### 🎛️ **NUEVO: Popup de Control Avanzado**
- **Configuración de timers**: Ajusta rangos mínimos y máximos para volumen y calidad
- **Estado en tiempo real**: Visualiza el tiempo restante hasta los próximos cambios
- **Testing integrado**: Prueba todas las funciones con botones de test
- **Interfaz moderna**: Diseño atractivo con gradientes y animaciones

### 🧪 **NUEVO: Sistema de Testing**
- **Test completo**: Ejecuta todas las pruebas con delays de 3 segundos
- **Tests individuales**: Prueba desmuteo, volumen y calidad por separado
- **Debug avanzado**: Información detallada de estado en consola
- **Logs mejorados**: Sistema de logging completo con emojis para fácil identificación

## Instalación

### Método 1: Instalación Manual (Recomendado)

1. **Descargar la extensión**:
   - Descarga todos los archivos de la extensión en una carpeta local

2. **Abrir Chrome y habilitar modo desarrollador**:
   - Ve a `chrome://extensions/`
   - Activa el "Modo de desarrollador" en la esquina superior derecha

3. **Cargar extensión sin empaquetar**:
   - Haz clic en "Cargar extensión sin empaquetar"
   - Selecciona la carpeta que contiene los archivos de la extensión
   - La extensión aparecerá en la lista

4. **Verificar permisos**:
   - Asegúrate de que la extensión tenga permisos para `https://www.twitch.tv/*`

## Uso

### 🚀 Activación Automática
1. **Ve a Twitch**: Navega a cualquier stream en `https://www.twitch.tv/`
2. **Detección automática**: La extensión detectará automáticamente el reproductor
3. **Accede al popup**: Haz clic en el icono de la extensión en la barra de herramientas

### 🎛️ Usando el Popup de Control

#### **Configuración de Timers**
- **Volumen**: Configura entre 1-60 minutos (mín) y 5-180 minutos (máx)
- **Calidad**: Configura entre 10-120 minutos (mín) y 1-8 horas (máx)
- **Aplicar**: Haz clic en "Guardar Configuración" para aplicar cambios

#### **Testing y Debugging**
- **🚀 Test Completo**: Ejecuta todas las pruebas con delays de 3 segundos
- **🔊 Test Desmuteo**: Prueba solo la funcionalidad de desmuteo
- **🎚️ Test Volumen**: Cambia el volumen a un valor aleatorio
- **🎥 Test Calidad**: Cambia la calidad a 160p, 360p o 480p
- **🔍 Debug Info**: Muestra información de estado en consola

#### **Acciones Rápidas**
- **Forzar Desmuteo**: Desmutea inmediatamente el audio
- **Reiniciar Timers**: Reinicia todos los temporizadores

### 📊 Monitoreo de Estado
El popup muestra:
- Estado actual de la página (si estás en Twitch)
- Tiempo restante hasta el próximo cambio de volumen
- Tiempo restante hasta el próximo cambio de calidad
- Configuración activa de timers

### Verificación de Funcionamiento

**En la Consola del Navegador (F12 > Console):**
```javascript
// Verás mensajes como:
Twitch Extension: Content Script iniciado
Twitch Extension: Reproductor detectado
Twitch Extension: Timer volume creado - 180000ms (3 min)
Twitch Extension: Timer quality creado - 2700000ms (45 min)
```

**Durante el Funcionamiento:**
```javascript
// Cuando se ejecutan las acciones:
Twitch Extension: Cambiando volumen a 75%
Twitch Extension: Volumen cambiado a 75% exitosamente
Twitch Extension: Cambiando calidad a 360p
Twitch Extension: Calidad cambiada a 360p exitosamente
```

### 🧪 **NUEVO: Testing desde Consola**

Además del popup, puedes ejecutar tests directamente desde la consola:

```javascript
// Test completo con delays
await window.twitchExtensionTest.runFullTest();

// Tests individuales
await window.twitchExtensionTest.testUnmute();
await window.twitchExtensionTest.testVolume(50); // Volumen específico
await window.twitchExtensionTest.testQuality('360p'); // Calidad específica

// Debug información
window.twitchExtensionTest.debugInfo();
```

## Configuración Técnica

### Timers Configurados
```javascript
// Volumen: Entre 2 y 30 minutos
const VOLUME_MIN = 2 * 60 * 1000;   // 2 minutos
const VOLUME_MAX = 30 * 60 * 1000;  // 30 minutos

// Calidad: Entre 30 minutos y 3 horas  
const QUALITY_MIN = 30 * 60 * 1000;     // 30 minutos
const QUALITY_MAX = 3 * 60 * 60 * 1000; // 3 horas
```

### Calidades Disponibles
- **160p**: Calidad muy baja
- **360p**: Calidad baja  
- **480p**: Calidad media-baja

### Volumen Aleatorio
- **Rango**: 1% a 100%
- **Método**: Control deslizante nativo de Twitch

## Resolución de Problemas

### La extensión no se activa
1. **Verificar URL**: Asegúrate de estar en `https://www.twitch.tv/`
2. **Verificar reproductor**: Debe haber un stream reproduciéndose
3. **Revisar consola**: Busca mensajes de error en la consola (F12)
4. **Recargar página**: A veces ayuda recargar la página de Twitch

### Los timers no funcionan
1. **Verificar permisos**: La extensión debe tener permisos de storage
2. **Revisar storage**: Ve a Developer Tools > Application > Storage > Extensions
3. **Logs de service worker**: Ve a `chrome://extensions/` > detalles de la extensión > "service worker"

### Cambios no se aplican
1. **Verificar selectores**: Los selectores pueden haber cambiado en Twitch
2. **Interferencia de otras extensiones**: Desactiva temporalmente otras extensiones
3. **Modo privado**: Prueba en una ventana de incógnito

## Arquitectura Técnica

### Archivos de la Extensión
- **`manifest.json`**: Configuración Manifest V3
- **`background.js`**: Service Worker para timers y persistencia
- **`content.js`**: Script de contenido para interactuar con Twitch
- **`injected.js`**: Script inyectado (reservado para uso futuro)

### Comunicación
```
Service Worker ←→ Content Script ←→ Página de Twitch
     ↓                    ↓
chrome.storage.local  DOM Manipulation
```

### Selectores Utilizados
La extensión usa selectores CSS flexibles que se adaptan a cambios en Twitch:
- Contenedor del reproductor: `[data-a-target="video-player"]`
- Botón de volumen: `[data-a-target="player-volume-button"]`
- Menú de configuración: `[data-a-target="player-settings-button"]`
- Y muchos más como fallbacks

## Seguridad y Privacidad

- **Permisos mínimos**: Solo acceso a `twitch.tv` y storage local
- **Sin telemetría**: No envía datos a servidores externos
- **Local únicamente**: Toda la funcionalidad es local en tu navegador
- **Código abierto**: Puedes revisar todo el código fuente

## Desarrollo y Contribución

### Estructura del Código
```
├── manifest.json     # Configuración de la extensión
├── background.js     # Service Worker (timers, persistencia)
├── content.js        # Content Script (interacción con Twitch)
├── injected.js       # Script inyectado (futuro uso)
└── README.md         # Documentación
```

### Debugging
Para hacer debugging de la extensión:

1. **Console logs**: Todos los logs usan `console.debug()`
2. **Service Worker**: `chrome://extensions/` > detalles > "service worker"
3. **Content Script**: F12 en la página de Twitch
4. **Storage**: Developer Tools > Application > Storage > Extensions

## Licencia

Este código es de uso libre. Puedes modificarlo y distribuirlo según tus necesidades.

## Soporte

Si encuentras problemas:
1. Revisa la sección "Resolución de Problemas"
2. Verifica los logs en la consola
3. Intenta recargar la extensión en `chrome://extensions/`

---

**Nota**: Esta extensión simula comportamiento humano normal en Twitch. Úsala responsablemente y respeta los términos de servicio de Twitch.
