class LoadingManager {
    constructor() {
        if (LoadingManager.instance) {
            return LoadingManager.instance;
        }
        LoadingManager.instance = this;

        this.loadingStates = new Map();
        this.listeners = new Set();
        this.overlay = null;

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

            // Create loading overlay
            this.createLoadingOverlay();

            // Subscribe to global state changes
            window.globalStateService.addListener(state => {
                if (state.loading) {
                    this.showOverlay();
                } else {
                    this.hideOverlay();
                }
            });

            window.debugLogger.info('loading_manager', 'Loading manager initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize loading manager:', error);
            return false;
        }
    }

    createLoadingOverlay() {
        // Create loading overlay element if it doesn't exist
        if (!this.overlay) {
            this.overlay = document.createElement('div');
            this.overlay.className = 'loading-overlay';
            this.overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            `;

            // Create spinner
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            spinner.style.cssText = `
                width: 50px;
                height: 50px;
                border: 5px solid #f3f3f3;
                border-top: 5px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            `;

            // Add spinner animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);

            // Add spinner to overlay
            this.overlay.appendChild(spinner);

            // Add overlay to body when ready
            if (document.body) {
                document.body.appendChild(this.overlay);
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.body.appendChild(this.overlay);
                });
            }
        }
    }

    showOverlay() {
        if (this.overlay) {
            this.overlay.style.display = 'flex';
        }
    }

    hideOverlay() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
    }

    startLoading(id, message = '') {
        this.loadingStates.set(id, {
            message,
            timestamp: Date.now()
        });

        // Update global state
        window.globalStateService.setState({
            loading: true
        });

        // Notify listeners
        this.notifyListeners();

        // Log loading start
        window.debugLogger.debug('loading_manager', `Loading started: ${id}`, {
            id,
            message,
            activeLoadings: this.loadingStates.size
        });
    }

    stopLoading(id) {
        this.loadingStates.delete(id);

        // Update global state if no more loading states
        if (this.loadingStates.size === 0) {
            window.globalStateService.setState({
                loading: false
            });
        }

        // Notify listeners
        this.notifyListeners();

        // Log loading stop
        window.debugLogger.debug('loading_manager', `Loading stopped: ${id}`, {
            id,
            activeLoadings: this.loadingStates.size
        });
    }

    isLoading(id) {
        return this.loadingStates.has(id);
    }

    getLoadingStates() {
        return Array.from(this.loadingStates.entries()).map(([id, state]) => ({
            id,
            ...state
        }));
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners() {
        const states = this.getLoadingStates();
        this.listeners.forEach(callback => {
            try {
                callback(states);
            } catch (error) {
                window.debugLogger.error('loading_manager', 'Error in loading listener', error);
            }
        });
    }

    static getInstance() {
        if (!LoadingManager.instance) {
            LoadingManager.instance = new LoadingManager();
        }
        return LoadingManager.instance;
    }
}

// Initialize and export loading manager
window.LoadingManager = LoadingManager;
window.loadingManager = LoadingManager.getInstance();
