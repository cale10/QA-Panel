class NavigationService {
    constructor() {
        if (NavigationService.instance) {
            return NavigationService.instance;
        }
        NavigationService.instance = this;

        this.routes = new Map();
        this.currentRoute = null;
        this.history = [];
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
            // Ensure required services with fallbacks
            if (!window.debugLogger) {
                console.warn('Debug logger not initialized, using console fallback');
            }

            // Register default routes
            this.registerRoute('questions', {
                id: 'questions',
                title: 'Questions',
                icon: '❓',
                shortcut: 'Alt+Q',
                component: 'QuestionAnswer'
            });

            this.registerRoute('ai', {
                id: 'ai',
                title: 'AI',
                icon: '🤖',
                shortcut: 'Alt+A',
                component: 'AIToggle'
            });

            this.registerRoute('capture', {
                id: 'capture',
                title: 'Capture',
                icon: '📸',
                shortcut: 'Alt+C',
                component: 'CaptureToggle'
            });

            this.registerRoute('custom', {
                id: 'custom',
                title: 'Custom',
                icon: '⚡',
                shortcut: 'Alt+F',
                component: 'CustomFeaturesPanel'
            });

            this.registerRoute('settings', {
                id: 'settings',
                title: 'Settings',
                icon: '⚙️',
                shortcut: 'Alt+S',
                component: 'SettingsModal'
            });

            // Model Compatibility route
            this.registerRoute('compatibility', {
                id: 'compatibility',
                title: 'Model Compatibility',
                icon: '🧪',
                shortcut: 'Alt+M',
                component: 'ModelCompatibilityPanel'
            });


            // Set initial route safely
            try {
                this.navigate('questions');
            } catch (error) {
                console.error('Failed to navigate to initial route:', error);
            }

            // Handle keyboard shortcuts
            document.addEventListener('keydown', event => {
                try {
                    const route = Array.from(this.routes.values()).find(r => {
                        if (!r.shortcut) return false;
                        const keys = r.shortcut.toLowerCase().split('+');
                        return keys.every(key => {
                            switch (key) {
                                case 'alt': return event.altKey;
                                case 'ctrl': return event.ctrlKey;
                                case 'shift': return event.shiftKey;
                                default: return event.key.toLowerCase() === key;
                            }
                        });
                    });

                    if (route) {
                        event.preventDefault();
                        this.navigate(route.id);
                    }
                } catch (error) {
                    console.error('Error in keyboard shortcut handler:', error);
                }
            });

            console.info('Navigation service initialized');
            if (window.debugLogger) {
                window.debugLogger.info('navigation', 'Navigation service initialized');
            }
            return true;
        } catch (error) {
            console.error('Failed to initialize navigation service:', error);
            return false;
        }
    }

    registerRoute(id, config) {
        try {
            if (this.routes.has(id)) {
                console.warn(`Route ${id} already registered`);
                if (window.debugLogger) {
                    window.debugLogger.warn('navigation', `Route ${id} already registered`);
                }
                return false;
            }

            this.routes.set(id, {
                id,
                ...config
            });

            console.debug(`Route registered: ${id}`, config);
            if (window.debugLogger) {
                window.debugLogger.debug('navigation', `Route registered: ${id}`, config);
            }
            return true;
        } catch (error) {
            console.error(`Failed to register route ${id}:`, error);
            return false;
        }
    }

    navigate(routeId) {
        try {
            const route = this.routes.get(routeId);
            if (!route) {
                console.error(`Invalid route: ${routeId}`);
                if (window.debugLogger) {
                    window.debugLogger.error('navigation', `Invalid route: ${routeId}`);
                }
                return false;
            }

            const oldRoute = this.currentRoute;
            this.currentRoute = routeId;
            this.history.push({
                route: routeId,
                timestamp: Date.now()
            });

            // Update global state if available
            if (window.globalStateService) {
                try {
                    window.globalStateService.setState({
                        currentRoute: routeId
                    });
                } catch (error) {
                    console.error('Failed to update global state:', error);
                }
            }

            // Notify listeners
            this.notifyListeners(oldRoute);

            console.debug(`Navigated to: ${routeId}`, {
                from: oldRoute,
                to: routeId
            });
            if (window.debugLogger) {
                window.debugLogger.debug('navigation', `Navigated to: ${routeId}`, {
                    from: oldRoute,
                    to: routeId
                });
            }

            return true;
        } catch (error) {
            console.error(`Failed to navigate to ${routeId}:`, error);
            return false;
        }
    }

    getCurrentRoute() {
        return this.currentRoute;
    }

    getRoutes() {
        return Array.from(this.routes.values());
    }

    getHistory() {
        return [...this.history];
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(oldRoute) {
        this.listeners.forEach(callback => {
            try {
                callback(this.currentRoute, oldRoute);
            } catch (error) {
                console.error('Error in navigation listener:', error);
                if (window.debugLogger) {
                    window.debugLogger.error('navigation', 'Error in navigation listener', error);
                }
            }
        });
    }

    static getInstance() {
        if (!NavigationService.instance) {
            NavigationService.instance = new NavigationService();
        }
        return NavigationService.instance;
    }
}

// Initialize and export navigation service
window.NavigationService = NavigationService;
window.navigationService = NavigationService.getInstance();
