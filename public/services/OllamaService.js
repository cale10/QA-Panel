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

    async isOllamaRunning() {
        try {
            const response = await fetch('http://localhost:11434/api/version');
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async listModels() {
        try {
            const response = await fetch('http://localhost:11434/api/tags');
            const data = await response.json();
            return data.models.map(model => ({
                name: model.name,
                ...this.modelInfo[model.name],
                displayName: this.modelInfo[model.name]?.displayName || model.name,
                description: this.modelInfo[model.name]?.description || (this.isVisionModel(model.name) ? 'Vision-capable model' : 'General purpose model'),
                maxResolution: this.modelInfo[model.name]?.maxResolution || (this.isVisionModel(model.name) ? '1024x1024' : null)
            }));
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

    async generateAnswer(model, prompt, imageData = null) {
        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    prompt,
                    stream: false,
                    options: {
                        temperature: 0.7
                    },
                    ...(imageData && {
                        images: [imageData]
                    })
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate answer');
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('Error generating answer:', error);
            throw error;
        }
    }
}

// Export the class
window.OllamaService = OllamaService;
