class OllamaService {
    constructor() {
        this.visionModels = ['llava'];
        this.API_URL = 'http://127.0.0.1:11434/api'; // Changed from localhost to 127.0.0.1
    }

    isVisionModel(modelName) {
        return this.visionModels.some(vm => modelName.toLowerCase().includes(vm));
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
}

// Export the class
window.OllamaService = OllamaService;
