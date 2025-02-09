async function testOllama() {
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Available models:', data.models);
        return data.models;
    } catch (error) {
        console.error('Error testing Ollama:', error);
        throw error;
    }
}

// Run test
console.log('Testing Ollama connection...');
testOllama()
    .then(models => {
        console.log('Ollama is running and these models are available:', models);
    })
    .catch(error => {
        console.error('Failed to connect to Ollama:', error);
        console.log('Please make sure Ollama is running and try these steps:');
        console.log('1. Open a new terminal');
        console.log('2. Run: ollama list');
        console.log('3. If no models are installed, run: ollama pull llama2');
    });
