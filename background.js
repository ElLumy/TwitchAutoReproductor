// Service Worker para la extensión de Twitch
// Maneja timers persistentes y comunicación con content scripts

console.debug('Twitch Extension: Service Worker iniciado');

// Configuración de timers (se carga dinámicamente desde storage)
let TIMER_CONFIG = {
  volume: {
    min: 2 * 60 * 1000,   // 2 minutos (default)
    max: 30 * 60 * 1000,  // 30 minutos (default)
    key: 'volumeTimer'
  },
  quality: {
    min: 30 * 60 * 1000,  // 30 minutos (default)
    max: 3 * 60 * 60 * 1000, // 3 horas (default)
    key: 'qualityTimer'
  }
};

// Estados de timers activos
let activeTimers = {
  volume: null,
  quality: null
};

// Utilidades para generar números aleatorios
function getRandomInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomVolume() {
  return Math.floor(Math.random() * 100) + 1; // 1-100%
}

function getRandomQuality() {
  const qualities = ['160p', '360p', '480p'];
  return qualities[Math.floor(Math.random() * qualities.length)];
}

// Función para obtener timestamp actual
function getCurrentTime() {
  return Date.now();
}

// Función para guardar estado del timer
async function saveTimerState(type, endTime, interval) {
  const key = TIMER_CONFIG[type].key;
  await chrome.storage.local.set({
    [key]: {
      endTime: endTime,
      interval: interval,
      active: true
    }
  });
  console.debug(`Twitch Extension: Timer ${type} guardado - fin: ${new Date(endTime).toLocaleTimeString()}, intervalo: ${interval}ms`);
}

// Función para obtener estado del timer
async function getTimerState(type) {
  const key = TIMER_CONFIG[type].key;
  const result = await chrome.storage.local.get(key);
  return result[key] || null;
}

// Función para limpiar estado del timer
async function clearTimerState(type) {
  const key = TIMER_CONFIG[type].key;
  await chrome.storage.local.remove(key);
}

// Cargar configuración desde storage
async function loadTimerConfig() {
  try {
    const result = await chrome.storage.local.get([
      'volumeTimerMin', 'volumeTimerMax',
      'qualityTimerMin', 'qualityTimerMax'
    ]);
    
    if (result.volumeTimerMin) {
      TIMER_CONFIG.volume.min = result.volumeTimerMin * 60 * 1000;
    }
    if (result.volumeTimerMax) {
      TIMER_CONFIG.volume.max = result.volumeTimerMax * 60 * 1000;
    }
    if (result.qualityTimerMin) {
      TIMER_CONFIG.quality.min = result.qualityTimerMin * 60 * 1000;
    }
    if (result.qualityTimerMax) {
      TIMER_CONFIG.quality.max = result.qualityTimerMax * 60 * 60 * 1000;
    }
    
    console.debug('Twitch Extension: Configuración cargada:', TIMER_CONFIG);
  } catch (error) {
    console.debug('Twitch Extension: Error cargando configuración, usando defaults:', error);
  }
}

// Función para crear un nuevo timer
async function createTimer(type, customInterval = null) {
  console.debug(`Twitch Extension: Creando nuevo timer para ${type}`);
  
  // Cargar configuración actualizada
  await loadTimerConfig();
  
  const config = TIMER_CONFIG[type];
  const interval = customInterval || getRandomInterval(config.min, config.max);
  const endTime = getCurrentTime() + interval;
  
  // Cancelar timer anterior si existe
  if (activeTimers[type]) {
    clearTimeout(activeTimers[type]);
  }
  
  // Crear nuevo timer
  activeTimers[type] = setTimeout(async () => {
    console.debug(`Twitch Extension: Timer ${type} ejecutado`);
    
    // Enviar mensaje al content script
    try {
      const tabs = await chrome.tabs.query({
        url: 'https://www.twitch.tv/*',
        active: true
      });
      
      if (tabs.length > 0) {
        const message = {
          action: type === 'volume' ? 'changeVolume' : 'changeQuality',
          value: type === 'volume' ? getRandomVolume() : getRandomQuality(),
          timestamp: getCurrentTime()
        };
        
        await chrome.tabs.sendMessage(tabs[0].id, message);
        console.debug(`Twitch Extension: Mensaje enviado a tab ${tabs[0].id}:`, message);
      }
    } catch (error) {
      console.debug('Twitch Extension: Error enviando mensaje:', error);
    }
    
    // Limpiar estado y crear nuevo timer automáticamente (bucle continuo)
    await clearTimerState(type);
    console.debug(`Twitch Extension: Recreando timer ${type} automáticamente...`);
    createTimer(type);
    
  }, interval);
  
  // Guardar estado
  await saveTimerState(type, endTime, interval); // FIX: asegurar que el estado esté persistido antes de responder a getStatus
  
  console.debug(`Twitch Extension: Timer ${type} creado - ${interval}ms (${Math.round(interval/60000)} min)`);
}

// Función para restaurar timers desde el almacenamiento
async function restoreTimers() {
  console.debug('Twitch Extension: Restaurando timers...');
  
  for (const type of ['volume', 'quality']) {
    const state = await getTimerState(type);
    
    if (state && state.active) {
      const now = getCurrentTime();
      const remainingTime = state.endTime - now;
      
      if (remainingTime > 0) {
        console.debug(`Twitch Extension: Restaurando timer ${type} - ${Math.round(remainingTime/60000)} min restantes`);
        createTimer(type, remainingTime);
      } else {
        console.debug(`Twitch Extension: Timer ${type} expirado, creando nuevo`);
        await clearTimerState(type);
        createTimer(type);
      }
    } else {
      console.debug(`Twitch Extension: Creando nuevo timer ${type}`);
      createTimer(type);
    }
  }
}

// Función para inicializar timers cuando se detecta Twitch activo
async function initializeTimers() {
  console.debug('Twitch Extension: Inicializando timers...');
  await restoreTimers();
}

// FIX: inicializar timers si hay una pestaña activa de Twitch cuando se consulta el estado
async function ensureTimersIfOnTwitch() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (currentTab && currentTab.url && currentTab.url.includes('twitch.tv')) {
      await initializeTimers();
    }
  } catch (error) {
    console.debug('Twitch Extension: Error verificando pestaña activa de Twitch:', error);
  }
}

// Función para pausar timers (cuando no hay Twitch activo)
async function pauseTimers() {
  console.debug('Twitch Extension: Pausando timers...');
  
  for (const type of ['volume', 'quality']) {
    if (activeTimers[type]) {
      clearTimeout(activeTimers[type]);
      activeTimers[type] = null;
    }
  }
}

// Listener para mensajes del content script y popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.debug('Twitch Extension: Mensaje recibido:', message);

  (async () => {
    switch (message.action) {
      case 'twitchPlayerDetected':
        await initializeTimers();
        sendResponse({ status: 'timers_initialized' });
        break;

      case 'twitchPlayerLost':
        await pauseTimers();
        sendResponse({ status: 'timers_paused' });
        break;

      case 'actionCompleted':
        console.debug(`Twitch Extension: Acción ${message.type} completada:`, message.details);
        sendResponse({ status: 'acknowledged' });
        break;

      case 'getStatus': {
        let volumeState = await getTimerState('volume');
        let qualityState = await getTimerState('quality');

        // FIX: si no hay timers aún, intentar inicializarlos si hay una pestaña activa de Twitch
        if (!volumeState && !qualityState) {
          await ensureTimersIfOnTwitch();
          volumeState = await getTimerState('volume');
          qualityState = await getTimerState('quality');
        }

        const now = getCurrentTime();

        sendResponse({
          volume: volumeState ? {
            remainingTime: Math.max(0, volumeState.endTime - now),
            nextAction: new Date(volumeState.endTime).toLocaleTimeString()
          } : null,
          quality: qualityState ? {
            remainingTime: Math.max(0, qualityState.endTime - now),
            nextAction: new Date(qualityState.endTime).toLocaleTimeString()
          } : null
        });
        break;
      }

      case 'configUpdated':
        console.debug('Twitch Extension: Configuración actualizada, reiniciando timers...');
        await loadTimerConfig();
        await pauseTimers();
        setTimeout(async () => {
          await initializeTimers();
        }, 1000);
        sendResponse({ status: 'config_updated' });
        break;

      case 'resetTimers':
        console.debug('Twitch Extension: Reiniciando timers...');
        await pauseTimers();
        // Limpiar storage de timers
        await clearTimerState('volume');
        await clearTimerState('quality');
        // Reinicializar
        setTimeout(async () => {
          await initializeTimers();
        }, 500);
        sendResponse({ status: 'timers_reset' });
        break;

      default:
        sendResponse({ status: 'unknown_action' });
    }
  })().catch((error) => {
    console.debug('Twitch Extension: Error procesando mensaje:', error);
    try { sendResponse({ status: 'error', error: error.message }); } catch (_) {}
  });

  // FIX(MV3): devolver true de forma SINCRÓNICA para mantener el canal abierto
  return true;
});

// Listener para cuando se instala o actualiza la extensión
chrome.runtime.onInstalled.addListener(async (details) => {
  console.debug('Twitch Extension: Extensión instalada/actualizada:', details);
  // FIX: intentar iniciar timers si ya hay una pestaña de Twitch abierta al instalar/actualizar
  await ensureTimersIfOnTwitch();
});

// Listener para cuando se inicia el navegador
chrome.runtime.onStartup.addListener(async () => {
  console.debug('Twitch Extension: Navegador iniciado');
  // FIX: al iniciar el navegador, si hay una pestaña activa de Twitch, iniciar timers
  await ensureTimersIfOnTwitch();
});

// FIX: escuchar cambios de pestañas para iniciar/restaurar timers al entrar en Twitch
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('twitch.tv')) {
    initializeTimers();
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url && tab.url.includes('twitch.tv')) {
      initializeTimers();
    }
  } catch (error) {
    console.debug('Twitch Extension: Error en onActivated:', error);
  }
});

console.debug('Twitch Extension: Service Worker configurado correctamente');
