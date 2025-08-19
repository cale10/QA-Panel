class ModelUpdateService {
    constructor() {
        if (ModelUpdateService.instance) {
            return ModelUpdateService.instance;
        }
        ModelUpdateService.instance = this;

        this.updateQueue = new Map();
        this.updateHistory = new Map();
        this.dependencies = new Map();
        this.updateSchedule = new Map();
        this.listeners = new Set();
        this.isUpdating = false;

        // Load saved data
        this.loadSavedData();
        
        // Start update scheduler
        this.startScheduler();

        window.debugLogger.info('model_update', 'Update service initialized');
    }

    loadSavedData() {
        try {
            // Load update history
            const savedHistory = localStorage.getItem('model_update_history');
            if (savedHistory) {
                this.updateHistory = new Map(JSON.parse(savedHistory));
            }

            // Load dependencies
            const savedDependencies = localStorage.getItem('model_dependencies');
            if (savedDependencies) {
                this.dependencies = new Map(JSON.parse(savedDependencies));
            }

            // Load update schedule
            const savedSchedule = localStorage.getItem('model_update_schedule');
            if (savedSchedule) {
                this.updateSchedule = new Map(JSON.parse(savedSchedule));
            }

            window.debugLogger.debug('model_update', 'Saved data loaded', {
                historyEntries: this.updateHistory.size,
                dependencies: this.dependencies.size,
                scheduledUpdates: this.updateSchedule.size
            });
        } catch (error) {
            window.debugLogger.error('model_update', 'Failed to load saved data', error);
        }
    }

    saveToPersistence() {
        try {
            localStorage.setItem('model_update_history', 
                JSON.stringify(Array.from(this.updateHistory.entries()))
            );
            localStorage.setItem('model_dependencies', 
                JSON.stringify(Array.from(this.dependencies.entries()))
            );
            localStorage.setItem('model_update_schedule', 
                JSON.stringify(Array.from(this.updateSchedule.entries()))
            );
        } catch (error) {
            window.debugLogger.error('model_update', 'Failed to save data', error);
        }
    }

    startScheduler() {
        // Check for scheduled updates every minute
        setInterval(() => this.checkScheduledUpdates(), 60000);
        
        // Initial check
        this.checkScheduledUpdates();
    }

    async checkScheduledUpdates() {
        if (this.isUpdating) return;

        const now = Date.now();
        for (const [modelName, schedule] of this.updateSchedule.entries()) {
            if (schedule.nextUpdate <= now) {
                await this.scheduleUpdate(modelName, {
                    priority: 'scheduled',
                    auto: true
                });
            }
        }
    }

    async scheduleUpdate(modelName, options = {}) {
        const {
            priority = 'normal',
            dependencies = true,
            auto = false,
            time = null
        } = options;

        try {
            // If specific time is provided, schedule for later
            if (time) {
                this.updateSchedule.set(modelName, {
                    nextUpdate: new Date(time).getTime(),
                    priority,
                    dependencies,
                    auto
                });
                this.saveToPersistence();
                
                window.debugLogger.info('model_update', `Update scheduled for ${modelName}`, {
                    time: new Date(time).toISOString(),
                    priority,
                    auto
                });
                
                return;
            }

            // Add to update queue
            if (!this.updateQueue.has(modelName)) {
                this.updateQueue.set(modelName, {
                    priority,
                    dependencies,
                    auto,
                    addedAt: Date.now()
                });

                // If dependencies enabled, add them to queue
                if (dependencies) {
                    const modelDeps = await this.resolveDependencies(modelName);
                    for (const dep of modelDeps) {
                        if (!this.updateQueue.has(dep)) {
                            this.updateQueue.set(dep, {
                                priority: 'dependency',
                                dependencies: false,
                                auto: true,
                                addedAt: Date.now()
                            });
                        }
                    }
                }

                this.processUpdateQueue();
            }
        } catch (error) {
            window.debugLogger.error('model_update', `Failed to schedule update for ${modelName}`, error);
            throw error;
        }
    }

    async processUpdateQueue() {
        if (this.isUpdating) return;

        try {
            this.isUpdating = true;

            // Sort queue by priority and time added
            const sortedQueue = Array.from(this.updateQueue.entries())
                .sort(([, a], [, b]) => {
                    const priorities = { high: 0, scheduled: 1, normal: 2, dependency: 3 };
                    if (priorities[a.priority] !== priorities[b.priority]) {
                        return priorities[a.priority] - priorities[b.priority];
                    }
                    return a.addedAt - b.addedAt;
                });

            for (const [modelName, update] of sortedQueue) {
                try {
                    window.debugLogger.info('model_update', `Starting update for ${modelName}`, update);

                    // Get current version before update
                    const beforeInfo = await window.ollamaService.getModelInfo(modelName);
                    
                    // Perform update
                    await window.ollamaService.downloadModel(modelName);
                    
                    // Get new version after update
                    const afterInfo = await window.ollamaService.getModelInfo(modelName);

                    // Record update in history
                    this.recordUpdate(modelName, {
                        timestamp: Date.now(),
                        fromVersion: beforeInfo.version,
                        toVersion: afterInfo.version,
                        automatic: update.auto,
                        status: 'success'
                    });

                    // Remove from queue
                    this.updateQueue.delete(modelName);

                    // Update schedule if it was an auto-update
                    if (update.auto) {
                        this.updateSchedule.set(modelName, {
                            nextUpdate: Date.now() + (24 * 60 * 60 * 1000), // Next check in 24h
                            priority: 'scheduled',
                            dependencies: true,
                            auto: true
                        });
                    }

                    // Notify listeners
                    this.notifyListeners({
                        type: 'update_complete',
                        model: modelName,
                        fromVersion: beforeInfo.version,
                        toVersion: afterInfo.version,
                        automatic: update.auto
                    });

                } catch (error) {
                    window.debugLogger.error('model_update', `Failed to update ${modelName}`, error);
                    
                    // Record failed update
                    this.recordUpdate(modelName, {
                        timestamp: Date.now(),
                        fromVersion: beforeInfo?.version,
                        status: 'failed',
                        error: error.message
                    });

                    // Remove from queue
                    this.updateQueue.delete(modelName);

                    // Notify listeners
                    this.notifyListeners({
                        type: 'update_failed',
                        model: modelName,
                        error: error.message
                    });
                }
            }

            this.saveToPersistence();
        } finally {
            this.isUpdating = false;
        }
    }

    async resolveDependencies(modelName) {
        try {
            const deps = new Set();
            const visited = new Set();

            const traverse = async (name) => {
                if (visited.has(name)) return;
                visited.add(name);

                const modelDeps = this.dependencies.get(name) || [];
                for (const dep of modelDeps) {
                    deps.add(dep);
                    await traverse(dep);
                }
            };

            await traverse(modelName);
            return Array.from(deps);
        } catch (error) {
            window.debugLogger.error('model_update', `Failed to resolve dependencies for ${modelName}`, error);
            return [];
        }
    }

    recordUpdate(modelName, details) {
        if (!this.updateHistory.has(modelName)) {
            this.updateHistory.set(modelName, []);
        }
        this.updateHistory.get(modelName).unshift(details);

        // Keep only last 10 updates per model
        if (this.updateHistory.get(modelName).length > 10) {
            this.updateHistory.get(modelName).pop();
        }
    }

    getUpdateHistory(modelName = null) {
        if (modelName) {
            return this.updateHistory.get(modelName) || [];
        }
        return Array.from(this.updateHistory.entries()).map(([model, updates]) => ({
            model,
            updates
        }));
    }

    setDependencies(modelName, dependencies) {
        this.dependencies.set(modelName, dependencies);
        this.saveToPersistence();
    }

    getDependencies(modelName) {
        return this.dependencies.get(modelName) || [];
    }

    getSchedule(modelName = null) {
        if (modelName) {
            return this.updateSchedule.get(modelName);
        }
        return Array.from(this.updateSchedule.entries()).map(([model, schedule]) => ({
            model,
            ...schedule
        }));
    }

    cancelScheduledUpdate(modelName) {
        this.updateSchedule.delete(modelName);
        this.saveToPersistence();
    }

    cancelQueuedUpdate(modelName) {
        this.updateQueue.delete(modelName);
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(event) {
        this.listeners.forEach(callback => callback(event));
    }

    static getInstance() {
        if (!ModelUpdateService.instance) {
            ModelUpdateService.instance = new ModelUpdateService();
        }
        return ModelUpdateService.instance;
    }
}

// Export singleton instance
window.modelUpdateService = ModelUpdateService.getInstance();
