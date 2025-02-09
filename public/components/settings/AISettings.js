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
                regularModels.push({ name: 'llama2' });
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
                        <label class="toggle-switch">
                            <input type="checkbox" id="aiEnabled" ${settings.ai?.enabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                            <span class="toggle-label">AI Features</span>
                        </label>
                        <p class="control-description">Use AI to automatically generate answers</p>
                    </div>

                    <div class="setting-group">
                        <label>Primary Model</label>
                        <select id="aiModel" class="select-control">
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
                        <select id="visionModel" class="select-control">
                            ${visionModels.map(model => `
                                <option value="${model.name}" ${model.name === settings.ai?.visionModel ? 'selected' : ''}>
                                    ${model.name}
                                </option>
                            `).join('')}
                        </select>
                        <p class="setting-description">Model to use for vision-related tasks</p>
                    </div>

                    <div class="setting-group">
                        <label class="toggle-switch">
                            <input type="checkbox" id="autoAnswer" ${settings.ai?.autoAnswer ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                            <span class="toggle-label">Auto-generate</span>
                        </label>
                        <p class="control-description">Automatically generate answers when adding questions</p>
                    </div>

                    <div class="setting-group">
                        <label class="toggle-switch">
                            <input type="checkbox" id="streamResponse" ${settings.ai?.streamResponse ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                            <span class="toggle-label">Live Typing</span>
                        </label>
                        <p class="control-description">Show responses character by character as they're generated</p>
                    </div>

                    <div class="setting-group">
                        <label>Temperature</label>
                        <input type="range" id="temperature" min="0" max="1" step="0.1" value="${settings.ai?.temperature || 0.7}">
                        <span id="temperatureValue">${settings.ai?.temperature || 0.7}</span>
                        <p class="setting-description">Higher values make output more creative but less focused</p>
                    </div>
                </div>

                <div class="section-group">
                    <h3 class="section-title">Prompt Templates</h3>
                    <div class="setting-group">
                        <label>Template Mode</label>
                        <select id="templateMode" class="select-control">
                            <option value="simple" ${settings.ai?.promptTemplate?.mode === 'simple' ? 'selected' : ''}>Simple</option>
                            <option value="basic" ${settings.ai?.promptTemplate?.mode === 'basic' ? 'selected' : ''}>Basic</option>
                            <option value="advanced" ${settings.ai?.promptTemplate?.mode === 'advanced' ? 'selected' : ''}>Advanced</option>
                        </select>
                        <div class="template-description">
                            <div class="template-mode-info ${settings.ai?.promptTemplate?.mode === 'simple' ? '' : 'hidden'}" data-mode="simple">
                                <h4>Simple Mode</h4>
                                <p>Direct question and answer format without any additional context or AI assistance. Best for:</p>
                                <ul>
                                    <li>Manual Q&A management</li>
                                    <li>Personal notes and reminders</li>
                                    <li>Quick reference information</li>
                                </ul>
                            </div>
                            <div class="template-mode-info ${settings.ai?.promptTemplate?.mode === 'basic' ? '' : 'hidden'}" data-mode="basic">
                                <h4>Basic Mode</h4>
                                <p>Smart AI responses with automatic context awareness. Includes:</p>
                                <ul>
                                    <li>Application-specific expertise</li>
                                    <li>Previous Q&A history</li>
                                    <li>Visual analysis (when enabled)</li>
                                    <li>Practical, focused answers</li>
                                </ul>
                            </div>
                            <div class="template-mode-info ${settings.ai?.promptTemplate?.mode === 'advanced' ? '' : 'hidden'}" data-mode="advanced">
                                <h4>Advanced Mode</h4>
                                <p>Full control over AI behavior with customizable:</p>
                                <ul>
                                    <li>System prompt</li>
                                    <li>Custom instructions</li>
                                    <li>Context handling</li>
                                    <li>Response formatting</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div class="setting-group template-editor ${settings.ai?.promptTemplate?.mode === 'advanced' ? '' : 'hidden'}">
                        <label>System Prompt</label>
                        <textarea id="systemPrompt" rows="3">${settings.ai?.promptTemplate?.systemPrompt || ''}</textarea>
                        <p class="setting-description">Define the AI's role and behavior</p>

                        <label>Custom Instructions</label>
                        <textarea id="customInstructions" rows="5">${(settings.ai?.promptTemplate?.customInstructions || []).join('\n')}</textarea>
                        <p class="setting-description">Add specific instructions for the AI (one per line)</p>
                    </div>
                </div>
            `;

            // Add event listeners
            const temperatureInput = this.element.querySelector('#temperature');
            const temperatureValue = this.element.querySelector('#temperatureValue');
            const templateMode = this.element.querySelector('#templateMode');
            const templateEditor = this.element.querySelector('.template-editor');
            
            temperatureInput.addEventListener('input', (e) => {
                temperatureValue.textContent = e.target.value;
            });

            templateMode.addEventListener('change', (e) => {
                // Update template editor visibility
                if (e.target.value === 'advanced') {
                    templateEditor.classList.remove('hidden');
                } else {
                    templateEditor.classList.add('hidden');
                }

                // Update template mode descriptions
                this.element.querySelectorAll('.template-mode-info').forEach(info => {
                    if (info.dataset.mode === e.target.value) {
                        info.classList.remove('hidden');
                    } else {
                        info.classList.add('hidden');
                    }
                });
            });

            // Save settings when any input changes
            this.element.querySelectorAll('input, select, textarea').forEach(input => {
                input.addEventListener('change', () => this.saveSettings());
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
        const streamResponse = this.element.querySelector('#streamResponse');
        const temperature = this.element.querySelector('#temperature');
        const templateMode = this.element.querySelector('#templateMode');
        const systemPrompt = this.element.querySelector('#systemPrompt');
        const customInstructions = this.element.querySelector('#customInstructions');

        if (!aiEnabled) return {};

        return {
            enabled: aiEnabled.checked,
            model: aiModel.value,
            visionModel: visionModel.value,
            autoAnswer: autoAnswer.checked,
            streamResponse: streamResponse.checked,
            temperature: parseFloat(temperature.value),
            promptTemplate: {
                mode: templateMode.value,
                systemPrompt: systemPrompt?.value || 'You are an expert in {app_name} and software applications.',
                customInstructions: customInstructions?.value.split('\n').filter(line => line.trim()) || [],
                templates: {
                    simple: 'Question: {question}\n\nAnswer:',
                    basic: `System: You are an expert in {app_name} and software applications.

Previous Interactions:
{previous_qa}

Current Context:
{if screenshot}[Visual analysis of current screen]{/if}

Question: {question}

Instructions:
- Consider the previous Q&As shown above
- Reference previous answers if they apply
- Provide a clear and concise answer
- Focus on practical solutions`,
                    advanced: '' // User customizes through systemPrompt and customInstructions
                }
            },
            contextMemory: {
                enabled: true, // Always enabled except in simple mode
                limit: 5,
                sortByRelevance: false
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
        const streamResponse = this.element.querySelector('#streamResponse');
        const temperature = this.element.querySelector('#temperature');
        const temperatureValue = this.element.querySelector('#temperatureValue');
        const templateMode = this.element.querySelector('#templateMode');
        const systemPrompt = this.element.querySelector('#systemPrompt');
        const customInstructions = this.element.querySelector('#customInstructions');

        if (aiEnabled) aiEnabled.checked = settings.enabled;
        if (aiModel) aiModel.value = settings.model;
        if (visionModel) visionModel.value = settings.visionModel;
        if (autoAnswer) autoAnswer.checked = settings.autoAnswer;
        if (streamResponse) streamResponse.checked = settings.streamResponse;
        if (temperature) {
            temperature.value = settings.temperature;
            temperatureValue.textContent = settings.temperature;
        }
        if (templateMode) {
            templateMode.value = settings.promptTemplate?.mode || 'basic';
            const templateEditor = this.element.querySelector('.template-editor');
            if (templateMode.value === 'advanced') {
                templateEditor.classList.remove('hidden');
            } else {
                templateEditor.classList.add('hidden');
            }

            // Update template mode descriptions
            this.element.querySelectorAll('.template-mode-info').forEach(info => {
                if (info.dataset.mode === templateMode.value) {
                    info.classList.remove('hidden');
                } else {
                    info.classList.add('hidden');
                }
            });
        }
        if (systemPrompt) systemPrompt.value = settings.promptTemplate?.systemPrompt || '';
        if (customInstructions) customInstructions.value = (settings.promptTemplate?.customInstructions || []).join('\n');
    }

    async getElement() {
        await this.initPromise;
        return this.element;
    }
}

// Export the class
window.AISettings = AISettings;
