// Content Script para la extensión de Twitch
// Se encarga de detectar y controlar el reproductor de Twitch

console.debug('Twitch Extension: Content Script iniciado');

class TwitchPlayerController {
  constructor() {
    this.playerContainer = null;
    this.observer = null;
    this.isPlayerActive = false;
    this.lastPlayerCheck = 0;
    
    // Selectores actualizados para Twitch 2024
    this.selectors = {
      // Contenedores del reproductor
      playerContainer: [
        '[data-a-target="video-player"]',
        '.video-player',
        '.player-root',
        '[data-test-selector="video-player"]',
        '.persistent-player',
        '[data-a-player-type="site"]'
      ],
      
      // Video element
      video: [
        'video',
        'video[data-a-target]',
        '.video-ref video',
        '[data-a-target="video-player"] video'
      ],
      
      // Controles de volumen - Selectores más específicos
      volumeButton: [
        '[data-a-target="player-mute-unmute-button"]',
        '[data-a-target="player-volume-button"]',
        'button[aria-label*="Mute"]',
        'button[aria-label*="Unmute"]',
        'button[aria-label*="Volume"]',
        'button[aria-label*="Silenciar"]',
        'button[aria-label*="Activar"]',
        '.player-button[aria-label*="olume"]'
      ],
      
      volumeSlider: [
        '[data-a-target="player-volume-slider"]',
        'input[type="range"][aria-valuetext*="%"]',
        'input[type="range"][min="0"][max="1"]',
        'input[aria-label*="Volume"]',
        'input[aria-label*="olumen"]'
      ],
      
      // Controles de calidad - Selectores mejorados
      settingsButton: [
        '[data-a-target="player-settings-button"]',
        'button[aria-label*="Settings"]',
        'button[aria-label*="Configuración"]',
        'button[aria-haspopup="menu"]',
        '[data-test-selector="player-settings-button"]'
      ],
      
      qualityButton: [
        '[data-a-target="player-settings-menu-item-quality"]',
        'button[role="menuitemradio"][aria-checked]',
        '[aria-label*="Quality"]',
        '[aria-label*="Calidad"]'
      ],
      
      qualityOptions: [
        '[data-a-target*="quality-option"]',
        'button[role="menuitemradio"]',
        '[aria-label*="160p"]',
        '[aria-label*="360p"]',
        '[aria-label*="480p"]',
        '[aria-label*="720p"]'
      ],

      // Elementos del menú de configuración
      settingsMenu: [
        '[data-a-target="player-settings-menu"]',
        '[role="menu"]',
        '.player-settings-menu'
      ]
    };
    
    this.init();
  }
  
  // Inicialización principal
  init() {
    console.debug('Twitch Extension: Inicializando controller...');
    
    // Esperar a que la página cargue completamente
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }
  }
  
  // Iniciar detección y observación
  start() {
    console.debug('Twitch Extension: Iniciando detección del reproductor...');
    
    // Verificar si estamos en una página con reproductor
    this.checkForPlayer();
    
    // Configurar MutationObserver para cambios dinámicos
    this.setupObserver();
    
    // Verificación periódica como respaldo
    this.startPeriodicCheck();
    
    // Configurar listeners para mensajes del service worker
    this.setupMessageListener();
  }
  
  // Función auxiliar para encontrar elemento usando múltiples selectores
  findElement(selectors, parent = document) {
    for (const selector of selectors) {
      try { // FIX: evitar SyntaxError por selectores inválidos como :contains
        const element = parent.querySelector(selector);
        if (element) return element;
      } catch (_) { /* selector inválido, continuar */ }
    }
    return null;
  }
  
  // Función auxiliar para encontrar todos los elementos usando múltiples selectores
  findElements(selectors, parent = document) {
    const elements = [];
    for (const selector of selectors) {
      try { // FIX: evitar SyntaxError por selectores inválidos
        const found = parent.querySelectorAll(selector);
        elements.push(...found);
      } catch (_) { /* selector inválido, continuar */ }
    }
    return [...new Set(elements)]; // Eliminar duplicados
  }
  
  // Verificar si hay un reproductor activo en la página
  checkForPlayer() {
    const now = Date.now();
    
    // Throttling para evitar verificaciones excesivas
    if (now - this.lastPlayerCheck < 1000) return;
    this.lastPlayerCheck = now;
    
    const playerContainer = this.findElement(this.selectors.playerContainer);
    const video = this.findElement(this.selectors.video);
    
    if (playerContainer && video) {
      if (!this.isPlayerActive) {
        console.debug('Twitch Extension: Reproductor detectado');
        this.playerContainer = playerContainer;
        this.isPlayerActive = true;
        this.onPlayerDetected(video);
      }
    } else {
      if (this.isPlayerActive) {
        console.debug('Twitch Extension: Reproductor perdido');
        this.isPlayerActive = false;
        this.onPlayerLost();
      }
    }
  }
  
  // Cuando se detecta el reproductor
  async onPlayerDetected(video) {
    console.debug('Twitch Extension: Configurando reproductor detectado...');
    
    // FIX: Esperar 10 segundos antes de desmutear automáticamente para asegurar carga completa
    console.debug('Twitch Extension: Esperando 10 segundos antes del desmuteo automático...');
    setTimeout(() => {
      console.debug('Twitch Extension: Ejecutando desmuteo automático tras 10 segundos de delay');
      this.handleAutoUnmute(video);
    }, 10000); // 10 segundos
    
    // Notificar al service worker
    try {
      await chrome.runtime.sendMessage({
        action: 'twitchPlayerDetected',
        url: window.location.href,
        timestamp: Date.now()
      });
    } catch (error) {
      console.debug('Twitch Extension: Error notificando detección:', error);
    }
  }
  
  // Cuando se pierde el reproductor
  async onPlayerLost() {
    this.playerContainer = null;
    
    try {
      await chrome.runtime.sendMessage({
        action: 'twitchPlayerLost',
        timestamp: Date.now()
      });
    } catch (error) {
      console.debug('Twitch Extension: Error notificando pérdida:', error);
    }
  }
  
  // Configurar MutationObserver
  setupObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    this.observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldCheck = true;
        }
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'src' || mutation.attributeName === 'data-a-target')) {
          shouldCheck = true;
        }
      });
      
      if (shouldCheck) {
        setTimeout(() => this.checkForPlayer(), 100);
      }
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'data-a-target', 'class']
    });
    
    console.debug('Twitch Extension: MutationObserver configurado');
  }
  
  // Verificación periódica como respaldo
  startPeriodicCheck() {
    setInterval(() => {
      this.checkForPlayer();
    }, 5000);
  }
  
  // Configurar listener para mensajes del service worker
  setupMessageListener() {
    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
      console.debug('Twitch Extension: Mensaje recibido en content script:', message);
      
      try {
        switch (message.action) {
          case 'changeVolume':
            await this.changeVolume(message.value);
            sendResponse({ status: 'completed' });
            break;
            
          case 'changeQuality':
            await this.changeQuality(message.value);
            sendResponse({ status: 'completed' });
            break;
            
          case 'runTest':
            const result = await this.handleTestRequest(message.testType);
            sendResponse({ status: 'completed', success: result });
            break;
            
          case 'forceUnmute':
            const video = this.findElement(this.selectors.video);
            if (video) {
              await this.handleAutoUnmute(video);
              sendResponse({ status: 'completed', success: true });
            } else {
              sendResponse({ status: 'completed', success: false, error: 'No video found' });
            }
            break;
            
          case 'debugInfo': // NUEVO: permite debug desde popup sin eval
            if (window.twitchExtensionTest && typeof window.twitchExtensionTest.debugInfo === 'function') {
              window.twitchExtensionTest.debugInfo();
              sendResponse({ status: 'completed', success: true });
            } else {
              sendResponse({ status: 'completed', success: false });
            }
            break;
            
          default:
            sendResponse({ status: 'unknown_action' });
        }
      } catch (error) {
        console.debug('Twitch Extension: Error procesando mensaje:', error);
        sendResponse({ status: 'error', error: error.message });
      }
      // FIX(MV3): mantener el canal abierto para respuestas asíncronas
      return true;
    });
  }
  
  // Desmutear automáticamente el audio mejorado
  async handleAutoUnmute(video) {
    if (!video || !this.isPlayerActive) return;
    
    console.debug('Twitch Extension: Verificando estado de audio...');
    
    // Esperar a que los controles se carguen completamente
    await this.waitForControls();
    
    // Múltiples intentos de detección
    const isVideoMuted = video.muted;
    const volumeButton = this.findElement(this.selectors.volumeButton);
    const volumeSlider = this.findElement(this.selectors.volumeSlider);
    
    console.debug('Twitch Extension: Estado detectado:', {
      videoMuted: isVideoMuted,
      hasVolumeButton: !!volumeButton,
      hasVolumeSlider: !!volumeSlider,
      buttonLabel: volumeButton?.getAttribute('aria-label'),
      sliderValue: volumeSlider?.value
    });
    
    // Verificar si está muteado por diferentes métodos
    let isMuted = false;
    
    if (volumeButton) {
      const label = volumeButton.getAttribute('aria-label')?.toLowerCase() || '';
      isMuted = label.includes('unmute') || 
                label.includes('activar') ||
                label.includes('turn on') ||
                label.includes('encender');
    }
    
    if (volumeSlider && volumeSlider.value) {
      const sliderValue = parseFloat(volumeSlider.value);
      if (sliderValue === 0) isMuted = true;
    }
    
    if (isVideoMuted) isMuted = true;
    
    if (isMuted) {
      console.debug('Twitch Extension: Audio muteado detectado, intentando desmutear...');
      
      // Método 1: Botón de volumen de Twitch (preferido)
      if (volumeButton) {
        console.debug('Twitch Extension: Usando botón de volumen de Twitch');
        await this.simulateHumanClick(volumeButton);
        await this.wait(500);
        
        // Verificar si funcionó
        const newLabel = volumeButton.getAttribute('aria-label')?.toLowerCase() || '';
        if (!newLabel.includes('unmute') && !newLabel.includes('activar')) {
          console.debug('Twitch Extension: Desmuteo exitoso via botón');
          return;
        }
      }
      
      // Método 2: Slider de volumen (si el botón no funciona)
      if (volumeSlider) {
        console.debug('Twitch Extension: Usando slider de volumen');
        const currentVolume = parseFloat(volumeSlider.value) || 0;
        if (currentVolume === 0) {
          await this.simulateSliderChange(volumeSlider, 0.5); // 50% volumen
          console.debug('Twitch Extension: Volumen ajustado via slider');
          return;
        }
      }
      
      // Método 3: Fallback directo al video (último recurso)
      try {
        if (video.muted) {
          video.muted = false;
          if (video.volume === 0) {
            video.volume = 0.5;
          }
          console.debug('Twitch Extension: Desmuteo directo aplicado');
        }
      } catch (error) {
        console.debug('Twitch Extension: Error en desmuteo directo (probablemente por autoplay policy):', error);
      }
      
    } else {
      console.debug('Twitch Extension: Audio no está muteado');
    }
  }
  
  // Esperar a que los controles se carguen
  async waitForControls(maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      const volumeButton = this.findElement(this.selectors.volumeButton);
      const volumeSlider = this.findElement(this.selectors.volumeSlider);
      
      if (volumeButton || volumeSlider) {
        console.debug('Twitch Extension: Controles encontrados después de', i + 1, 'intentos');
        return true;
      }
      
      await this.wait(300);
    }
    
    console.debug('Twitch Extension: No se encontraron controles después de', maxAttempts, 'intentos');
    return false;
  }
  
  // Cambiar el volumen del reproductor
  async changeVolume(targetVolume) {
    if (!this.isPlayerActive) {
      console.debug('Twitch Extension: No hay reproductor activo para cambiar volumen');
      return;
    }
    
    console.debug(`Twitch Extension: Cambiando volumen a ${targetVolume}%`);
    
    // Buscar el slider de volumen
    const volumeSlider = this.findElement(this.selectors.volumeSlider);
    
    if (volumeSlider) {
      // Calcular valor para el slider (normalizado 0-1)
      const sliderValue = targetVolume / 100;
      
      // Simular interacción humana con el slider
      await this.simulateSliderChange(volumeSlider, sliderValue);
      
      console.debug(`Twitch Extension: Volumen cambiado a ${targetVolume}% exitosamente`);
      
      // Notificar al service worker
      this.notifyActionCompleted('volume', {
        newVolume: targetVolume,
        method: 'slider'
      });
    } else {
      console.debug('Twitch Extension: No se encontró el control de volumen');
    }
  }
  
  // Cambiar la calidad del video - Implementación mejorada
  async changeQuality(targetQuality) {
    if (!this.isPlayerActive) {
      console.debug('Twitch Extension: No hay reproductor activo para cambiar calidad');
      return false;
    }
    
    console.debug(`Twitch Extension: Cambiando calidad a ${targetQuality}`);
    
    try {
      // Paso 1: Abrir el menú de configuración
      const settingsButton = this.findElement(this.selectors.settingsButton);
      if (!settingsButton) {
        console.debug('Twitch Extension: No se encontró el botón de configuración');
        console.debug('Twitch Extension: Botones disponibles:', 
          document.querySelectorAll('button[aria-haspopup], button[aria-label*="etting"]'));
        return false;
      }
      
      console.debug('Twitch Extension: Abriendo menú de configuración...');
      await this.simulateHumanClick(settingsButton);
      await this.wait(800); // Más tiempo para que cargue el menú
      
      // Verificar que el menú se abrió
      const settingsMenu = this.findElement(this.selectors.settingsMenu);
      if (!settingsMenu) {
        console.debug('Twitch Extension: El menú de configuración no se abrió');
        return false;
      }
      
      // Paso 2: Buscar el botón de calidad en el menú
      await this.wait(300);
      const qualityButtons = this.findElements(this.selectors.qualityButton);
      let qualityButton = null;
      
      // Buscar el botón de calidad por diferentes métodos
      for (const button of qualityButtons) {
        const text = button.textContent?.toLowerCase() || '';
        const label = button.getAttribute('aria-label')?.toLowerCase() || '';
        const dataTarget = button.getAttribute('data-a-target') || '';
        
        if (text.includes('quality') || text.includes('calidad') ||
            label.includes('quality') || label.includes('calidad') ||
            dataTarget.includes('quality')) {
          qualityButton = button;
          break;
        }
      }
      
      if (!qualityButton) {
        // Fallback: buscar por posición en el menú
        const menuItems = settingsMenu.querySelectorAll('button[role="menuitemradio"], button[aria-checked]');
        console.debug('Twitch Extension: Items del menú encontrados:', menuItems.length);
        
        for (const item of menuItems) {
          const text = item.textContent?.toLowerCase() || '';
          if (text.includes('p') && (text.includes('720') || text.includes('480') || text.includes('360'))) {
            qualityButton = item.parentElement?.querySelector('button') || item;
            break;
          }
        }
      }
      
      if (!qualityButton) {
        console.debug('Twitch Extension: No se encontró el botón de calidad');
        // Cerrar menú
        await this.simulateHumanClick(settingsButton);
        return false;
      }
      
      console.debug('Twitch Extension: Abriendo submenú de calidad...');
      await this.simulateHumanClick(qualityButton);
      await this.wait(600); // Tiempo para que abra el submenú
      
      // Paso 3: Buscar la opción de calidad específica
      const allQualityOptions = document.querySelectorAll(
        'button[role="menuitemradio"], [data-a-target*="quality"], button[aria-label*="p"]'
      );
      
      let targetOption = null;
      
      console.debug('Twitch Extension: Opciones de calidad encontradas:', allQualityOptions.length);
      
      for (const option of allQualityOptions) {
        const text = (option.textContent || '').trim();
        const label = option.getAttribute('aria-label') || '';
        
        console.debug('Twitch Extension: Revisando opción:', { text, label });
        
        // Buscar coincidencia exacta
        if (text === targetQuality || 
            text.includes(targetQuality) ||
            label.includes(targetQuality)) {
          targetOption = option;
          console.debug('Twitch Extension: Opción encontrada:', text || label);
          break;
        }
      }
      
      if (targetOption && !targetOption.getAttribute('aria-checked')) {
        console.debug(`Twitch Extension: Seleccionando calidad ${targetQuality}...`);
        await this.simulateHumanClick(targetOption);
        await this.wait(500);
        
        console.debug(`Twitch Extension: Calidad cambiada a ${targetQuality} exitosamente`);
        
        this.notifyActionCompleted('quality', {
          newQuality: targetQuality,
          method: 'menu',
          success: true
        });
        
        return true;
      } else if (targetOption && targetOption.getAttribute('aria-checked')) {
        console.debug(`Twitch Extension: La calidad ${targetQuality} ya está seleccionada`);
        return true;
      } else {
        console.debug(`Twitch Extension: No se encontró la opción de calidad ${targetQuality}`);
        
        // Mostrar opciones disponibles para debugging
        const availableOptions = Array.from(allQualityOptions).map(opt => 
          opt.textContent?.trim() || opt.getAttribute('aria-label')
        ).filter(Boolean);
        console.debug('Twitch Extension: Opciones disponibles:', availableOptions);
        
        return false;
      }
      
    } catch (error) {
      console.debug('Twitch Extension: Error cambiando calidad:', error);
      return false;
    } finally {
      // Siempre intentar cerrar menús
      setTimeout(async () => {
        // Hacer clic fuera para cerrar cualquier menú abierto
        if (this.playerContainer) {
          await this.simulateHumanClick(this.playerContainer);
        }
      }, 500);
    }
  }
  
  // Simular clic humano más realista en un elemento
  async simulateHumanClick(element) {
    if (!element) return;
    
    // Scroll al elemento si es necesario
    try { element.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
    await this.wait(100);
    
    // Simular hover
    const hoverEvent = new MouseEvent('mouseenter', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    element.dispatchEvent(hoverEvent);
    await this.wait(50);
    
    // Secuencia de eventos de clic más realista
    const events = [
      { type: 'mousedown', delay: 0 },
      { type: 'mouseup', delay: 50 },
      { type: 'click', delay: 10 }
    ];
    
    for (const { type, delay } of events) {
      await this.wait(delay);
      try {
        const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : null;
        const clientX = rect ? rect.left + rect.width / 2 : (element.offsetLeft || 0) + (element.offsetWidth || 0) / 2;
        const clientY = rect ? rect.top + rect.height / 2 : (element.offsetTop || 0) + (element.offsetHeight || 0) / 2;
        const event = new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX,
          clientY
        });
        element.dispatchEvent(event);
      } catch (_) {}
    }
    
    // Focus si es necesario
    if (element.focus) {
      element.focus();
    }
  }
  
  // Simular clic básico (legacy)
  simulateClick(element) {
    if (!element) return;
    
    const events = ['mousedown', 'mouseup', 'click'];
    events.forEach(eventType => {
      const event = new MouseEvent(eventType, {
        bubbles: true,
        cancelable: true,
        view: window
      });
      element.dispatchEvent(event);
    });
  }
  
  // Simular cambio de slider de forma humana
  async simulateSliderChange(slider, value) {
    // Enfocar el slider
    try { slider.focus(); } catch (_) {}
    
    // Cambiar el valor
    slider.value = value;
    
    // Disparar eventos de forma secuencial para simular interacción humana
    const events = [
      'focus',
      'input',
      'change'
    ];
    
    for (const eventType of events) {
      try {
        const event = new Event(eventType, {
          bubbles: true,
          cancelable: true
        });
        slider.dispatchEvent(event);
      } catch (_) {}
      await this.wait(50);
    }
  }
  
  // Función auxiliar para esperar
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Notificar al service worker que una acción se completó
  async notifyActionCompleted(type, details) {
    try {
      await chrome.runtime.sendMessage({
        action: 'actionCompleted',
        type: type,
        details: details,
        timestamp: Date.now()
      });
    } catch (error) {
      console.debug('Twitch Extension: Error notificando acción completada:', error);
    }
  }
  
  // Manejar solicitudes de test desde el popup
  async handleTestRequest(testType) {
    console.debug(`Twitch Extension: Ejecutando test: ${testType}`);
    
    try {
      switch (testType) {
        case 'full':
          return await window.twitchExtensionTest.runFullTest();
          
        case 'unmute':
          return await window.twitchExtensionTest.testUnmute();
          
        case 'volume':
          const volumeResult = await window.twitchExtensionTest.testVolume();
          return volumeResult !== false;
          
        case 'quality':
          return await window.twitchExtensionTest.testQuality();
          
        default:
          console.debug('Twitch Extension: Tipo de test desconocido:', testType);
          return false;
      }
    } catch (error) {
      console.debug('Twitch Extension: Error en test:', error);
      return false;
    }
  }
}

// Funciones de testing expuestas globalmente
window.twitchExtensionTest = {
  // Test completo con delays
  async runFullTest() {
    console.log('🧪 Twitch Extension: Iniciando test completo...');
    
    if (!window.twitchController) {
      console.log('❌ Controller no encontrado');
      return false;
    }
    
    const controller = window.twitchController;
    
    try {
      // Test 1: Verificar reproductor
      console.log('🔍 Test 1: Verificando reproductor...');
      if (!controller.isPlayerActive) {
        console.log('❌ Reproductor no activo');
        return false;
      }
      console.log('✅ Reproductor activo');
      
      await controller.wait(3000); // 3 segundos de delay
      
      // Test 2: Desmutear audio
      console.log('🔊 Test 2: Probando desmuteo...');
      const video = controller.findElement(controller.selectors.video);
      if (video) {
        await controller.handleAutoUnmute(video);
        console.log('✅ Test de desmuteo completado');
      } else {
        console.log('❌ Video no encontrado');
      }
      
      await controller.wait(3000); // 3 segundos de delay
      
      // Test 3: Cambiar volumen
      console.log('🎚️ Test 3: Probando cambio de volumen...');
      const testVolume = Math.floor(Math.random() * 100) + 1;
      await controller.changeVolume(testVolume);
      console.log(`✅ Test de volumen completado (${testVolume}%)`);
      
      await controller.wait(3000); // 3 segundos de delay
      
      // Test 4: Cambiar calidad
      console.log('🎥 Test 4: Probando cambio de calidad...');
      const testQualities = ['160p', '360p', '480p'];
      const randomQuality = testQualities[Math.floor(Math.random() * testQualities.length)];
      const success = await controller.changeQuality(randomQuality);
      if (success) {
        console.log(`✅ Test de calidad completado (${randomQuality})`);
      } else {
        console.log(`⚠️ Test de calidad falló para ${randomQuality}`);
      }
      
      console.log('🎉 Test completo finalizado');
      return true;
      
    } catch (error) {
      console.log('❌ Error en test:', error);
      return false;
    }
  },
  
  // Test individual de desmuteo
  async testUnmute() {
    if (!window.twitchController) return false;
    const controller = window.twitchController;
    const video = controller.findElement(controller.selectors.video);
    if (video) {
      await controller.handleAutoUnmute(video);
      return true;
    }
    return false;
  },
  
  // Test individual de volumen
  async testVolume(volume = null) {
    if (!window.twitchController) return false;
    const controller = window.twitchController;
    const testVolume = volume || Math.floor(Math.random() * 100) + 1;
    await controller.changeVolume(testVolume);
    return testVolume;
  },
  
  // Test individual de calidad
  async testQuality(quality = null) {
    if (!window.twitchController) return false;
    const controller = window.twitchController;
    const testQualities = ['160p', '360p', '480p'];
    const testQuality = quality || testQualities[Math.floor(Math.random() * testQualities.length)];
    return await controller.changeQuality(testQuality);
  },
  
  // Mostrar información de debugging
  debugInfo() {
    if (!window.twitchController) {
      console.log('Controller no disponible');
      return;
    }
    
    const controller = window.twitchController;
    console.log('🔍 Debug Info:', {
      isPlayerActive: controller.isPlayerActive,
      playerContainer: !!controller.playerContainer,
      video: !!controller.findElement(controller.selectors.video),
      volumeButton: !!controller.findElement(controller.selectors.volumeButton),
      volumeSlider: !!controller.findElement(controller.selectors.volumeSlider),
      settingsButton: !!controller.findElement(controller.selectors.settingsButton)
    });
  }
};

// Verificar si estamos en Twitch antes de inicializar
if (window.location.hostname === 'www.twitch.tv') {
  // Esperar un momento para que la página se estabilice
  setTimeout(() => {
    console.debug('Twitch Extension: Inicializando en Twitch...');
    const controller = new TwitchPlayerController();
    window.twitchController = controller; // Exponer globalmente para testing
  }, 1000);
} else {
  console.debug('Twitch Extension: No estamos en Twitch, saltando inicialización');
}

console.debug('Twitch Extension: Content Script cargado completamente');
console.debug('Twitch Extension: Funciones de test disponibles en window.twitchExtensionTest');
