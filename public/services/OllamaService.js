class OllamaService {
    constructor() {
        this.baseUrl = 'http://localhost:11434/api';
        this.defaultModel = 'llama2';
    }

    async listModels() {
        try {
            const response = await fetch(`${this.baseUrl}/tags`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('Error fetching models:', error);
            throw error;
        }
    }

    async generateAnswer(model, prompt) {
        try {
            const response = await fetch(`${this.baseUrl}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model || this.defaultModel,
                    prompt,
                    stream: false
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('Error generating answer:', error);
            throw error;
        }
    }

    createPrompt(appName, question) {
        return `You are an expert in ${appName}.
Question about ${appName}: ${question}
Please provide a clear and concise answer.`;
    }

    async isOllamaRunning() {
        try {
            const response = await fetch(`${this.baseUrl}/tags`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

// Export the class
window.OllamaService = OllamaService;
