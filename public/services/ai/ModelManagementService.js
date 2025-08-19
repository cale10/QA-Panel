class ModelManagementService {
    constructor() {
        if (ModelManagementService.instance) {
            return ModelManagementService.instance;
        }
        ModelManagementService.instance = this;

        this.listeners = new Set();
        this.batchOperations = new Map();
        this.resourceAllocations = new Map();
        this.lifecycleStates = new Map();

        // Load saved data
        this.loadSavedData();

        window.debugLogger.info('model_management', 'Management service initialized');
    }

    loadSavedData() {
        try {
            // Load resource allocations
            const savedAllocations = localStorage.getItem('model_resource_allocations');
            if (savedAllocations) {
                this.resourceAllocations = new Map(JSON.parse(savedAllocations));
            }

            // Load lifecycle states
            const savedStates = localStorage.getItem('model_lifecycle_states');
            if (savedStates) {
                this.lifecycleStates = new Map(JSON.parse(savedStates));
            }

            window.debugLogger.debug('model_management', 'Saved data loaded', {
                allocations: this.resourceAllocations.size,
                lifecycleStates: this.lifecycleStates.size
            });
        } catch (error) {
            window.debugLogger.error('model_management', 'Failed to load saved data', error);
        }
    }

    saveToPersistence() {
        try {
            localStorage.setItem('model_resource_allocations',
                JSON.stringify(Array.from(this.resourceAllocations.entries()))
            );
            localStorage.setItem('model_lifecycle_states',
                JSON.stringify(Array.from(this.lifecycleStates.entries()))
            );
        } catch (error) {
            window.debugLogger.error('model_management', 'Failed to save data', error);
        }
    }

    async getModelSummary(modelName) {
        try {
            // Get model info
            const info = await window.ollamaService.getModelInfo(modelName);

            // Get health status
            const health = await window.modelHealthService.checkModelHealth(modelName);

            // Get compatibility status
            const compatibility = await window.modelCompatibilityService.checkCompatibility(modelName);

            // Get update status
            const updateHistory = window.modelUpdateService.getUpdateHistory(modelName);
            const lastUpdate = updateHistory[0];

            // Get predictions
            const predictions = window.modelPredictiveService.getPredictions(modelName);

            // Get resource allocation
            const allocation = this.getResourceAllocation(modelName);

            // Get lifecycle state
            const lifecycle = this.getLifecycleState(modelName);

            return {
                info,
                health: {
                    status: health.status,
                    score: health.score,
                    issues: health.errors.length,
                    performance: health.performance
                },
                compatibility: {
                    compatible: compatibility.compatible,
                    issues: compatibility.issues?.length || 0
                },
                updates: {
                    lastUpdate: lastUpdate?.timestamp,
                    status: lastUpdate?.status,
                    version: lastUpdate?.toVersion
                },
                predictions: {
                    issues: predictions?.issues.length || 0,
                    confidence: predictions?.confidence || 0
                },
                resources: allocation,
                lifecycle
            };
        } catch (error) {
            window.debugLogger.error('model_management', `Failed to get summary for ${modelName}`, error);
            throw error;
        }
    }

    async getModelComparison(models) {
        try {
            const summaries = await Promise.all(
                models.map(model => this.getModelSummary(model))
            );

            const metrics = {
                health: summaries.map(s => s.health.score),
                performance: summaries.map(s => ({
                    loadTime: s.health.performance.loadTime,
                    responseTime: s.health.performance.responseTime,
                    throughput: s.health.performance.throughput,
                    memoryUsage: s.health.performance.memoryUsage
                })),
                issues: summaries.map(s => ({
                    health: s.health.issues,
                    compatibility: s.compatibility.issues,
                    predictive: s.predictions.issues
                })),
                resources: summaries.map(s => s.resources)
            };

            return {
                summaries: Object.fromEntries(models.map((model, i) => [model, summaries[i]])),
                metrics,
                timestamp: Date.now()
            };
        } catch (error) {
            window.debugLogger.error('model_management', 'Failed to compare models', error);
            throw error;
        }
    }

    async startBatchOperation(operation) {
        const {
            models,
            type,
            options = {}
        } = operation;

        const operationId = Date.now().toString();

        try {
            this.batchOperations.set(operationId, {
                models,
                type,
                options,
                status: 'running',
                progress: 0,
                results: new Map(),
                startTime: Date.now()
            });

            // Notify start
            this.notifyListeners({
                type: 'batch_operation_started',
                operation: operationId,
                models,
                operationType: type
            });

            for (const [index, model] of models.entries()) {
                try {
                    let result;
                    switch (type) {
                        case 'update':
                            result = await window.modelUpdateService.scheduleUpdate(model, options);
                            break;
                        case 'health_check':
                            result = await window.modelHealthService.checkModelHealth(model);
                            break;
                        case 'compatibility_check':
                            result = await window.modelCompatibilityService.checkCompatibility(model, options);
                            break;
                        default:
                            throw new Error(`Unknown operation type: ${type}`);
                    }

                    this.batchOperations.get(operationId).results.set(model, {
                        status: 'success',
                        result
                    });
                } catch (error) {
                    this.batchOperations.get(operationId).results.set(model, {
                        status: 'failed',
                        error: error.message
                    });
                }

                // Update progress
                const progress = ((index + 1) / models.length) * 100;
                this.batchOperations.get(operationId).progress = progress;

                // Notify progress
                this.notifyListeners({
                    type: 'batch_operation_progress',
                    operation: operationId,
                    progress,
                    current: model
                });
            }

            // Mark as complete
            this.batchOperations.get(operationId).status = 'completed';
            this.batchOperations.get(operationId).endTime = Date.now();

            // Notify completion
            this.notifyListeners({
                type: 'batch_operation_completed',
                operation: operationId,
                results: Array.from(this.batchOperations.get(operationId).results.entries())
            });

            return {
                operationId,
                results: this.batchOperations.get(operationId).results
            };
        } catch (error) {
            // Mark as failed
            if (this.batchOperations.has(operationId)) {
                this.batchOperations.get(operationId).status = 'failed';
                this.batchOperations.get(operationId).error = error.message;
            }

            // Notify failure
            this.notifyListeners({
                type: 'batch_operation_failed',
                operation: operationId,
                error: error.message
            });

            throw error;
        }
    }

    getBatchOperation(operationId) {
        return this.batchOperations.get(operationId);
    }

    getBatchOperations() {
        return Array.from(this.batchOperations.entries()).map(([id, op]) => ({
            id,
            ...op
        }));
    }

    setResourceAllocation(modelName, allocation) {
        const {
            maxMemory,
            maxThreads,
            priority,
            gpuEnabled
        } = allocation;

        this.resourceAllocations.set(modelName, {
            maxMemory,
            maxThreads,
            priority,
            gpuEnabled,
            timestamp: Date.now()
        });

        this.saveToPersistence();

        this.notifyListeners({
            type: 'resource_allocation_updated',
            model: modelName,
            allocation
        });
    }

    getResourceAllocation(modelName) {
        return this.resourceAllocations.get(modelName) || {
            maxMemory: null,
            maxThreads: null,
            priority: 'normal',
            gpuEnabled: false
        };
    }

    setLifecycleState(modelName, state) {
        const {
            stage,
            status,
            notes
        } = state;

        this.lifecycleStates.set(modelName, {
            stage,
            status,
            notes,
            timestamp: Date.now()
        });

        this.saveToPersistence();

        this.notifyListeners({
            type: 'lifecycle_state_updated',
            model: modelName,
            state
        });
    }

    getLifecycleState(modelName) {
        return this.lifecycleStates.get(modelName) || {
            stage: 'production',
            status: 'active',
            notes: ''
        };
    }

    getLifecycleStages() {
        return [
            {
                name: 'development',
                description: 'Model is under active development or training'
            },
            {
                name: 'testing',
                description: 'Model is being tested and validated'
            },
            {
                name: 'staging',
                description: 'Model is ready for production deployment'
            },
            {
                name: 'production',
                description: 'Model is actively serving production traffic'
            },
            {
                name: 'deprecated',
                description: 'Model is being phased out'
            },
            {
                name: 'archived',
                description: 'Model is no longer in use'
            }
        ];
    }

    getLifecycleStatuses() {
        return [
            {
                name: 'active',
                description: 'Model is functioning normally'
            },
            {
                name: 'maintenance',
                description: 'Model is undergoing maintenance'
            },
            {
                name: 'degraded',
                description: 'Model is experiencing performance issues'
            },
            {
                name: 'disabled',
                description: 'Model is temporarily disabled'
            },
            {
                name: 'retired',
                description: 'Model is permanently disabled'
            }
        ];
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(event) {
        this.listeners.forEach(callback => callback(event));
    }

    static getInstance() {
        if (!ModelManagementService.instance) {
            ModelManagementService.instance = new ModelManagementService();
        }
        return ModelManagementService.instance;
    }
}

// Export singleton instance
window.modelManagementService = ModelManagementService.getInstance();
