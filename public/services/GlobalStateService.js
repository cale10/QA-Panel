class GlobalStateService {
    constructor() {
        if (GlobalStateService.instance) {
            return GlobalStateService.instance;
        }
        GlobalStateService.instance = this;

        this.state = {
            initialized: false,
            loading: false,
            error: null,
            activeContext: null,
            accessibilityMode: false,
            theme: 'dark',
            aiEnabled: false,
            captureEnabled: false,
            customFeaturesEnabled: false,
            shortcuts: {},
            settings: {}
        };

        this.listeners = new Set();

        // Wait for DOM to be ready before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        try {
            // Ensure debug logger is ready
            if (!window.debugLogger) {
                console.warn('Debug logger not initialized, using console fallback');
            }

            // Ensure event bus is ready
            if (!window.eventBusService) {
                console.warn('Event bus not initialized, some features may not work');
            }

            // Load saved state from electron store
            if (window.electronAPI && window.electronAPI.getSetting) {
                window.electronAPI.getSetting('globalState').then(savedState => {
                    if (savedState) {
                        this.state = {
                            ...this.state,
                            ...savedState,
                            initialized: true,
                            loading: false,
                            error: null
                        };
                        this.notifyListeners();
                    }
                }).catch(error => {
                    console.error('Failed to load saved state:', error);
                    if (window.debugLogger) {
                        window.debugLogger.error('global_state', 'Failed to load saved state', error);
                    }
                });
            }

            // Subscribe to events that affect global state
            if (window.eventBusService) {
                window.eventBusService.subscribe('context_changed', context => {
                    this.setState({ activeContext: context });
                });

                window.eventBusService.subscribe('accessibility_changed', enabled => {
                    this.setState({ accessibilityMode: enabled });
                });

                window.eventBusService.subscribe('theme_changed', theme => {
                    this.setState({ theme });
                });

                window.eventBusService.subscribe('ai_state_changed', enabled => {
                    this.setState({ aiEnabled: enabled });
                });

                window.eventBusService.subscribe('capture_state_changed', enabled => {
                    this.setState({ captureEnabled: enabled });
                });

                window.eventBusService.subscribe('custom_features_changed', enabled => {
                    this.setState({ customFeaturesEnabled: enabled });
                });
            }

            console.info('Global state service initialized');
            if (window.debugLogger) {
                window.debugLogger.info('global_state', 'Global state service initialized');
            }
            return true;
        } catch (error) {
            console.error('Failed to initialize global state:', error);
            if (window.debugLogger) {
                window.debugLogger.error('global_state', 'Failed to initialize global state', error);
            }
            this.state.error = error.message;
            return false;
        }
    }

    setState(updates) {
        try {
            const oldState = { ...this.state };
            this.state = {
                ...this.state,
                ...updates
            };

            // Save state to electron store
            if (window.electronAPI && window.electronAPI.setSetting) {
                window.electronAPI.setSetting('globalState', this.state).catch(error => {
                    console.error('Failed to save state:', error);
                    if (window.debugLogger) {
                        window.debugLogger.error('global_state', 'Failed to save state', error);
                    }
                });
            }

            // Notify listeners
            this.notifyListeners(oldState);

            // Log state change
            console.debug('State updated:', updates);
            if (window.debugLogger) {
                window.debugLogger.debug('global_state', 'State updated', {
                    updates,
                    oldState,
                    newState: this.state
                });
            }
        } catch (error) {
            console.error('Error in setState:', error);
            if (window.debugLogger) {
                window.debugLogger.error('global_state', 'Error in setState', error);
            }
        }
    }

    getState() {
        return { ...this.state };
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(oldState) {
        this.listeners.forEach(callback => {
            try {
                callback(this.state, oldState);
            } catch (error) {
                console.error('Error in state listener:', error);
                if (window.debugLogger) {
                    window.debugLogger.error('global_state', 'Error in state listener', error);
                }
            }
        });
    }

    static getInstance() {
        if (!GlobalStateService.instance) {
            GlobalStateService.instance = new GlobalStateService();
        }
        return GlobalStateService.instance;
    }
}

// Initialize and export global state service
window.GlobalStateService = GlobalStateService;
window.globalStateService = GlobalStateService.getInstance();
