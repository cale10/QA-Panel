class OllamaService {
    constructor() {
        this.modelInfo = {
            'llama2': {
                displayName: 'Llama 2',
                description: 'General purpose model optimized for dialogue and text generation',
                maxResolution: null
            },
            'llava:latest': {
                displayName: 'Llava',
                description: 'Vision-capable model for image understanding and analysis',
                maxResolution: '1024x1024'
            },
            'bakllava:latest': {
                displayName: 'Bakllava',
                description: 'Enhanced vision model with improved image analysis capabilities',
                maxResolution: '2048x2048'
            },
            'minicpm-v:latest': {
                displayName: 'MiniCPM Vision',
                description: 'Lightweight vision model with efficient image processing',
                maxResolution: '1024x1024'
            }
        };
    }

    // Base URL and proxy-aware fetch helper
    baseUrl = 'http://localhost:11434';

    _ollamaURL(path) {
        return `${this.baseUrl}${path}`;
    }

    async _fetch(path, init = {}) {
        // If a proxy is provided (e.g., http://localhost:8080/proxy), use it to avoid CORS
        try {
            if (typeof window !== 'undefined' && window.OLLAMA_PROXY) {
                const payload = {
                    url: this._ollamaURL(path),
                    method: init.method || 'GET',
                    headers: init.headers || {},
                    body: init.body || undefined
                };
                return await fetch(window.OLLAMA_PROXY, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }
        } catch (e) {
            // Fall through to direct fetch on proxy failure
            console.warn('Proxy fetch failed, falling back to direct:', e?.message || e);
        }
        // Direct fetch to Ollama
        return fetch(this._ollamaURL(path), init);
    }


    async isOllamaRunning() {
        try {
            const response = await this._fetch('/api/version');
            if (!response.ok) return false;
            const { version } = await response.json();
            this.serverVersion = (version || '').replace(/^v/i, '');
            return true;
        } catch (error) {
            return false;
        }
    }

    async listModels() {
        try {
            const response = await this._fetch('/api/tags');
            if (!response.ok) throw new Error(`tags ${response.status}`);
            const data = await response.json();
            const models = (data.models || []).map(model => ({
                name: model.name,
                size: model.size,
                modifiedAt: model.modified_at,
                digest: model.digest,
                parameters: model.parameters,
                ...this.modelInfo[model.name],
                displayName: this.modelInfo[model.name]?.displayName || model.name,
                description: this.modelInfo[model.name]?.description || (this.isVisionModel(model.name) ? 'Vision-capable model' : 'General purpose model'),
                maxResolution: this.modelInfo[model.name]?.maxResolution || (this.isVisionModel(model.name) ? '1024x1024' : null),
                type: this.isVisionModel(model.name) ? 'vision' : 'text'
            }));
            return models;
        } catch (error) {
            console.error('Error listing models:', error);
            return [];
        }
    }

    isVisionModel(modelName) {
        const lowerName = modelName.toLowerCase();
        return lowerName.includes('llava') ||
               lowerName.includes('bakllava') ||
               lowerName.includes('vision') ||
               lowerName.includes('minicpm-v');
    }

    isRegularModel(modelName) {
        return !this.isVisionModel(modelName);
    }

    isUpcomingModel(modelName) {
        return modelName.toLowerCase().includes('upcoming');
    }

    createPrompt(appName, question, contextQuestions = [], useContext = true) {
        let prompt = `System: You are an expert in ${appName} and software applications.\n\n`;

        if (useContext && contextQuestions.length > 0) {
            prompt += 'Previous Interactions:\n';
            contextQuestions.forEach(qa => {
                prompt += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
            });
        }

        prompt += `Question: ${question}\n\n`;
        prompt += `Instructions:
- ${useContext ? 'Consider the previous Q&As shown above\n- Reference previous answers if they apply\n- ' : ''}Provide a clear and concise answer
- Focus on practical solutions`;

        return prompt;
    }

    async generateAnswer(model, prompt, imageData = null, opts = {}) {
        try {
            const endpoint = '/api/generate';
            const body = {
                model,
                prompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    ...opts.options
                },
                ...(imageData && { images: [imageData] })
            };

            const response = await this._fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const msg = await response.text();
                throw new Error(`Failed to generate answer: ${response.status} ${msg}`);
            }

            const data = await response.json();
            return data.response || data.message?.content?.map(p => p.text).join('') || '';
        } catch (error) {
            console.error('Error generating answer:', error);
            throw error;
        }
    }

    async chat(model, messages = [], stream = false) {
        const response = await this._fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages, stream })
        });
        if (!response.ok) throw new Error(`chat ${response.status}`);
        return response.json();
    }

    async getModelInfo(model) {
        try {
            const res = await this._fetch('/api/show', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: model })
            });
            if (!res.ok) throw new Error(`show ${res.status}`);
            return res.json();
        } catch (e) {
            return { name: model, version: '0.0.0' };
        }
    }

    async catalogModels() {
        const models = await this.listModels();
        const vision = models.filter(m => m.type === 'vision');
        const text = models.filter(m => m.type === 'text');
        return { models, vision, text, defaults: this.getSuggestedDefaults({ vision, text }) };
    }

    getSuggestedDefaults({ vision = [], text = [] } = {}) {
        const pick = (arr, priority) => {
            for (const name of priority) {
                const found = arr.find(m => m.name.startsWith(name));
                if (found) return found.name;
            }
            return arr[0]?.name || null;
        };
        const textPriority = ['llama3.2', 'mistral', 'llama2', 'codellama'];
        const visionPriority = ['minicpm-v', 'llava', 'bakllava'];
        return {
            defaultRegularModel: pick(text, textPriority),
            defaultVisionModel: pick(vision, visionPriority)
        };
    }
}

// Export the class for both browser and Node environments
if (typeof window !== 'undefined') {
    window.OllamaService = OllamaService;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OllamaService;
}
