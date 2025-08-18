class MemoryControls {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'memory-controls';
        this.createContent();
        this.loadSettings();
    }

    createContent() {
        this.element.innerHTML = `
            <div class="memory-section">
                <h3>Memory Settings</h3>
                <div class="control-group">
                    <label class="toggle-switch">
                        <input type="checkbox" id="memoryEnabled" checked>
                        <span class="toggle-slider"></span>
                        <span class="toggle-label">Context Memory</span>
                    </label>
                    <p class="control-description">Learn from previous interactions to provide better answers</p>
                </div>

                <div class="control-group">
                    <p class="info-text">Memory feature will remember up to 5 previous questions</p>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const memoryEnabled = this.element.querySelector('#memoryEnabled');
        memoryEnabled.addEventListener('change', () => this.saveSettings());
    }

    async saveSettings() {
        try {
            const settings = await window.electronAPI.getSettings();
            
            const newSettings = {
                ...settings,
                ai: {
                    ...settings.ai,
                    contextMemory: {
                        enabled: this.element.querySelector('#memoryEnabled').checked,
                        limit: 5
                    }
                }
            };

            await window.electronAPI.updateSettings(newSettings);
        } catch (error) {
            console.error('Error saving memory settings:', error);
        }
    }

    async loadSettings() {
        try {
            const settings = await window.electronAPI.getSettings();
            
            if (settings.ai?.contextMemory) {
                const memoryEnabled = this.element.querySelector('#memoryEnabled');
                if (memoryEnabled) memoryEnabled.checked = settings.ai.contextMemory.enabled;
            }
        } catch (error) {
            console.error('Error loading memory settings:', error);
        }
    }

    getElement() {
        return this.element;
    }
}

// Export the class
window.MemoryControls = MemoryControls;
