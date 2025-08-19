class ErrorBoundary {
    constructor() {
        if (ErrorBoundary.instance) {
            return ErrorBoundary.instance;
        }
        ErrorBoundary.instance = this;

        this.errors = new Map();
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

            // Set up global error handlers
            this.setupGlobalHandlers();

            window.debugLogger.info('error_boundary', 'Error boundary initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize error boundary:', error);
            return false;
        }
    }

    setupGlobalHandlers() {
        // Handle uncaught errors
        window.onerror = (message, source, line, column, error) => {
            this.handleError('uncaught', error || new Error(message), {
                source,
                line,
                column
            });
        };

        // Handle unhandled promise rejections
        window.onunhandledrejection = event => {
            this.handleError('unhandled_promise', event.reason);
        };

        // Handle service worker errors
        if (navigator.serviceWorker) {
            navigator.serviceWorker.addEventListener('error', event => {
                this.handleError('service_worker', event.error);
            });
        }
    }

    handleError(type, error, info = {}) {
        try {
            // Generate error ID
            const errorId = Date.now().toString();

            // Create error record
            const errorRecord = {
                id: errorId,
                type,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                },
                info,
                timestamp: new Date(),
                handled: false
            };

            // Store error
            this.errors.set(errorId, errorRecord);

            // Log error
            window.debugLogger.error('error_boundary', `Error caught: ${error.message}`, {
                type,
                error,
                info
            });

            // Show error UI
            this.showError(errorRecord);

            // Notify listeners
            this.notifyListeners(errorRecord);

            return errorId;
        } catch (handlingError) {
            console.error('Failed to handle error:', handlingError);
            return null;
        }
    }

    showError(errorRecord) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-boundary';
        errorElement.innerHTML = `
            <div class="error-content">
                <h2>An error occurred</h2>
                <p>${errorRecord.error.message}</p>
                ${errorRecord.info.source ? `<p>Source: ${errorRecord.info.source}</p>` : ''}
                ${errorRecord.info.line ? `<p>Line: ${errorRecord.info.line}</p>` : ''}
                <button onclick="window.errorBoundary.dismissError('${errorRecord.id}')">Dismiss</button>
                <button onclick="location.reload()">Reload Page</button>
            </div>
        `;

        // Add styles if not already added
        if (!document.querySelector('#error-boundary-styles')) {
            const style = document.createElement('style');
            style.id = 'error-boundary-styles';
            style.textContent = `
                .error-boundary {
                    position: fixed;
                    top: 16px;
                    right: 16px;
                    background: #1E1E1E;
                    border: 1px solid #FF5555;
                    border-radius: 8px;
                    padding: 16px;
                    max-width: 400px;
                    z-index: 10000;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }

                .error-content {
                    color: #FFF;
                }

                .error-content h2 {
                    color: #FF5555;
                    margin: 0 0 8px;
                    font-size: 16px;
                }

                .error-content p {
                    margin: 8px 0;
                    font-size: 14px;
                }

                .error-content button {
                    background: #333;
                    border: none;
                    color: #FFF;
                    padding: 8px 16px;
                    margin: 8px 8px 0 0;
                    border-radius: 4px;
                    cursor: pointer;
                }

                .error-content button:hover {
                    background: #444;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(errorElement);
    }

    dismissError(errorId) {
        // Remove error UI
        const errorElement = document.querySelector(`.error-boundary[data-error-id="${errorId}"]`);
        if (errorElement) {
            errorElement.remove();
        }

        // Mark error as handled
        const errorRecord = this.errors.get(errorId);
        if (errorRecord) {
            errorRecord.handled = true;
            this.notifyListeners(errorRecord);
        }
    }

    getErrors(options = {}) {
        const {
            type,
            handled,
            limit
        } = options;

        let errors = Array.from(this.errors.values());

        if (type) {
            errors = errors.filter(e => e.type === type);
        }

        if (handled !== undefined) {
            errors = errors.filter(e => e.handled === handled);
        }

        errors.sort((a, b) => b.timestamp - a.timestamp);

        if (limit) {
            errors = errors.slice(0, limit);
        }

        return errors;
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(errorRecord) {
        this.listeners.forEach(callback => {
            try {
                callback(errorRecord);
            } catch (error) {
                window.debugLogger.error('error_boundary', 'Error in error listener', error);
            }
        });
    }

    static getInstance() {
        if (!ErrorBoundary.instance) {
            ErrorBoundary.instance = new ErrorBoundary();
        }
        return ErrorBoundary.instance;
    }
}

// Initialize and export error boundary
window.ErrorBoundary = ErrorBoundary;
window.errorBoundary = ErrorBoundary.getInstance();
