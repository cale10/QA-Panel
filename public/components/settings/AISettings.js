class AISettings {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'ai-settings';
        this.initialized = false;
        this.initPromise = this.init();
    }

    async init() {
        if (!this.initialized) {
            await this.createContent();
            this.initialized = true;
        }
    }

    async createContent() {
        try {
            const settings = await window.electronAPI.getSettings();
            const ollamaService = new OllamaService();
            let models = [];
            let isOllamaRunning = false;

            try {
                isOllamaRunning = await ollamaService.isOllamaRunning();
                if (isOllamaRunning) {
                    models = await ollamaService.listModels();
                }
            } catch (error) {
                console.error('Error checking Ollama:', error);
            }

            // Separate models into regular and vision models
            const regularModels = models.filter(m => !ollamaService.isVisionModel(m.name));
            const visionModels = models.filter(m => ollamaService.isVisionModel(m.name));

            // If Ollama is not running, use default models
            if (!isOllamaRunning) {
                regularModels.push({ name: 'llama3.2' });
                visionModels.push({ name: 'llava:latest' });
            }

            this.element.innerHTML = `
                <div class="section-group">
                    <h3 class="section-title">AI Settings</h3>
                    ${!isOllamaRunning ? `
                        <div class="error-message">
                            <p>⚠️ Ollama is not running. Please start Ollama to use AI features.</p>
                        </div>
                    ` : ''}
                    <div class="setting-group">
                        <label>
                            <input type="checkbox" id="aiEnabled" ${settings.ai?.enabled ? 'checked' : ''}>
                            Enable AI Features
                        </label>
                        <p class="setting-description">Use AI to automatically generate answers</p>
                    </div>

                    <div class="setting-group">
                        <label>Primary Model</label>
                        <select id="aiModel">
                            ${regularModels.map(model => `
                                <option value="${model.name}" ${model.name === settings.ai?.model ? 'selected' : ''}>
                                    ${model.name}
                                </option>
                            `).join('')}
                        </select>
                        <p class="setting-description">Model to use for generating answers</p>
                    </div>

                    <div class="setting-group">
                        <label>Vision Model</label>
                        <select id="visionModel">
                            ${visionModels.map(model => `
                                <option value="${model.name}" ${model.name === settings.ai?.visionModel ? 'selected' : ''}>
                                    ${model.name}
                                </option>
                            `).join('')}
                        </select>
                        <p class="setting-description">Model to use for vision-related tasks</p>
                    </div>

                    <div class="setting-group">
                        <label>
                            <input type="checkbox" id="autoAnswer" ${settings.ai?.autoAnswer ? 'checked' : ''}>
                            Auto-generate Answers
                        </label>
                        <p class="setting-description">Automatically generate answers when adding questions</p>
                    </div>

                    <div class="setting-group">
                        <label>Temperature</label>
                        <input type="range" id="temperature" min="0" max="1" step="0.1" value="${settings.ai?.temperature || 0.7}">
                        <span id="temperatureValue">${settings.ai?.temperature || 0.7}</span>
                        <p class="setting-description">Higher values make output more creative but less focused</p>
                    </div>
                </div>

                <div class="section-group">
                    <h3 class="section-title">Context Memory</h3>
                    <div class="setting-group">
                        <label>
                            <input type="checkbox" id="contextEnabled" ${settings.ai?.contextMemory?.enabled ? 'checked' : ''}>
                            Enable Context Memory
                        </label>
                        <p class="setting-description">Consider previous Q&As when generating answers</p>
                    </div>

                    <div class="setting-group">
                        <label>History Limit</label>
                        <select id="contextLimit">
                            ${Array.from({length: 9}, (_, i) => i + 1).map(num => `
                                <option value="${num}" ${num === settings.ai?.contextMemory?.limit ? 'selected' : ''}>
                                    ${num}
                                </option>
                            `).join('')}
                        </select>
                        <p class="setting-description">Number of previous Q&As to remember</p>
                    </div>

                    <div class="setting-group">
                        <label>
                            <input type="checkbox" id="sortByRelevance" ${settings.ai?.contextMemory?.sortByRelevance ? 'checked' : ''}>
                            Sort by Relevance
                        </label>
                        <p class="setting-description">Sort previous Q&As by relevance instead of time</p>
                    </div>
                </div>
            `;

            // Add event listeners
            const temperatureInput = this.element.querySelector('#temperature');
            const temperatureValue = this.element.querySelector('#temperatureValue');
            
            temperatureInput.addEventListener('input', (e) => {
                temperatureValue.textContent = e.target.value;
            });

            // Save settings when any input changes
            this.element.querySelectorAll('input, select').forEach(input => {
                input.addEventListener('change', () => this.getSettings());
            });
        } catch (error) {
            console.error('Error creating AI settings:', error);
            this.element.innerHTML = `
                <div class="error-message">
                    <h3>Error Loading AI Settings</h3>
                    <p>${error.message}</p>
                    <p>Please try restarting the application.</p>
                </div>
            `;
        }
    }

    getSettings() {
        const aiEnabled = this.element.querySelector('#aiEnabled');
        const aiModel = this.element.querySelector('#aiModel');
        const visionModel = this.element.querySelector('#visionModel');
        const autoAnswer = this.element.querySelector('#autoAnswer');
        const temperature = this.element.querySelector('#temperature');
        const contextEnabled = this.element.querySelector('#contextEnabled');
        const contextLimit = this.element.querySelector('#contextLimit');
        const sortByRelevance = this.element.querySelector('#sortByRelevance');

        if (!aiEnabled) return {};

        return {
            enabled: aiEnabled.checked,
            model: aiModel.value,
            visionModel: visionModel.value,
            autoAnswer: autoAnswer.checked,
            temperature: parseFloat(temperature.value),
            contextMemory: {
                enabled: contextEnabled.checked,
                limit: parseInt(contextLimit.value),
                sortByRelevance: sortByRelevance.checked
            }
        };
    }

    async setSettings(settings) {
        if (!settings) return;
        await this.initPromise;

        const aiEnabled = this.element.querySelector('#aiEnabled');
        const aiModel = this.element.querySelector('#aiModel');
        const visionModel = this.element.querySelector('#visionModel');
        const autoAnswer = this.element.querySelector('#autoAnswer');
        const temperature = this.element.querySelector('#temperature');
        const temperatureValue = this.element.querySelector('#temperatureValue');
        const contextEnabled = this.element.querySelector('#contextEnabled');
        const contextLimit = this.element.querySelector('#contextLimit');
        const sortByRelevance = this.element.querySelector('#sortByRelevance');

        if (aiEnabled) aiEnabled.checked = settings.enabled;
        if (aiModel) aiModel.value = settings.model;
        if (visionModel) visionModel.value = settings.visionModel;
        if (autoAnswer) autoAnswer.checked = settings.autoAnswer;
        if (temperature) {
            temperature.value = settings.temperature;
            temperatureValue.textContent = settings.temperature;
        }
        if (contextEnabled) contextEnabled.checked = settings.contextMemory?.enabled;
        if (contextLimit) contextLimit.value = settings.contextMemory?.limit;
        if (sortByRelevance) sortByRelevance.checked = settings.contextMemory?.sortByRelevance;
    }

    async getElement() {
        await this.initPromise;
        return this.element;
    }
}

// Export the class
window.AISettings = AISettings;
