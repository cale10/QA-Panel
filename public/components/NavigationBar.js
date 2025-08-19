class NavigationBar {
    constructor() {
        if (NavigationBar.instance) {
            return NavigationBar.instance;
        }
        NavigationBar.instance = this;

        this.element = null;
        this.routes = [];

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
            if (!window.navigationService) {
                throw new Error('Navigation service not initialized');
            }

            // Create navigation bar
            this.createNavBar();

            // Subscribe to navigation changes
            window.navigationService.addListener(() => {
                this.updateActiveRoute();
            });

            window.debugLogger.info('navigation_bar', 'Navigation bar initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize navigation bar:', error);
            return false;
        }
    }

    createNavBar() {
        // Create navigation bar if it doesn't exist
        if (!this.element) {
            this.element = document.createElement('nav');
            this.element.className = 'navigation-bar';
            
            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .navigation-bar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    background: #1E1E1E;
                    border-bottom: 1px solid #3c3c3c;
                    z-index: 100;
                }

                .nav-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 16px;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .nav-routes {
                    display: flex;
                    gap: 8px;
                }

                .nav-route {
                    padding: 8px 12px;
                    color: #888;
                    text-decoration: none;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 200ms ease;
                }

                .nav-route:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: #fff;
                }

                .nav-route.active {
                    background: rgba(78, 201, 176, 0.1);
                    color: #4EC9B0;
                }

                .nav-route-icon {
                    font-size: 16px;
                }

                .nav-route-shortcut {
                    color: #666;
                    font-size: 11px;
                    margin-left: 4px;
                }
            `;
            document.head.appendChild(style);

            // Create content container
            const content = document.createElement('div');
            content.className = 'nav-content';
            this.element.appendChild(content);

            // Create routes container
            const routes = document.createElement('div');
            routes.className = 'nav-routes';
            content.appendChild(routes);

            // Add to body when ready
            if (document.body) {
                document.body.insertBefore(this.element, document.body.firstChild);
                this.updateRoutes();
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.body.insertBefore(this.element, document.body.firstChild);
                    this.updateRoutes();
                });
            }
        }
    }

    updateRoutes() {
        const routesContainer = this.element.querySelector('.nav-routes');
        if (!routesContainer) return;

        const routes = window.navigationService.getRoutes();
        const currentRoute = window.navigationService.getCurrentRoute();

        routesContainer.innerHTML = routes.map(route => `
            <div 
                class="nav-route ${route.id === currentRoute ? 'active' : ''}"
                data-route="${route.id}"
                title="${route.title}"
            >
                <span class="nav-route-icon">${route.icon}</span>
                <span class="nav-route-title">${route.title}</span>
                ${route.shortcut ? `<span class="nav-route-shortcut">${route.shortcut}</span>` : ''}
            </div>
        `).join('');

        // Add click handlers
        routesContainer.querySelectorAll('.nav-route').forEach(el => {
            el.addEventListener('click', () => {
                const route = el.dataset.route;
                window.navigationService.navigate(route);
            });
        });
    }

    updateActiveRoute() {
        if (!this.element) return;

        const currentRoute = window.navigationService.getCurrentRoute();
        this.element.querySelectorAll('.nav-route').forEach(el => {
            if (el.dataset.route === currentRoute) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }

    static getInstance() {
        if (!NavigationBar.instance) {
            NavigationBar.instance = new NavigationBar();
        }
        return NavigationBar.instance;
    }
}

// Initialize and export navigation bar
window.NavigationBar = NavigationBar;
window.navigationBar = NavigationBar.getInstance();
