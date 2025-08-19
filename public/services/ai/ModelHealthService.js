class ModelHealthService {
    constructor() {
        if (ModelHealthService.instance) {
            return ModelHealthService.instance;
        }
        ModelHealthService.instance = this;

        this.healthData = new Map();
        this.listeners = new Set();
        this.checkInterval = null;

        // Wait for DOM to be ready before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        try {
            // Ensure required services
            if (!window.debugLogger) {
                throw new Error('Debug logger not initialized');
            }
            if (!window.eventBusService) {
                throw new Error('Event bus not initialized');
            }
            if (!window.globalStateService) {
                throw new Error('Global state not initialized');
            }

            // Start health checks
            this.startHealthChecks();

            window.debugLogger.info('model_health', 'Model health service initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize model health service:', error);
            return false;
        }
    }

    startHealthChecks() {
        // Check health every 5 minutes
        this.checkInterval = setInterval(() => {
            this.checkHealth();
        }, 5 * 60 * 1000);

        // Initial check
        this.checkHealth();
    }

    stopHealthChecks() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    async checkHealth() {
        try {
            // Get models from Ollama service
            if (window.ollamaService) {
                const models = await window.ollamaService.listModels();
                
                // Check health for each model
                for (const model of models) {
                    await this.checkModelHealth(model);
                }
            }
        } catch (error) {
            window.debugLogger.error('model_health', 'Failed to check model health', error);
        }
    }

    async checkModelHealth(modelName) {
        try {
            // Get model info
            const modelInfo = await window.ollamaService.getModelInfo(modelName);
            
            // Calculate health metrics
            const health = this.calculateHealth(modelInfo);
            
            // Update health data
            this.healthData.set(modelName, {
                ...health,
                timestamp: new Date()
            });
            
            // Notify listeners
            this.notifyListeners({
                type: 'health_update',
                model: modelName,
                health
            });
            
            window.debugLogger.debug('model_health', `Health check for ${modelName}`, health);
            return health;
        } catch (error) {
            window.debugLogger.error('model_health', `Failed to check health for ${modelName}`, error);
            
            // Update health data with error
            this.healthData.set(modelName, {
                status: 'error',
                error: error.message,
                timestamp: new Date()
            });
            
            // Notify listeners
            this.notifyListeners({
                type: 'health_error',
                model: modelName,
                error: error.message
            });
            
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    calculateHealth(modelInfo) {
        // Calculate health metrics based on model info
        // This is a simplified implementation
        return {
            status: 'healthy',
            size: modelInfo.size || 0,
            parameters: modelInfo.parameters || 0,
            quantization: modelInfo.quantization || 'unknown',
            format: modelInfo.format || 'unknown'
        };
    }

    getModelHealth(modelName) {
        return this.healthData.get(modelName);
    }

    getAllHealthData() {
        return Array.from(this.healthData.entries()).map(([model, health]) => ({
            model,
            ...health
        }));
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(event) {
        this.listeners.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                window.debugLogger.error('model_health', 'Error in model health listener', error);
            }
        });
    }

    static getInstance() {
        if (!ModelHealthService.instance) {
            ModelHealthService.instance = new ModelHealthService();
        }
        return ModelHealthService.instance;
    }
}

// Initialize and export model health service
window.ModelHealthService = ModelHealthService;
window.modelHealthService = ModelHealthService.getInstance();
