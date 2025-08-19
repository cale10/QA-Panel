class GlobalOverlay {
    constructor() {
        if (GlobalOverlay.instance) {
            return GlobalOverlay.instance;
        }
        GlobalOverlay.instance = this;

        this.element = null;
        this.content = null;

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

            // Create overlay
            this.createOverlay();

            // Subscribe to global state changes
            window.globalStateService.addListener(state => {
                if (state.overlay) {
                    this.show(state.overlay);
                } else {
                    this.hide();
                }
            });

            // Handle escape key
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape') {
                    this.hide();
                }
            });

            window.debugLogger.info('global_overlay', 'Global overlay initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize global overlay:', error);
            return false;
        }
    }

    createOverlay() {
        // Create overlay if it doesn't exist
        if (!this.element) {
            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .global-overlay {
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
                }

                .global-overlay.visible {
                    display: flex;
                }

                .global-overlay-content {
                    background: #1E1E1E;
                    border-radius: 8px;
                    padding: 24px;
                    max-width: 90%;
                    max-height: 90%;
                    overflow: auto;
                    position: relative;
                }

                .global-overlay-close {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: none;
                    border: none;
                    color: #888;
                    cursor: pointer;
                    font-size: 24px;
                    padding: 4px;
                    line-height: 1;
                }

                .global-overlay-close:hover {
                    color: #fff;
                }
            `;
            document.head.appendChild(style);

            // Create overlay element
            this.element = document.createElement('div');
            this.element.className = 'global-overlay';

            // Create content container
            this.content = document.createElement('div');
            this.content.className = 'global-overlay-content';
            this.element.appendChild(this.content);

            // Create close button
            const closeButton = document.createElement('button');
            closeButton.className = 'global-overlay-close';
            closeButton.innerHTML = '×';
            closeButton.addEventListener('click', () => this.hide());
            this.content.appendChild(closeButton);

            // Add click handler to close on background click
            this.element.addEventListener('click', event => {
                if (event.target === this.element) {
                    this.hide();
                }
            });

            // Add to body when ready
            if (document.body) {
                document.body.appendChild(this.element);
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.body.appendChild(this.element);
                });
            }
        }
    }

    show(content) {
        if (!this.element || !this.content) return;

        // Update content
        if (typeof content === 'string') {
            this.content.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            this.content.innerHTML = '';
            this.content.appendChild(content);
        }

        // Show overlay
        this.element.classList.add('visible');

        // Log event
        window.debugLogger.debug('global_overlay', 'Overlay shown');
    }

    hide() {
        if (!this.element) return;

        // Hide overlay
        this.element.classList.remove('visible');

        // Clear content after animation
        setTimeout(() => {
            if (this.content) {
                this.content.innerHTML = '';
            }
        }, 200);

        // Update global state
        window.globalStateService.setState({
            overlay: null
        });

        // Log event
        window.debugLogger.debug('global_overlay', 'Overlay hidden');
    }

    static getInstance() {
        if (!GlobalOverlay.instance) {
            GlobalOverlay.instance = new GlobalOverlay();
        }
        return GlobalOverlay.instance;
    }
}

// Initialize and export global overlay
window.GlobalOverlay = GlobalOverlay;
window.globalOverlay = GlobalOverlay.getInstance();
