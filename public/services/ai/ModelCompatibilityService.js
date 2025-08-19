class ModelCompatibilityService {
    constructor() {
        if (ModelCompatibilityService.instance) {
            return ModelCompatibilityService.instance;
        }
        ModelCompatibilityService.instance = this;

        this.compatibilityCache = new Map();
        this.systemRequirements = new Map();
        this.platformInfo = null;
        this.listeners = new Set();

        // Load saved data
        this.loadSavedData();
        
        // Get platform info
        this.initializePlatformInfo();

        window.debugLogger.info('model_compatibility', 'Compatibility service initialized');
    }

    loadSavedData() {
        try {
            // Load system requirements
            const savedRequirements = localStorage.getItem('model_system_requirements');
            if (savedRequirements) {
                this.systemRequirements = new Map(JSON.parse(savedRequirements));
            }

            // Load compatibility cache
            const savedCache = localStorage.getItem('model_compatibility_cache');
            if (savedCache) {
                this.compatibilityCache = new Map(JSON.parse(savedCache));
            }

            window.debugLogger.debug('model_compatibility', 'Saved data loaded', {
                requirements: this.systemRequirements.size,
                cache: this.compatibilityCache.size
            });
        } catch (error) {
            window.debugLogger.error('model_compatibility', 'Failed to load saved data', error);
        }
    }

    saveToPersistence() {
        try {
            localStorage.setItem('model_system_requirements',
                JSON.stringify(Array.from(this.systemRequirements.entries()))
            );
            localStorage.setItem('model_compatibility_cache',
                JSON.stringify(Array.from(this.compatibilityCache.entries()))
            );
        } catch (error) {
            window.debugLogger.error('model_compatibility', 'Failed to save data', error);
        }
    }

    async initializePlatformInfo() {
        try {
            // Get system info from electron
            const systemInfo = await window.electronAPI.getSystemInfo();
            const gpuInfo = await window.electronAPI.getGPUInfo();

            this.platformInfo = {
                os: systemInfo.os,
                arch: systemInfo.arch,
                cpuCores: systemInfo.cpuCores,
                totalMemory: systemInfo.totalMemory,
                gpuModel: gpuInfo.model,
                gpuMemory: gpuInfo.memory,
                runtime: {
                    node: process.versions.node,
                    electron: process.versions.electron,
                    chrome: process.versions.chrome
                }
            };

            window.debugLogger.debug('model_compatibility', 'Platform info initialized', this.platformInfo);
        } catch (error) {
            window.debugLogger.error('model_compatibility', 'Failed to get platform info', error);
            this.platformInfo = null;
        }
    }

    async checkCompatibility(modelName, options = {}) {
        const {
            force = false,
            detailed = false
        } = options;

        try {
            const cacheKey = `${modelName}-${detailed}`;
            if (!force && this.compatibilityCache.has(cacheKey)) {
                return this.compatibilityCache.get(cacheKey);
            }

            window.debugLogger.debug('model_compatibility', `Checking compatibility for ${modelName}`, options);

            // Get model info
            const modelInfo = await window.ollamaService.getModelInfo(modelName);
            
            // Get system requirements
            const requirements = this.getSystemRequirements(modelName);

            // Check platform compatibility
            const platformCheck = await this.checkPlatformCompatibility(modelName, requirements);

            // Check resource requirements
            const resourceCheck = await this.checkResourceRequirements(modelName, requirements);

            // Check runtime environment
            const runtimeCheck = await this.checkRuntimeEnvironment(modelName, requirements);

            // Check version constraints
            const versionCheck = await this.checkVersionConstraints(modelName, modelInfo);

            // Analyze dependency graph
            const dependencyCheck = await this.analyzeDependencyGraph(modelName);

            const result = {
                compatible: platformCheck.compatible && 
                           resourceCheck.compatible && 
                           runtimeCheck.compatible && 
                           versionCheck.compatible && 
                           dependencyCheck.compatible,
                platform: platformCheck,
                resources: resourceCheck,
                runtime: runtimeCheck,
                version: versionCheck,
                dependencies: dependencyCheck,
                timestamp: Date.now()
            };

            // Cache the result
            this.compatibilityCache.set(cacheKey, result);
            this.saveToPersistence();

            // Notify listeners
            this.notifyListeners({
                type: 'compatibility_check',
                model: modelName,
                result: detailed ? result : { compatible: result.compatible }
            });

            return detailed ? result : { compatible: result.compatible };
        } catch (error) {
            window.debugLogger.error('model_compatibility', `Failed to check compatibility for ${modelName}`, error);
            throw error;
        }
    }

    async checkPlatformCompatibility(modelName, requirements) {
        if (!this.platformInfo) {
            return {
                compatible: false,
                error: 'Platform information not available'
            };
        }

        const platformReqs = requirements?.platform || {};
        const issues = [];

        // Check OS compatibility
        if (platformReqs.os && !platformReqs.os.includes(this.platformInfo.os)) {
            issues.push(`Unsupported operating system: ${this.platformInfo.os}`);
        }

        // Check architecture compatibility
        if (platformReqs.arch && !platformReqs.arch.includes(this.platformInfo.arch)) {
            issues.push(`Unsupported architecture: ${this.platformInfo.arch}`);
        }

        // Check GPU requirements
        if (platformReqs.gpu) {
            if (!this.platformInfo.gpuModel) {
                issues.push('GPU information not available');
            } else if (platformReqs.gpu.required && !this.platformInfo.gpuModel) {
                issues.push('GPU required but not available');
            }
        }

        return {
            compatible: issues.length === 0,
            issues,
            platform: this.platformInfo
        };
    }

    async checkResourceRequirements(modelName, requirements) {
        const resourceReqs = requirements?.resources || {};
        const issues = [];

        // Check memory requirements
        if (resourceReqs.memory) {
            const availableMemory = this.platformInfo?.totalMemory || 0;
            if (availableMemory < resourceReqs.memory) {
                issues.push(`Insufficient memory: ${availableMemory}GB available, ${resourceReqs.memory}GB required`);
            }
        }

        // Check disk space
        if (resourceReqs.diskSpace) {
            const diskSpace = await window.electronAPI.getDiskSpace();
            if (diskSpace.free < resourceReqs.diskSpace) {
                issues.push(`Insufficient disk space: ${diskSpace.free}GB available, ${resourceReqs.diskSpace}GB required`);
            }
        }

        // Check CPU requirements
        if (resourceReqs.cpuCores) {
            const availableCores = this.platformInfo?.cpuCores || 0;
            if (availableCores < resourceReqs.cpuCores) {
                issues.push(`Insufficient CPU cores: ${availableCores} available, ${resourceReqs.cpuCores} required`);
            }
        }

        return {
            compatible: issues.length === 0,
            issues,
            available: {
                memory: this.platformInfo?.totalMemory,
                cpuCores: this.platformInfo?.cpuCores,
                diskSpace: (await window.electronAPI.getDiskSpace()).free
            }
        };
    }

    async checkRuntimeEnvironment(modelName, requirements) {
        const runtimeReqs = requirements?.runtime || {};
        const issues = [];

        // Check Node.js version
        if (runtimeReqs.node) {
            const currentNode = process.versions.node;
            if (!this.checkVersionConstraint(currentNode, runtimeReqs.node)) {
                issues.push(`Incompatible Node.js version: ${currentNode}`);
            }
        }

        // Check Electron version
        if (runtimeReqs.electron) {
            const currentElectron = process.versions.electron;
            if (!this.checkVersionConstraint(currentElectron, runtimeReqs.electron)) {
                issues.push(`Incompatible Electron version: ${currentElectron}`);
            }
        }

        return {
            compatible: issues.length === 0,
            issues,
            runtime: this.platformInfo?.runtime
        };
    }

    async checkVersionConstraints(modelName, modelInfo) {
        const requirements = this.getSystemRequirements(modelName);
        const versionReqs = requirements?.versions || {};
        const issues = [];

        // Check model version constraints
        if (versionReqs.model) {
            const currentVersion = modelInfo.version;
            if (!this.checkSemverConstraint(currentVersion, versionReqs.model)) {
                issues.push(`Incompatible model version: ${currentVersion}`);
            }
        }

        // Check Ollama server version (e.g., ">=0.3.10")
        if (versionReqs.ollama) {
            try {
                const res = await fetch('http://localhost:11434/api/version');
                if (res.ok) {
                    const { version } = await res.json();
                    const normalized = (version || '').replace(/^v/i, '');
                    if (!this.checkSemverConstraint(normalized, versionReqs.ollama)) {
                        issues.push(`Ollama ${normalized} does not satisfy ${versionReqs.ollama}`);
                    }
                } else {
                    issues.push('Unable to query Ollama server version');
                }
            } catch (e) {
                issues.push('Failed to contact Ollama server for version check');
            }
        }

        // Check dependencies version constraints
        if (versionReqs.dependencies) {
            for (const [dep, constraint] of Object.entries(versionReqs.dependencies)) {
                const depInfo = await window.ollamaService.getModelInfo(dep);
                if (!this.checkSemverConstraint(depInfo.version, constraint)) {
                    issues.push(`Incompatible dependency version: ${dep} ${depInfo.version}`);
                }
            }
        }

        return {
            compatible: issues.length === 0,
            issues,
            version: modelInfo.version
        };
    }

    async analyzeDependencyGraph(modelName) {
        try {
            const graph = new Map();
            const issues = [];
            const visited = new Set();

            const analyze = async (name, path = []) => {
                if (path.includes(name)) {
                    issues.push(`Circular dependency detected: ${path.join(' -> ')} -> ${name}`);
                    return;
                }

                if (visited.has(name)) return;
                visited.add(name);

                const deps = window.modelUpdateService.getDependencies(name);
                graph.set(name, deps);

                for (const dep of deps) {
                    await analyze(dep, [...path, name]);
                }
            };

            await analyze(modelName);

            // Check for missing dependencies
            for (const [model, deps] of graph.entries()) {
                for (const dep of deps) {
                    try {
                        await window.ollamaService.getModelInfo(dep);
                    } catch {
                        issues.push(`Missing dependency: ${model} requires ${dep}`);
                    }
                }
            }

            return {
                compatible: issues.length === 0,
                issues,
                graph: Object.fromEntries(graph)
            };
        } catch (error) {
            window.debugLogger.error('model_compatibility', `Failed to analyze dependency graph for ${modelName}`, error);
            return {
                compatible: false,
                issues: [error.message],
                graph: {}
            };
        }
    }

    checkVersionConstraint(version, constraint) {
        // Simple version comparison for now
        // TODO: Implement proper semver comparison
        return version >= constraint;
    }

    setSystemRequirements(modelName, requirements) {
        this.systemRequirements.set(modelName, requirements);
        this.saveToPersistence();

        // Clear cache for this model
        for (const key of this.compatibilityCache.keys()) {
            if (key.startsWith(modelName)) {
                this.compatibilityCache.delete(key);
            }
        }
    }

    getSystemRequirements(modelName) {
        const existing = this.systemRequirements.get(modelName);
        if (existing) return existing;

        // Built-in defaults for known models
        const lower = (modelName || '').toLowerCase();
        if (lower.startsWith('minicpm-v')) {
            // MiniCPM-V requires Ollama >= 0.3.10 for vision/image input support
            return {
                platform: { os: ['Windows_NT','Linux','Darwin'], arch: ['x64','arm64'] },
                resources: { memory: 8, cpuCores: 4 },
                runtime: {},
                versions: { ollama: '>=0.3.10' }
            };
        }

        return {
            platform: {},
            resources: {},
            runtime: {},
            versions: {}
        };
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(event) {
        this.listeners.forEach(callback => callback(event));
    }

    static getInstance() {
        if (!ModelCompatibilityService.instance) {
            ModelCompatibilityService.instance = new ModelCompatibilityService();
        }
        return ModelCompatibilityService.instance;
    }
}

// Export singleton instance
window.modelCompatibilityService = ModelCompatibilityService.getInstance();
