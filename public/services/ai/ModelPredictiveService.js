class ModelPredictiveService {
    constructor() {
        if (ModelPredictiveService.instance) {
            return ModelPredictiveService.instance;
        }
        ModelPredictiveService.instance = this;

        this.performanceHistory = new Map();
        this.predictions = new Map();
        this.listeners = new Set();
        this.analysisInterval = 1000 * 60 * 60; // Analyze every hour
        this.historyLimit = 30; // Keep 30 days of history
        this.alertThresholds = new Map();

        // Load saved data
        this.loadSavedData();
        
        // Start analysis scheduler
        this.startAnalysisScheduler();

        window.debugLogger.info('model_predictive', 'Predictive service initialized');
    }

    loadSavedData() {
        try {
            // Load performance history
            const savedHistory = localStorage.getItem('model_performance_history');
            if (savedHistory) {
                this.performanceHistory = new Map(JSON.parse(savedHistory));
            }

            // Load alert thresholds
            const savedThresholds = localStorage.getItem('model_alert_thresholds');
            if (savedThresholds) {
                this.alertThresholds = new Map(JSON.parse(savedThresholds));
            }

            window.debugLogger.debug('model_predictive', 'Saved data loaded', {
                historyEntries: this.performanceHistory.size,
                thresholds: this.alertThresholds.size
            });
        } catch (error) {
            window.debugLogger.error('model_predictive', 'Failed to load saved data', error);
        }
    }

    saveToPersistence() {
        try {
            localStorage.setItem('model_performance_history',
                JSON.stringify(Array.from(this.performanceHistory.entries()))
            );
            localStorage.setItem('model_alert_thresholds',
                JSON.stringify(Array.from(this.alertThresholds.entries()))
            );
        } catch (error) {
            window.debugLogger.error('model_predictive', 'Failed to save data', error);
        }
    }

    startAnalysisScheduler() {
        setInterval(() => this.runPredictiveAnalysis(), this.analysisInterval);
        
        // Initial analysis
        this.runPredictiveAnalysis();
    }

    async runPredictiveAnalysis() {
        try {
            window.debugLogger.debug('model_predictive', 'Starting predictive analysis');
            const startTime = performance.now();

            // Get all models
            const models = await window.ollamaService.listModels();
            const allModels = [...models.text, ...models.vision];

            // Analyze each model
            for (const model of allModels) {
                await this.analyzeModel(model.name);
            }

            // Clean up old history
            this.cleanupHistory();

            const duration = performance.now() - startTime;
            window.debugLogger.info('model_predictive', 'Predictive analysis completed', {
                duration: `${duration.toFixed(2)}ms`,
                modelsAnalyzed: allModels.length
            });
        } catch (error) {
            window.debugLogger.error('model_predictive', 'Failed to run predictive analysis', error);
        }
    }

    async analyzeModel(modelName) {
        try {
            // Get current health metrics
            const health = await window.modelHealthService.checkModelHealth(modelName);
            
            // Get performance metrics
            const performance = health.performance || {};
            
            // Record metrics
            this.recordPerformanceMetrics(modelName, {
                timestamp: Date.now(),
                loadTime: performance.loadTime,
                memoryUsage: performance.memoryUsage,
                responseTime: performance.responseTime,
                throughput: performance.throughput,
                errors: health.errors.length
            });

            // Generate predictions
            const predictions = this.generatePredictions(modelName);
            
            // Check for potential issues
            const issues = this.detectPotentialIssues(modelName, predictions);

            // Update predictions
            this.predictions.set(modelName, {
                predictions,
                issues,
                timestamp: Date.now()
            });

            // Notify if issues found
            if (issues.length > 0) {
                this.notifyIssues(modelName, issues);
            }

            window.debugLogger.debug('model_predictive', `Analysis completed for ${modelName}`, {
                predictions,
                issues
            });
        } catch (error) {
            window.debugLogger.error('model_predictive', `Failed to analyze ${modelName}`, error);
        }
    }

    recordPerformanceMetrics(modelName, metrics) {
        if (!this.performanceHistory.has(modelName)) {
            this.performanceHistory.set(modelName, []);
        }

        const history = this.performanceHistory.get(modelName);
        history.unshift(metrics);

        // Keep history within limit
        if (history.length > this.historyLimit * 24) { // 24 entries per day
            history.length = this.historyLimit * 24;
        }

        this.saveToPersistence();
    }

    generatePredictions(modelName) {
        const history = this.performanceHistory.get(modelName) || [];
        if (history.length < 24) { // Need at least a day of data
            return null;
        }

        // Calculate trends
        const trends = {
            loadTime: this.calculateTrend(history.map(h => h.loadTime)),
            memoryUsage: this.calculateTrend(history.map(h => h.memoryUsage)),
            responseTime: this.calculateTrend(history.map(h => h.responseTime)),
            throughput: this.calculateTrend(history.map(h => h.throughput)),
            errors: this.calculateTrend(history.map(h => h.errors))
        };

        // Generate forecasts
        const forecasts = {
            loadTime: this.forecast(history.map(h => h.loadTime)),
            memoryUsage: this.forecast(history.map(h => h.memoryUsage)),
            responseTime: this.forecast(history.map(h => h.responseTime)),
            throughput: this.forecast(history.map(h => h.throughput)),
            errors: this.forecast(history.map(h => h.errors))
        };

        return {
            trends,
            forecasts,
            confidence: this.calculateConfidence(history)
        };
    }

    calculateTrend(values) {
        if (!values.length) return 0;

        // Simple linear regression
        const n = values.length;
        const x = Array.from({length: n}, (_, i) => i);
        const y = values;

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((a, i) => a + i * y[i], 0);
        const sumXX = x.reduce((a, i) => a + i * i, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return slope;
    }

    forecast(values) {
        if (!values.length) return null;

        const trend = this.calculateTrend(values);
        const lastValue = values[0];
        
        // Predict next 24 hours
        return Array.from({length: 24}, (_, i) => {
            return lastValue + trend * (i + 1);
        });
    }

    calculateConfidence(history) {
        // Simple confidence based on data consistency
        const variance = this.calculateVariance(history.map(h => h.loadTime))
            + this.calculateVariance(history.map(h => h.responseTime))
            + this.calculateVariance(history.map(h => h.throughput));

        // Scale to 0-1 range
        return Math.max(0, Math.min(1, 1 - (variance / 1000)));
    }

    calculateVariance(values) {
        if (!values.length) return 0;

        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(v => Math.pow(v - mean, 2));
        return squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    }

    detectPotentialIssues(modelName, predictions) {
        if (!predictions) return [];

        const issues = [];
        const thresholds = this.alertThresholds.get(modelName) || this.getDefaultThresholds();

        // Check load time trend
        if (predictions.trends.loadTime > thresholds.loadTime.trend) {
            issues.push({
                type: 'trend',
                metric: 'loadTime',
                message: 'Load time is trending upward',
                severity: 'warning'
            });
        }

        // Check memory usage forecast
        const maxMemoryForecast = Math.max(...predictions.forecasts.memoryUsage);
        if (maxMemoryForecast > thresholds.memoryUsage.max) {
            issues.push({
                type: 'forecast',
                metric: 'memoryUsage',
                message: 'Memory usage may exceed threshold',
                severity: 'warning',
                forecast: maxMemoryForecast
            });
        }

        // Check response time trend
        if (predictions.trends.responseTime > thresholds.responseTime.trend) {
            issues.push({
                type: 'trend',
                metric: 'responseTime',
                message: 'Response time is trending upward',
                severity: 'warning'
            });
        }

        // Check throughput trend
        if (predictions.trends.throughput < thresholds.throughput.trend) {
            issues.push({
                type: 'trend',
                metric: 'throughput',
                message: 'Throughput is trending downward',
                severity: 'warning'
            });
        }

        // Check error trend
        if (predictions.trends.errors > thresholds.errors.trend) {
            issues.push({
                type: 'trend',
                metric: 'errors',
                message: 'Error rate is trending upward',
                severity: 'error'
            });
        }

        return issues;
    }

    getDefaultThresholds() {
        return {
            loadTime: {
                max: 10000, // 10 seconds
                trend: 100 // ms/hour increase
            },
            memoryUsage: {
                max: 8 * 1024 * 1024 * 1024, // 8GB
                trend: 1024 * 1024 // 1MB/hour increase
            },
            responseTime: {
                max: 5000, // 5 seconds
                trend: 50 // ms/hour increase
            },
            throughput: {
                min: 10, // requests/second
                trend: -1 // requests/hour decrease
            },
            errors: {
                max: 10, // errors/hour
                trend: 0.1 // errors/hour increase
            }
        };
    }

    setAlertThresholds(modelName, thresholds) {
        this.alertThresholds.set(modelName, {
            ...this.getDefaultThresholds(),
            ...thresholds
        });
        this.saveToPersistence();
    }

    getAlertThresholds(modelName) {
        return this.alertThresholds.get(modelName) || this.getDefaultThresholds();
    }

    getPredictions(modelName) {
        return this.predictions.get(modelName);
    }

    getPerformanceHistory(modelName, options = {}) {
        const {
            days = 7,
            metrics = ['loadTime', 'memoryUsage', 'responseTime', 'throughput', 'errors']
        } = options;

        const history = this.performanceHistory.get(modelName) || [];
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);

        return history
            .filter(entry => entry.timestamp >= cutoff)
            .map(entry => ({
                timestamp: entry.timestamp,
                ...Object.fromEntries(
                    metrics.map(metric => [metric, entry[metric]])
                )
            }));
    }

    cleanupHistory() {
        const cutoff = Date.now() - (this.historyLimit * 24 * 60 * 60 * 1000);
        
        for (const [modelName, history] of this.performanceHistory.entries()) {
            const filteredHistory = history.filter(entry => entry.timestamp >= cutoff);
            if (filteredHistory.length !== history.length) {
                this.performanceHistory.set(modelName, filteredHistory);
            }
        }

        this.saveToPersistence();
    }

    notifyIssues(modelName, issues) {
        const event = {
            type: 'predictive_issues',
            model: modelName,
            issues,
            timestamp: Date.now()
        };

        window.debugLogger.warn('model_predictive', `Issues detected for ${modelName}`, {
            issues
        });

        this.listeners.forEach(callback => callback(event));
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    static getInstance() {
        if (!ModelPredictiveService.instance) {
            ModelPredictiveService.instance = new ModelPredictiveService();
        }
        return ModelPredictiveService.instance;
    }
}

// Export singleton instance
window.modelPredictiveService = ModelPredictiveService.getInstance();
