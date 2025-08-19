class ModelDashboardPanel {
    // Previous methods remain the same...

    switchTab(tab) {
        this.activeTab = tab;

        // Update tab buttons
        this.element.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Update tab panels
        this.element.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.classList.contains(`${tab}-panel`));
        });

        // Refresh tab content
        switch (tab) {
            case 'overview':
                this.refreshOverview();
                break;
            case 'health':
                this.refreshHealthMetrics();
                break;
            case 'performance':
                this.refreshPerformanceMetrics();
                break;
            case 'resources':
                this.refreshResourceAllocations();
                break;
            case 'lifecycle':
                this.refreshLifecycleStates();
                break;
            case 'operations':
                this.refreshBatchOperations();
                break;
        }
    }

    async refreshOverview() {
        if (!this.selectedModels.size) return;

        // Get summaries for selected models
        const summaries = await Promise.all(
            Array.from(this.selectedModels).map(model => 
                window.modelManagementService.getModelSummary(model)
            )
        );

        // Update model stats
        const statsContent = this.element.querySelector('.stats-content');
        const stats = {
            total: this.selectedModels.size,
            healthy: summaries.filter(s => s.health.status === 'healthy').length,
            compatible: summaries.filter(s => s.compatibility.compatible).length,
            active: summaries.filter(s => s.lifecycle.status === 'active').length
        };

        statsContent.innerHTML = Object.entries(stats).map(([key, value]) => `
            <div class="stat-item">
                <div class="stat-label">${key.charAt(0).toUpperCase() + key.slice(1)}</div>
                <div class="stat-value">${value}</div>
            </div>
        `).join('');

        // Update health chart
        const healthCtx = this.element.querySelector('.health-chart').getContext('2d');
        let healthChart = this.charts.get('health');
        if (healthChart) {
            healthChart.destroy();
        }

        healthChart = new Chart(healthCtx, {
            type: 'bar',
            data: {
                labels: Array.from(this.selectedModels),
                datasets: [{
                    label: 'Health Score',
                    data: summaries.map(s => s.health.score),
                    backgroundColor: '#4EC9B0'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
        this.charts.set('health', healthChart);

        // Update issue summary
        const issuesContent = this.element.querySelector('.issues-content');
        const issues = summaries.flatMap(s => [
            ...s.health.issues,
            ...s.compatibility.issues,
            ...s.predictions.issues
        ]);

        issuesContent.innerHTML = issues.length ? issues.slice(0, 5).map(issue => `
            <div class="issue-item">
                <div class="issue-header">
                    <span class="issue-type">${issue.type}</span>
                    <span class="issue-severity ${issue.severity}">${issue.severity}</span>
                </div>
                <div class="issue-message">${issue.message}</div>
            </div>
        `).join('') : '<div class="empty-state">No issues found</div>';

        // Update resource chart
        const resourceCtx = this.element.querySelector('.resource-chart').getContext('2d');
        let resourceChart = this.charts.get('resource');
        if (resourceChart) {
            resourceChart.destroy();
        }

        resourceChart = new Chart(resourceCtx, {
            type: 'doughnut',
            data: {
                labels: ['Memory', 'CPU', 'GPU'],
                datasets: [{
                    data: [
                        summaries.reduce((sum, s) => sum + s.resources.maxMemory, 0),
                        summaries.reduce((sum, s) => sum + s.resources.maxThreads, 0),
                        summaries.filter(s => s.resources.gpuEnabled).length
                    ],
                    backgroundColor: ['#4EC9B0', '#ffd93d', '#ff6b6b']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
        this.charts.set('resource', resourceChart);
    }

    async refreshHealthMetrics() {
        if (!this.selectedModels.size) return;

        const selectedMetric = this.element.querySelector('.health-panel .metric-select').value;
        const summaries = await Promise.all(
            Array.from(this.selectedModels).map(model => 
                window.modelManagementService.getModelSummary(model)
            )
        );

        // Update metrics chart
        const metricsCtx = this.element.querySelector('.health-panel .metrics-chart').getContext('2d');
        let metricsChart = this.charts.get('health-metrics');
        if (metricsChart) {
            metricsChart.destroy();
        }

        const metricData = {
            score: summaries.map(s => s.health.score),
            errors: summaries.map(s => s.health.issues),
            latency: summaries.map(s => s.health.performance.responseTime),
            availability: summaries.map(s => s.health.performance.uptime)
        };

        metricsChart = new Chart(metricsCtx, {
            type: 'line',
            data: {
                labels: Array.from(this.selectedModels),
                datasets: [{
                    label: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
                    data: metricData[selectedMetric],
                    borderColor: '#4EC9B0',
                    backgroundColor: 'rgba(78, 201, 176, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
        this.charts.set('health-metrics', metricsChart);

        // Update issues list
        const issuesList = this.element.querySelector('.health-panel .issues-list');
        const issues = summaries.flatMap(s => s.health.issues);

        issuesList.innerHTML = issues.length ? issues.map(issue => `
            <div class="issue-item">
                <div class="issue-header">
                    <span class="issue-type">${issue.type}</span>
                    <span class="issue-severity ${issue.severity}">${issue.severity}</span>
                </div>
                <div class="issue-message">${issue.message}</div>
            </div>
        `).join('') : '<div class="empty-state">No health issues found</div>';
    }

    async refreshPerformanceMetrics() {
        if (!this.selectedModels.size) return;

        const selectedMetric = this.element.querySelector('.performance-panel .metric-select').value;
        const summaries = await Promise.all(
            Array.from(this.selectedModels).map(model => 
                window.modelManagementService.getModelSummary(model)
            )
        );

        // Update metrics chart
        const metricsCtx = this.element.querySelector('.performance-panel .metrics-chart').getContext('2d');
        let metricsChart = this.charts.get('performance-metrics');
        if (metricsChart) {
            metricsChart.destroy();
        }

        metricsChart = new Chart(metricsCtx, {
            type: 'line',
            data: {
                labels: Array.from(this.selectedModels),
                datasets: [{
                    label: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
                    data: summaries.map(s => s.health.performance[selectedMetric]),
                    borderColor: '#4EC9B0',
                    backgroundColor: 'rgba(78, 201, 176, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
        this.charts.set('performance-metrics', metricsChart);

        // Update comparison chart
        const comparisonCtx = this.element.querySelector('.comparison-chart').getContext('2d');
        let comparisonChart = this.charts.get('performance-comparison');
        if (comparisonChart) {
            comparisonChart.destroy();
        }

        comparisonChart = new Chart(comparisonCtx, {
            type: 'radar',
            data: {
                labels: ['Load Time', 'Response Time', 'Throughput', 'Memory Usage'],
                datasets: summaries.map((s, i) => ({
                    label: Array.from(this.selectedModels)[i],
                    data: [
                        s.health.performance.loadTime,
                        s.health.performance.responseTime,
                        s.health.performance.throughput,
                        s.health.performance.memoryUsage
                    ],
                    borderColor: `hsl(${(i * 360) / summaries.length}, 70%, 60%)`,
                    backgroundColor: `hsla(${(i * 360) / summaries.length}, 70%, 60%, 0.1)`
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
        this.charts.set('performance-comparison', comparisonChart);
    }

    async refreshResourceAllocations() {
        if (!this.selectedModels.size) return;

        const summaries = await Promise.all(
            Array.from(this.selectedModels).map(model => 
                window.modelManagementService.getModelSummary(model)
            )
        );

        // Update allocation grid
        const allocationGrid = this.element.querySelector('.allocation-grid');
        allocationGrid.innerHTML = Array.from(this.selectedModels).map((model, i) => `
            <div class="allocation-card">
                <div class="model-name">${model}</div>
                <div class="allocation-details">
                    <div>Memory: ${summaries[i].resources.maxMemory ? `${Math.round(summaries[i].resources.maxMemory / (1024 * 1024 * 1024))}GB` : 'Unlimited'}</div>
                    <div>Threads: ${summaries[i].resources.maxThreads || 'Unlimited'}</div>
                    <div>Priority: ${summaries[i].resources.priority}</div>
                    <div>GPU: ${summaries[i].resources.gpuEnabled ? 'Enabled' : 'Disabled'}</div>
                </div>
            </div>
        `).join('');

        // Update usage chart
        const usageCtx = this.element.querySelector('.usage-chart').getContext('2d');
        let usageChart = this.charts.get('resource-usage');
        if (usageChart) {
            usageChart.destroy();
        }

        usageChart = new Chart(usageCtx, {
            type: 'bar',
            data: {
                labels: Array.from(this.selectedModels),
                datasets: [
                    {
                        label: 'Memory Usage',
                        data: summaries.map(s => s.health.performance.memoryUsage),
                        backgroundColor: '#4EC9B0'
                    },
                    {
                        label: 'CPU Usage',
                        data: summaries.map(s => s.health.performance.cpuUsage),
                        backgroundColor: '#ffd93d'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
        this.charts.set('resource-usage', usageChart);
    }

    async refreshLifecycleStates() {
        if (!this.selectedModels.size) return;

        const summaries = await Promise.all(
            Array.from(this.selectedModels).map(model => 
                window.modelManagementService.getModelSummary(model)
            )
        );

        // Update stages grid
        const stagesGrid = this.element.querySelector('.stages-grid');
        stagesGrid.innerHTML = Array.from(this.selectedModels).map((model, i) => `
            <div class="stage-card">
                <div class="model-name">${model}</div>
                <div class="stage-details">
                    <div>Stage: ${summaries[i].lifecycle.stage}</div>
                    <div>Status: ${summaries[i].lifecycle.status}</div>
                    <div class="stage-notes">${summaries[i].lifecycle.notes || 'No notes'}</div>
                </div>
            </div>
        `).join('');

        // Update timeline chart
        const timelineCtx = this.element.querySelector('.timeline-chart').getContext('2d');
        let timelineChart = this.charts.get('lifecycle-timeline');
        if (timelineChart) {
            timelineChart.destroy();
        }

        const stages = window.modelManagementService.getLifecycleStages();
        timelineChart = new Chart(timelineCtx, {
            type: 'bubble',
            data: {
                datasets: Array.from(this.selectedModels).map((model, i) => ({
                    label: model,
                    data: [{
                        x: stages.findIndex(s => s.name === summaries[i].lifecycle.stage),
                        y: i,
                        r: 10
                    }],
                    backgroundColor: `hsl(${(i * 360) / summaries.length}, 70%, 60%)`
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'category',
                        labels: stages.map(s => s.name)
                    },
                    y: {
                        type: 'category',
                        labels: Array.from(this.selectedModels)
                    }
                }
            }
        });
        this.charts.set('lifecycle-timeline', timelineChart);
    }

    async refreshBatchOperations() {
        const operations = window.modelManagementService.getBatchOperations();
        const operationsList = this.element.querySelector('.operations-list');
        const historyList = this.element.querySelector('.history-list');

        // Update active operations
        const activeOps = operations.filter(op => op.status === 'running');
        operationsList.innerHTML = activeOps.length ? activeOps.map(op => `
            <div class="operation-item">
                <div class="operation-header">
                    <span class="operation-type">${op.type}</span>
                    <span class="operation-status running">Running</span>
                </div>
                <div class="operation-progress">
                    <div class="progress-bar" style="width: ${op.progress}%"></div>
                </div>
                <div class="operation-details">
                    Models: ${op.models.join(', ')}
                    <br>
                    Progress: ${Math.round(op.progress)}%
                </div>
            </div>
        `).join('') : '<div class="empty-state">No active operations</div>';

        // Update operation history
        const completedOps = operations.filter(op => op.status !== 'running');
        historyList.innerHTML = completedOps.length ? completedOps.map(op => `
            <div class="operation-item">
                <div class="operation-header">
                    <span class="operation-type">${op.type}</span>
                    <span class="operation-status ${op.status}">${op.status}</span>
                </div>
                <div class="operation-details">
                    Models: ${op.models.join(', ')}
                    <br>
                    ${op.status === 'completed' ? 
                        `Completed: ${new Date(op.endTime).toLocaleString()}` :
                        `Error: ${op.error}`
                    }
                </div>
            </div>
        `).join('') : '<div class="empty-state">No operation history</div>';
    }

    showAllocationModal() {
        if (!this.selectedModels.size) return;

        const modal = this.element.querySelector('.allocation-modal');
        const allocation = window.modelManagementService.getResourceAllocation(
            Array.from(this.selectedModels)[0]
        );

        modal.querySelector('input[name="max-memory"]').value = 
            allocation.maxMemory ? Math.round(allocation.maxMemory / (1024 * 1024 * 1024)) : '';
        modal.querySelector('input[name="max-threads"]').value = allocation.maxThreads || '';
        modal.querySelector('select[name="priority"]').value = allocation.priority;
        modal.querySelector('input[name="gpu-enabled"]').checked = allocation.gpuEnabled;

        modal.style.display = 'flex';
    }

    hideAllocationModal() {
        this.element.querySelector('.allocation-modal').style.display = 'none';
    }

    async saveAllocations() {
        const modal = this.element.querySelector('.allocation-modal');
        const allocation = {
            maxMemory: Number(modal.querySelector('input[name="max-memory"]').value) * 1024 * 1024 * 1024,
            maxThreads: Number(modal.querySelector('input[name="max-threads"]').value),
            priority: modal.querySelector('select[name="priority"]').value,
            gpuEnabled: modal.querySelector('input[name="gpu-enabled"]').checked
        };

        for (const model of this.selectedModels) {
            await window.modelManagementService.setResourceAllocation(model, allocation);
        }

        this.hideAllocationModal();
        this.refreshResourceAllocations();
    }

    showLifecycleModal() {
        if (!this.selectedModels.size) return;

        const modal = this.element.querySelector('.lifecycle-modal');
        const lifecycle = window.modelManagementService.getLifecycleState(
            Array.from(this.selectedModels)[0]
        );

        modal.querySelector('select[name="stage"]').value = lifecycle.stage;
        modal.querySelector('select[name="status"]').value = lifecycle.status;
        modal.querySelector('textarea[name="notes"]').value = lifecycle.notes;

        modal.style.display = 'flex';
    }

    hideLifecycleModal() {
        this.element.querySelector('.lifecycle-modal').style.display = 'none';
    }

    async saveLifecycleStates() {
        const modal = this.element.querySelector('.lifecycle-modal');
        const state = {
            stage: modal.querySelector('select[name="stage"]').value,
            status: modal.querySelector('select[name="status"]').value,
            notes: modal.querySelector('textarea[name="notes"]').value
        };

        for (const model of this.selectedModels) {
            await window.modelManagementService.setLifecycleState(model, state);
        }

        this.hideLifecycleModal();
        this.refreshLifecycleStates();
    }

    showOperationModal() {
        if (!this.selectedModels.size) return;

        const modal = this.element.querySelector('.operation-modal');
        modal.style.display = 'flex';
        this.toggleOperationOptions(modal.querySelector('select[name="operation-type"]').value);
    }

    hideOperationModal() {
        this.element.querySelector('.operation-modal').style.display = 'none';
    }

    toggleOperationOptions(type) {
        const modal = this.element.querySelector('.operation-modal');
        modal.querySelector('.update-options').style.display = type === 'update' ? 'block' : 'none';
        modal.querySelector('.compatibility-options').style.display = type === 'compatibility_check' ? 'block' : 'none';
    }

    async startBatchOperation() {
        const modal = this.element.querySelector('.operation-modal');
        const type = modal.querySelector('select[name="operation-type"]').value;
        
        const options = {};
        if (type === 'update') {
            options.dependencies = modal.querySelector('input[name="update-dependencies"]').checked;
            options.force = modal.querySelector('input[name="force-update"]').checked;
        } else if (type === 'compatibility_check') {
            options.detailed = modal.querySelector('input[name="detailed-check"]').checked;
            options.force = modal.querySelector('input[name="force-check"]').checked;
        }

        await window.modelManagementService.startBatchOperation({
            models: Array.from(this.selectedModels),
            type,
            options
        });

        this.hideOperationModal();
        this.refreshBatchOperations();
    }
}

// Export singleton instance
window.modelDashboardPanel = new ModelDashboardPanel();
