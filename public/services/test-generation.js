const OllamaService = require('./OllamaService.js');

async function testGeneration() {
    const service = new OllamaService();
    
    try {
        // First check if Ollama is running
        const isRunning = await service.isOllamaRunning();
        console.log('Ollama running:', isRunning);
        
        if (!isRunning) {
            console.log('Please start Ollama first');
            return;
        }

        // List available models
        const models = await service.listModels();
        console.log('Available models:', models.map(m => m.name));

        // Try generating an answer
        const question = "What is JavaScript?";
        const answer = await service.generateAnswer(
            'llama3.2:latest',  // Using llama3.2 as it's available
            service.createPrompt('VSCode', question)
        );
        
        console.log('\nTest Question:', question);
        console.log('\nGenerated Answer:', answer);
        
    } catch (error) {
        console.error('Error during test:', error);
    }
}

// Run test
console.log('Testing AI answer generation...');
testGeneration();
