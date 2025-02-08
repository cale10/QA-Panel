class AISettings {
    constructor() {
        this.ollamaService = new OllamaService();
        this.container = document.createElement('div');
        this.container.className = 'ai-settings';
        this.modelList = [];
        this.createContent();
    }

    async createContent() {
        const isOllamaRunning = await this.ollamaService.isOllamaRunning();
        
        if (!isOllamaRunning) {
            this.container.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Ollama Not Running</h3>
                    <p>Please start Ollama to use AI features.</p>
                </div>
            `;
            return;
        }

        try {
            this.modelList = await this.ollamaService.listModels();
            
            this.container.innerHTML = `
                <div class="setting-group">
                    <label>AI Model</label>
                    <select id="aiModelInput">
                        ${this.modelList.map(model => 
                            `<option value="${model.name}">${model.name}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="setting-group">
                    <label>Auto-Answer</label>
                    <div class="toggle-switch">
                        <input type="checkbox" id="autoAnswerToggle">
                        <label for="autoAnswerToggle"></label>
                    </div>
                    <p class="setting-description">Automatically generate answers for new questions</p>
                </div>

                <div class="setting-group">
                    <label>Temperature</label>
                    <input type="range" id="temperatureInput" min="0" max="1" step="0.1" value="0.7">
                    <span id="temperatureValue">0.7</span>
                    <p class="setting-description">Higher values make the output more creative</p>
                </div>
            `;

            // Add event listeners
            const temperatureInput = this.container.querySelector('#temperatureInput');
            const temperatureValue = this.container.querySelector('#temperatureValue');
            
            temperatureInput.addEventListener('input', (e) => {
                temperatureValue.textContent = e.target.value;
            });

        } catch (error) {
            this.container.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Error Loading Models</h3>
                    <p>Could not fetch available models from Ollama.</p>
                    <p class="error-details">${error.message}</p>
                </div>
            `;
        }
    }

    getSettings() {
        if (!this.container.querySelector('#aiModelInput')) {
            return {
                enabled: false,
                model: null,
                autoAnswer: false,
                temperature: 0.7
            };
        }

        return {
            enabled: true,
            model: this.container.querySelector('#aiModelInput').value,
            autoAnswer: this.container.querySelector('#autoAnswerToggle').checked,
            temperature: parseFloat(this.container.querySelector('#temperatureInput').value)
        };
    }

    setSettings(settings) {
        if (!settings || !settings.enabled) return;

        const modelInput = this.container.querySelector('#aiModelInput');
        const autoAnswerToggle = this.container.querySelector('#autoAnswerToggle');
        const temperatureInput = this.container.querySelector('#temperatureInput');
        const temperatureValue = this.container.querySelector('#temperatureValue');

        if (modelInput && settings.model) {
            modelInput.value = settings.model;
        }

        if (autoAnswerToggle) {
            autoAnswerToggle.checked = settings.autoAnswer;
        }

        if (temperatureInput && temperatureValue && settings.temperature !== undefined) {
            temperatureInput.value = settings.temperature;
            temperatureValue.textContent = settings.temperature;
        }
    }

    getElement() {
        return this.container;
    }
}

// Export the class
window.AISettings = AISettings;
