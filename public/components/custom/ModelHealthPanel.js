class ModelHealthPanel {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'model-health-panel';
        this.isVisible = false;
        this.createPanel();
        this.setupEventListeners();

        // Listen for health issues
        window.modelHealthService.addListener(event => {
            if (event.type === 'health_issue') {
                this.showHealthNotification(event);
            }
        });
    }

    createPanel() {
        this.element.innerHTML = `
            <div class="health-panel-header">
                <h3>Model Health Monitor</h3>
                <div class="header-actions">
                    <button class="refresh-btn" title="Refresh health metrics">↻</button>
                    <button class="close-btn">×</button>
                </div>
            </div>
            <div class="health-panel-content">
                <div class="system-resources">
                    <h4>System Resources</h4>
                    <div class="resource-metrics">
                        <div class="disk-space">
                            <label>Disk Space:</label>
                            <div class="progress-bar">
                                <div class="progress-fill"></div>
                            </div>
                            <span class="disk-info">Loading...</span>
                        </div>
                        <div class="memory-usage">
                            <label>Memory Usage:</label>
                            <div class="progress-bar">
                                <div class="progress-fill"></div>
                            </div>
                            <span class="memory-info">Loading...</span>
                        </div>
                    </div>
                </div>
                <div class="model-metrics">
                    <h4>Model Health</h4>
                    <div class="metrics-filters">
                        <select class="status-filter">
                            <option value="all">All Status</option>
                            <option value="healthy">Healthy</option>
                            <option value="warning">Warning</option>
                            <option value="error">Error</option>
                        </select>
                        <input type="text" class="search-filter" placeholder="Search models...">
                    </div>
                    <div class="metrics-list"></div>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .model-health-panel {
                position: fixed;
                top: 50%;
                right: 20px;
                transform: translateY(-50%);
                width: 400px;
                max-height: 80vh;
                background: #1E1E1E;
                border: 1px solid #3c3c3c;
                border-radius: 8px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
                z-index: 2000;
                display: none;
                opacity: 0;
                transition: opacity 200ms ease;
            }

            .health-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                border-bottom: 1px solid #3c3c3c;
            }

            .health-panel-header h3 {
                margin: 0;
                color: #fff;
                font-size: 16px;
            }

            .header-actions {
                display: flex;
                gap: 8px;
            }

            .refresh-btn, .close-btn {
                background: none;
                border: none;
                color: #888;
                font-size: 18px;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
            }

            .refresh-btn:hover, .close-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }

            .health-panel-content {
                padding: 16px;
                overflow-y: auto;
                max-height: calc(80vh - 60px);
            }

            .system-resources {
                margin-bottom: 24px;
            }

            .system-resources h4, .model-metrics h4 {
                margin: 0 0 12px 0;
                color: #4EC9B0;
                font-size: 14px;
            }

            .resource-metrics {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .disk-space, .memory-usage {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .disk-space label, .memory-usage label {
                color: #888;
                font-size: 12px;
            }

            .progress-bar {
                height: 4px;
                background: #252525;
                border-radius: 2px;
                overflow: hidden;
            }

            .progress-fill {
                height: 100%;
                width: 0%;
                background: #4EC9B0;
                transition: width 200ms ease;
            }

            .disk-info, .memory-info {
                color: #888;
                font-size: 12px;
            }

            .metrics-filters {
                display: flex;
                gap: 8px;
                margin-bottom: 16px;
            }

            .status-filter, .search-filter {
                padding: 6px 12px;
                background: #252525;
                border: 1px solid #3c3c3c;
                border-radius: 4px;
                color: #fff;
                font-size: 12px;
            }

            .metrics-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .metric-item {
                padding: 12px;
                background: #252525;
                border: 1px solid #3c3c3c;
                border-radius: 4px;
            }

            .metric-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .model-name {
                color: #fff;
                font-size: 14px;
            }

            .model-status {
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
                text-transform: uppercase;
            }

            .model-status.healthy {
                background: rgba(78, 201, 176, 0.2);
                color: #4EC9B0;
            }

            .model-status.warning {
                background: rgba(255, 217, 61, 0.2);
                color: #ffd93d;
            }

            .model-status.error {
                background: rgba(255, 107, 107, 0.2);
                color: #ff6b6b;
            }

            .metric-details {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 8px;
                font-size: 12px;
            }

            .metric-value {
                color: #888;
            }

            .metric-value strong {
                color: #fff;
            }

            .health-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #252525;
                border: 1px solid #3c3c3c;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                z-index: 2001;
                max-width: 300px;
                animation: slideIn 0.3s ease;
            }

            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            .health-notification h4 {
                margin: 0 0 8px 0;
                color: #ff6b6b;
            }

            .health-notification p {
                margin: 4px 0;
                color: #fff;
                font-size: 14px;
            }

            .notification-actions {
                display: flex;
                gap: 8px;
                margin-top: 12px;
            }

            .notification-actions button {
                flex: 1;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
            }

            .view-details-btn {
                background: #4EC9B0;
                color: #1E1E1E;
                border: none;
            }

            .dismiss-btn {
                background: none;
                border: 1px solid #3c3c3c;
                color: #888;
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        // Close button
        this.element.querySelector('.close-btn').addEventListener('click', () => {
            this.hide();
        });

        // Refresh button
        this.element.querySelector('.refresh-btn').addEventListener('click', async () => {
            await this.refreshMetrics();
        });

        // Status filter
        this.element.querySelector('.status-filter').addEventListener('change', () => {
            this.updateMetricsList();
        });

        // Search filter
        this.element.querySelector('.search-filter').addEventListener('input', () => {
            this.updateMetricsList();
        });
    }

    async show() {
        if (!this.isVisible) {
            document.body.appendChild(this.element);
            requestAnimationFrame(() => {
                this.element.style.display = 'block';
                this.element.offsetHeight; // Force reflow
                this.element.style.opacity = '1';
                this.isVisible = true;
            });

            await this.refreshMetrics();
        }
    }

    hide() {
        if (this.isVisible) {
            this.element.style.opacity = '0';
            setTimeout(() => {
                this.element.style.display = 'none';
                if (document.body.contains(this.element)) {
                    document.body.removeChild(this.element);
                }
                this.isVisible = false;
            }, 200);
        }
    }

    async refreshMetrics() {
        try {
            // Get system resources
            const resources = await window.modelHealthService.getSystemResources();
            this.updateResourceMetrics(resources);

            // Get model metrics
            await window.modelHealthService.checkAllModels();
            this.updateMetricsList();
        } catch (error) {
            window.debugLogger.error('model_health_panel', 'Failed to refresh metrics', error);
        }
    }

    updateResourceMetrics(resources) {
        // Update disk space
        const diskFill = this.element.querySelector('.disk-space .progress-fill');
        const diskInfo = this.element.querySelector('.disk-info');
        const diskPercentage = (1 - resources.diskSpace.freePercentage) * 100;
        
        diskFill.style.width = `${diskPercentage}%`;
        diskFill.style.background = diskPercentage > 90 ? '#ff6b6b' : '#4EC9B0';
        diskInfo.textContent = `${Math.round(resources.diskSpace.free / 1024 / 1024 / 1024)}GB free of ${Math.round(resources.diskSpace.total / 1024 / 1024 / 1024)}GB`;

        // Update memory usage
        const memoryFill = this.element.querySelector('.memory-usage .progress-fill');
        const memoryInfo = this.element.querySelector('.memory-info');
        const memoryPercentage = resources.memory.usagePercentage * 100;

        memoryFill.style.width = `${memoryPercentage}%`;
        memoryFill.style.background = memoryPercentage > 80 ? '#ff6b6b' : '#4EC9B0';
        memoryInfo.textContent = `${Math.round(resources.memory.used / 1024 / 1024)}MB used of ${Math.round(resources.memory.total / 1024 / 1024)}MB`;
    }

    updateMetricsList() {
        const metrics = window.modelHealthService.getAllHealthMetrics();
        const statusFilter = this.element.querySelector('.status-filter').value;
        const searchFilter = this.element.querySelector('.search-filter').value.toLowerCase();

        const filteredMetrics = metrics.filter(metric => {
            const matchesStatus = statusFilter === 'all' || metric.status === statusFilter;
            const matchesSearch = metric.model.toLowerCase().includes(searchFilter);
            return matchesStatus && matchesSearch;
        });

        const metricsList = this.element.querySelector('.metrics-list');
        metricsList.innerHTML = filteredMetrics.map(metric => `
            <div class="metric-item">
                <div class="metric-header">
                    <span class="model-name">${metric.model}</span>
                    <span class="model-status ${metric.status}">${metric.status}</span>
                </div>
                <div class="metric-details">
                    <div class="metric-value">
                        Load Time: <strong>${Math.round(metric.performance.loadTime)}ms</strong>
                    </div>
                    <div class="metric-value">
                        Memory: <strong>${Math.round(metric.performance.memoryUsage / 1024 / 1024)}MB</strong>
                    </div>
                    <div class="metric-value">
                        Response Time: <strong>${Math.round(metric.performance.responseTime)}ms</strong>
                    </div>
                    <div class="metric-value">
                        Throughput: <strong>${metric.performance.throughput}/s</strong>
                    </div>
                    ${metric.errors.length > 0 ? `
                        <div class="metric-value" style="grid-column: 1 / -1; color: #ff6b6b;">
                            Errors: <strong>${metric.errors.map(e => e.message).join(', ')}</strong>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    showHealthNotification(event) {
        const notification = document.createElement('div');
        notification.className = 'health-notification';
        notification.innerHTML = `
            <h4>Health Issue Detected</h4>
            <p>${event.message}</p>
            <p>Model: ${event.model}</p>
            <div class="notification-actions">
                <button class="view-details-btn">View Details</button>
                <button class="dismiss-btn">Dismiss</button>
            </div>
        `;

        // Add event listeners
        notification.querySelector('.view-details-btn').addEventListener('click', () => {
            this.show();
            document.body.removeChild(notification);
        });

        notification.querySelector('.dismiss-btn').addEventListener('click', () => {
            document.body.removeChild(notification);
        });

        document.body.appendChild(notification);

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 10000);
    }
}

// Export singleton instance
window.modelHealthPanel = new ModelHealthPanel();
