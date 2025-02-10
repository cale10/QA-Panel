class OllamaService {
    constructor() {
        this.API_URL = 'http://127.0.0.1:11434/api';
        this.modelsConfig = null;
        this.loadModelsConfig();
    }

    loadModelsConfig() {
        this.modelsConfig = {
            regularModels: [
                {
                    name: 'llama2',
                    displayName: 'Llama 2',
                    description: 'General purpose model for text generation'
                },
                {
                    name: 'codellama',
                    displayName: 'Code Llama',
                    description: 'Specialized for code and technical content'
                },
                {
                    name: 'mistral',
                    displayName: 'Mistral',
                    description: 'High-performance general purpose model'
                }
            ],
            visionModels: [
                {
                    name: 'llava',
                    displayName: 'LLaVA',
                    description: 'Vision-language model for image understanding',
                    maxResolution: '336x336'
                },
                {
                    name: 'bakllava',
                    displayName: 'Bakllava',
                    description: 'Enhanced vision model with better resolution',
                    maxResolution: '1024x1024'
                },
                {
                    name: 'minicpm-v',
                    displayName: 'MiniCPM-V',
                    description: 'Current vision model',
                    maxResolution: '2048x2048'
                },
                {
                    name: 'llama-3.2-vision',
                    displayName: 'Llama 3.2 Vision',
                    description: 'Upcoming vision model (not yet available)',
                    maxResolution: '4096x4096',
                    status: 'upcoming'
                }
            ],
            defaultRegularModel: 'llama2',
            defaultVisionModel: 'minicpm-v',
            upcomingModels: ['llama-3.2-vision']
        };
    }

    isVisionModel(modelName) {
        if (!this.modelsConfig) return false;
        return this.modelsConfig.visionModels.some(m => modelName.toLowerCase().includes(m.name.toLowerCase()));
    }

    isRegularModel(modelName) {
        return !this.isVisionModel(modelName);
    }

    isUpcomingModel(modelName) {
        if (!this.modelsConfig) return false;
        return this.modelsConfig.upcomingModels.some(m => modelName.toLowerCase().includes(m.toLowerCase()));
    }

    getModelInfo(modelName) {
        if (!this.modelsConfig) return null;
        
        const allModels = [
            ...this.modelsConfig.regularModels,
            ...this.modelsConfig.visionModels
        ];

        return allModels.find(m => modelName.toLowerCase().includes(m.name.toLowerCase()));
    }

    async isOllamaRunning() {
        try {
            const response = await fetch(`${this.API_URL}/tags`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return response.ok;
        } catch (error) {
            console.error('Error checking Ollama status:', error);
            return false;
        }
    }

    async listModels() {
        try {
            const response = await fetch(`${this.API_URL}/tags`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('Error listing models:', error);
            return [];
        }
    }

    async generateAnswer(model, prompt, imageData = null) {
        try {
            const modelInfo = this.getModelInfo(model);
            if (this.isUpcomingModel(model)) {
                throw new Error(`${modelInfo?.displayName || model} is not yet available. Coming soon!`);
            }

            const body = {
                model: model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.7
                }
            };

            if (imageData && this.isVisionModel(model)) {
                body.images = [imageData];
            }

            const response = await fetch(`${this.API_URL}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('Error generating answer:', error);
            throw error;
        }
    }

    createPrompt(appName, question, contextQuestions = [], useContext = true) {
        let prompt = `System: You are an expert in ${appName} and software applications.\n\n`;

        if (useContext && contextQuestions.length > 0) {
            prompt += `Previous Interactions:\n${contextQuestions.join('\n\n')}\n\n`;
        }

        prompt += `Question: ${question}\n\n`;
        prompt += `Instructions:\n`;
        if (useContext) {
            prompt += `- Consider the previous Q&As shown above\n`;
            prompt += `- Reference previous answers if they apply\n`;
        }
        prompt += `- Provide a clear and concise answer\n`;
        prompt += `- Focus on practical solutions`;

        return prompt;
    }

    getDefaultRegularModel() {
        return this.modelsConfig?.defaultRegularModel || 'llama2';
    }

    getDefaultVisionModel() {
        return this.modelsConfig?.defaultVisionModel || 'minicpm-v';
    }
}

// Export the class
window.OllamaService = OllamaService;
