// Popup Script para la extensión de Twitch
// Maneja la interfaz de usuario y comunicación con service worker y content script

console.debug('Twitch Extension: Popup script cargado');

class TwitchExtensionPopup {
  constructor() {
    this.currentConfig = {
      volumeTimerMin: 2,
      volumeTimerMax: 30,
      qualityTimerMin: 30,
      qualityTimerMax: 3
    };
    
    // Timer visual para actualizar cuenta regresiva
    this.updateInterval = null;
    
    this.init();
  }
  
  async init() {
    console.debug('Twitch Extension Popup: Inicializando...');
    
    // Cargar configuración guardada
    await this.loadConfig();
    
    // Configurar event listeners
    this.setupEventListeners();
    
    // Configurar updates de sliders
    this.setupSliderUpdates();
    
    // Cargar estado inicial
    await this.refreshStatus();
    
    // Iniciar actualización automática del timer visual
    this.startTimerDisplay();
    
    console.debug('Twitch Extension Popup: Inicializado correctamente');
  }
  
  // Cargar configuración desde storage
  async loadConfig() {
    try {
      const result = await chrome.storage.local.get([
        'volumeTimerMin', 'volumeTimerMax', 
        'qualityTimerMin', 'qualityTimerMax'
      ]);
      
      if (result.volumeTimerMin) this.currentConfig.volumeTimerMin = result.volumeTimerMin;
      if (result.volumeTimerMax) this.currentConfig.volumeTimerMax = result.volumeTimerMax;
      if (result.qualityTimerMin) this.currentConfig.qualityTimerMin = result.qualityTimerMin;
      if (result.qualityTimerMax) this.currentConfig.qualityTimerMax = result.qualityTimerMax;
      
      // Aplicar valores a los sliders
      document.getElementById('volumeTimerMin').value = this.currentConfig.volumeTimerMin;
      document.getElementById('volumeTimerMax').value = this.currentConfig.volumeTimerMax;
      document.getElementById('qualityTimerMin').value = this.currentConfig.qualityTimerMin;
      document.getElementById('qualityTimerMax').value = this.currentConfig.qualityTimerMax;
      
      this.updateSliderDisplays();
      
    } catch (error) {
      console.debug('Twitch Extension Popup: Error cargando configuración:', error);
    }
  }
  
  // Configurar event listeners
  setupEventListeners() {
    // Configuración
    document.getElementById('saveConfig').addEventListener('click', () => this.saveConfig());
    
    // Estado
    document.getElementById('refreshStatus').addEventListener('click', () => this.refreshStatus());
    
    // Tests
    document.getElementById('runFullTest').addEventListener('click', () => this.runFullTest());
    document.getElementById('testUnmute').addEventListener('click', () => this.testUnmute());
    document.getElementById('testVolume').addEventListener('click', () => this.testVolume());
    document.getElementById('testQuality').addEventListener('click', () => this.testQuality());
    document.getElementById('debugInfo').addEventListener('click', () => this.showDebugInfo());
    
    // Acciones rápidas
    document.getElementById('forceUnmute').addEventListener('click', () => this.forceUnmute());
    document.getElementById('resetTimers').addEventListener('click', () => this.resetTimers());
  }
  
  // Configurar updates de sliders
  setupSliderUpdates() {
    const sliders = [
      'volumeTimerMin', 'volumeTimerMax', 
      'qualityTimerMin', 'qualityTimerMax'
    ];
    
    sliders.forEach(sliderId => {
      document.getElementById(sliderId).addEventListener('input', () => {
        this.updateSliderDisplays();
      });
    });
  }
  
  // Actualizar displays de sliders
  updateSliderDisplays() {
    const volumeMin = document.getElementById('volumeTimerMin').value;
    const volumeMax = document.getElementById('volumeTimerMax').value;
    const qualityMin = document.getElementById('qualityTimerMin').value;
    const qualityMax = document.getElementById('qualityTimerMax').value;
    
    document.getElementById('volumeTimerMinDisplay').textContent = `${volumeMin} minuto${volumeMin > 1 ? 's' : ''}`;
    document.getElementById('volumeTimerMaxDisplay').textContent = `${volumeMax} minuto${volumeMax > 1 ? 's' : ''}`;
    document.getElementById('qualityTimerMinDisplay').textContent = `${qualityMin} minuto${qualityMin > 1 ? 's' : ''}`;
    document.getElementById('qualityTimerMaxDisplay').textContent = `${qualityMax} hora${qualityMax > 1 ? 's' : ''}`;
  }
  
  // Mostrar status message
  showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
    
    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
  }
  
  // Mostrar/ocultar loading en botón
  toggleButtonLoading(buttonId, loading = true) {
    const button = document.getElementById(buttonId);
    if (loading) {
      button.classList.add('loading');
      button.disabled = true;
    } else {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }
  
  // Guardar configuración
  async saveConfig() {
    this.toggleButtonLoading('saveConfig', true);
    
    try {
      const config = {
        volumeTimerMin: parseInt(document.getElementById('volumeTimerMin').value),
        volumeTimerMax: parseInt(document.getElementById('volumeTimerMax').value),
        qualityTimerMin: parseInt(document.getElementById('qualityTimerMin').value),
        qualityTimerMax: parseInt(document.getElementById('qualityTimerMax').value)
      };
      
      // Validaciones
      if (config.volumeTimerMin >= config.volumeTimerMax) {
        this.showStatus('Error: El timer mínimo de volumen debe ser menor que el máximo', 'error');
        return;
      }
      
      if (config.qualityTimerMin >= config.qualityTimerMax * 60) {
        this.showStatus('Error: El timer mínimo de calidad debe ser menor que el máximo', 'error');
        return;
      }
      
      await chrome.storage.local.set(config);
      this.currentConfig = config;
      
      this.showStatus('✅ Configuración guardada exitosamente', 'info');
      
      // Notificar al service worker para reiniciar timers
      try {
        await chrome.runtime.sendMessage({
          action: 'configUpdated',
          config: config
        });
      } catch (error) {
        console.debug('Error notificando configuración al service worker:', error);
      }
      
    } catch (error) {
      console.debug('Error guardando configuración:', error);
      this.showStatus('❌ Error guardando configuración', 'error');
    } finally {
      this.toggleButtonLoading('saveConfig', false);
    }
  }
  
  // Iniciar timer visual con actualización automática
  startTimerDisplay() {
    // Limpiar intervalo anterior si existe
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Actualizar cada segundo
    this.updateInterval = setInterval(() => {
      this.updateTimerDisplay();
    }, 1000);
    
    // Primera actualización inmediata
    this.updateTimerDisplay();
  }
  
  // Actualizar display de timers en tiempo real
  async updateTimerDisplay() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
      
      // Elementos del timer visual
      const volumeTimerEl = document.getElementById('volumeTimer');
      const qualityTimerEl = document.getElementById('qualityTimer');
      const timerStatusEl = document.getElementById('timerStatus');
      
      if (response && (response.volume || response.quality)) {
        let statusMessage = '';
        
        // Actualizar timer de volumen
        if (response.volume && response.volume.remainingTime > 0) {
          const remainingSeconds = Math.floor(response.volume.remainingTime / 1000);
          const minutes = Math.floor(remainingSeconds / 60);
          const seconds = remainingSeconds % 60;
          const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          
          volumeTimerEl.textContent = timeDisplay;
          volumeTimerEl.style.color = '#4CAF50';
          statusMessage += 'Volumen activo. ';
        } else {
          volumeTimerEl.textContent = '--:--';
          volumeTimerEl.style.color = '#ff9800';
          statusMessage += 'Volumen: creando timer... ';
        }
        
        // Actualizar timer de calidad
        if (response.quality && response.quality.remainingTime > 0) {
          const remainingSeconds = Math.floor(response.quality.remainingTime / 1000);
          const minutes = Math.floor(remainingSeconds / 60);
          const seconds = remainingSeconds % 60;
          const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          
          qualityTimerEl.textContent = timeDisplay;
          qualityTimerEl.style.color = '#2196F3';
          statusMessage += 'Calidad activa.';
        } else {
          qualityTimerEl.textContent = '--:--';
          qualityTimerEl.style.color = '#ff9800';
          statusMessage += 'Calidad: creando timer...';
        }
        
        timerStatusEl.textContent = statusMessage.trim();
        
        // Actualizar estado general
        document.getElementById('currentStatus').innerHTML = `
          <p style="color: #4CAF50;">✅ Extensión activa en Twitch</p>
          <p style="font-size: 11px; opacity: 0.8;">Los timers se ejecutan automáticamente</p>
        `;
        
      } else {
        // No hay respuesta o timers inactivos
        volumeTimerEl.textContent = '--:--';
        qualityTimerEl.textContent = '--:--';
        volumeTimerEl.style.color = '#666';
        qualityTimerEl.style.color = '#666';
        
        // Verificar si estamos en Twitch
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];
        
        if (!currentTab || !currentTab.url.includes('twitch.tv')) {
          timerStatusEl.textContent = 'No estás en Twitch - Ve a twitch.tv';
          document.getElementById('currentStatus').innerHTML = `
            <p style="color: #ff9800;">⚠️ No estás en Twitch</p>
            <p style="font-size: 11px; opacity: 0.8;">Ve a twitch.tv para usar la extensión</p>
          `;
        } else {
          timerStatusEl.textContent = 'Esperando inicialización de timers...';
          document.getElementById('currentStatus').innerHTML = `
            <p style="color: #ff9800;">⚠️ Timers no activos</p>
            <p style="font-size: 11px; opacity: 0.8;">Recarga la página de Twitch o espera unos segundos</p>
          `;
        }
      }
      
    } catch (error) {
      console.debug('Error actualizando timer display:', error);
      
      // Mostrar error en los timers
      const volumeTimerEl = document.getElementById('volumeTimer');
      const qualityTimerEl = document.getElementById('qualityTimer');
      const timerStatusEl = document.getElementById('timerStatus');
      
      if (volumeTimerEl) volumeTimerEl.textContent = 'ERROR';
      if (qualityTimerEl) qualityTimerEl.textContent = 'ERROR';
      if (timerStatusEl) timerStatusEl.textContent = 'Error de conexión con service worker';
    }
  }
  
  // Refrescar estado (ahora simplificado ya que el timer se actualiza automáticamente)
  async refreshStatus() {
    this.toggleButtonLoading('refreshStatus', true);
    
    try {
      await this.updateTimerDisplay();
    } catch (error) {
      console.debug('Error obteniendo estado:', error);
      // FIX: evitar inyectar error.message directamente como HTML
      const container = document.getElementById('currentStatus');
      container.innerHTML = `
        <p style="color: #f44336;">❌ Error obteniendo estado</p>
        <p id="currentStatusErrorMsg" style="font-size: 11px; opacity: 0.8;"></p>
      `;
      const msgEl = document.getElementById('currentStatusErrorMsg');
      if (msgEl) msgEl.textContent = String(error && error.message ? error.message : 'Error desconocido');
    } finally {
      this.toggleButtonLoading('refreshStatus', false);
    }
  }
  
  // Ejecutar test completo
  async runFullTest() {
    this.toggleButtonLoading('runFullTest', true);
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tabs[0].url.includes('twitch.tv')) {
        this.showStatus('❌ Debes estar en Twitch para ejecutar tests', 'error');
        return;
      }
      
      this.showStatus('🧪 Ejecutando test completo... (revisa la consola)', 'info');
      
      // Ejecutar test en el content script
      const result = await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'runTest',
        testType: 'full'
      });
      
      if (result && result.success) {
        this.showStatus('✅ Test completo ejecutado exitosamente', 'info');
      } else {
        this.showStatus('⚠️ Test completado con errores (revisa consola)', 'warning');
      }
      
    } catch (error) {
      console.debug('Error ejecutando test:', error);
      this.showStatus('❌ Error ejecutando test completo', 'error');
    } finally {
      this.toggleButtonLoading('runFullTest', false);
    }
  }
  
  // Test individual de desmuteo
  async testUnmute() {
    this.toggleButtonLoading('testUnmute', true);
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0] || !tabs[0].url.includes('twitch.tv')) throw new Error('No estás en Twitch');
      await chrome.tabs.sendMessage(tabs[0].id, { action: 'runTest', testType: 'unmute' }); // FIX: sin eval/new Function
      this.showStatus('🔊 Test de desmuteo ejecutado', 'info');
    } catch (error) {
      this.showStatus('❌ Error en test de desmuteo', 'error');
    } finally {
      this.toggleButtonLoading('testUnmute', false);
    }
  }
  
  // Test individual de volumen
  async testVolume() {
    this.toggleButtonLoading('testVolume', true);
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0] || !tabs[0].url.includes('twitch.tv')) throw new Error('No estás en Twitch');
      await chrome.tabs.sendMessage(tabs[0].id, { action: 'runTest', testType: 'volume' }); // FIX: sin eval/new Function
      this.showStatus('🎚️ Test de volumen ejecutado', 'info');
    } catch (error) {
      this.showStatus('❌ Error en test de volumen', 'error');
    } finally {
      this.toggleButtonLoading('testVolume', false);
    }
  }
  
  // Test individual de calidad
  async testQuality() {
    this.toggleButtonLoading('testQuality', true);
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0] || !tabs[0].url.includes('twitch.tv')) throw new Error('No estás en Twitch');
      await chrome.tabs.sendMessage(tabs[0].id, { action: 'runTest', testType: 'quality' }); // FIX: sin eval/new Function
      this.showStatus('🎥 Test de calidad ejecutado', 'info');
    } catch (error) {
      this.showStatus('❌ Error en test de calidad', 'error');
    } finally {
      this.toggleButtonLoading('testQuality', false);
    }
  }
  
  // Mostrar debug info
  async showDebugInfo() {
    this.toggleButtonLoading('debugInfo', true);
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0] || !tabs[0].url.includes('twitch.tv')) throw new Error('No estás en Twitch');
      await chrome.tabs.sendMessage(tabs[0].id, { action: 'debugInfo' }); // FIX: sin eval/new Function
      this.showStatus('🔍 Debug info mostrado en consola', 'info');
    } catch (error) {
      this.showStatus('❌ Error obteniendo debug info', 'error');
    } finally {
      this.toggleButtonLoading('debugInfo', false);
    }
  }
  
  // Forzar desmuteo
  async forceUnmute() {
    this.toggleButtonLoading('forceUnmute', true);
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0] || !tabs[0].url.includes('twitch.tv')) throw new Error('No estás en Twitch');
      await chrome.tabs.sendMessage(tabs[0].id, { action: 'forceUnmute' }); // FIX: sin eval/new Function
      this.showStatus('🔓 Desmuteo forzado ejecutado', 'info');
    } catch (error) {
      this.showStatus('❌ Error forzando desmuteo', 'error');
    } finally {
      this.toggleButtonLoading('forceUnmute', false);
    }
  }
  
  // Reiniciar timers
  async resetTimers() {
    this.toggleButtonLoading('resetTimers', true);
    
    try {
      await chrome.runtime.sendMessage({ action: 'resetTimers' });
      this.showStatus('🔄 Timers reiniciados exitosamente', 'info');
      await this.refreshStatus();
    } catch (error) {
      this.showStatus('❌ Error reiniciando timers', 'error');
    } finally {
      this.toggleButtonLoading('resetTimers', false);
    }
  }
  
  // executeContentScript eliminado: se reemplaza por mensajería segura (chrome.tabs.sendMessage)
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.twitchPopup = new TwitchExtensionPopup();
});

// Limpiar intervalo cuando se cierre el popup
window.addEventListener('beforeunload', () => {
  if (window.twitchPopup && window.twitchPopup.updateInterval) {
    clearInterval(window.twitchPopup.updateInterval);
  }
});

console.debug('Twitch Extension: Popup script configurado');
