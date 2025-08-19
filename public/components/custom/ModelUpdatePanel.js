class ModelUpdatePanel {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'model-update-panel';
        this.isVisible = false;
        this.createPanel();
        this.setupEventListeners();

        // Listen for update events
        window.modelUpdateService.addListener(event => {
            if (event.type === 'update_complete' || event.type === 'update_failed') {
                this.showUpdateNotification(event);
                this.refreshUpdateHistory();
            }
        });
    }

    createPanel() {
        this.element.innerHTML = `
            <div class="update-panel-header">
                <h3>Model Updates</h3>
                <div class="header-actions">
                    <button class="refresh-btn" title="Refresh updates">↻</button>
                    <button class="close-btn">×</button>
                </div>
            </div>
            <div class="update-panel-content">
                <div class="update-queue-section">
                    <h4>Update Queue</h4>
                    <div class="queue-list"></div>
                </div>
                <div class="scheduled-updates-section">
                    <h4>Scheduled Updates</h4>
                    <div class="schedule-list"></div>
                    <button class="schedule-update-btn">Schedule New Update</button>
                </div>
                <div class="update-history-section">
                    <h4>Update History</h4>
                    <div class="history-filters">
                        <select class="model-filter">
                            <option value="all">All Models</option>
                        </select>
                        <select class="status-filter">
                            <option value="all">All Status</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                    <div class="history-list"></div>
                </div>
            </div>
            <div class="schedule-modal" style="display: none;">
                <div class="schedule-modal-content">
                    <h4>Schedule Update</h4>
                    <div class="schedule-form">
                        <div class="form-group">
                            <label>Model:</label>
                            <select class="model-select"></select>
                        </div>
                        <div class="form-group">
                            <label>Update Time:</label>
                            <input type="datetime-local" class="time-input">
                        </div>
                        <div class="form-group">
                            <label>Priority:</label>
                            <select class="priority-select">
                                <option value="high">High</option>
                                <option value="normal" selected>Normal</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" class="dependencies-checkbox" checked>
                                Update Dependencies
                            </label>
                        </div>
                        <div class="form-actions">
                            <button class="cancel-schedule-btn">Cancel</button>
                            <button class="confirm-schedule-btn">Schedule</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .model-update-panel {
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

            .update-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                border-bottom: 1px solid #3c3c3c;
            }

            .update-panel-header h3 {
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

            .update-panel-content {
                padding: 16px;
                overflow-y: auto;
                max-height: calc(80vh - 60px);
            }

            .update-queue-section,
            .scheduled-updates-section,
            .update-history-section {
                margin-bottom: 24px;
            }

            h4 {
                margin: 0 0 12px 0;
                color: #4EC9B0;
                font-size: 14px;
            }

            .queue-list,
            .schedule-list,
            .history-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .queue-item,
            .schedule-item,
            .history-item {
                padding: 12px;
                background: #252525;
                border: 1px solid #3c3c3c;
                border-radius: 4px;
            }

            .queue-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .queue-info {
                flex: 1;
            }

            .model-name {
                color: #fff;
                font-size: 14px;
                margin-bottom: 4px;
            }

            .queue-details,
            .schedule-details {
                color: #888;
                font-size: 12px;
            }

            .cancel-update-btn {
                padding: 4px 8px;
                background: none;
                border: 1px solid #ff6b6b;
                color: #ff6b6b;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
            }

            .cancel-update-btn:hover {
                background: rgba(255, 107, 107, 0.1);
            }

            .schedule-update-btn {
                width: 100%;
                padding: 8px;
                background: #4EC9B0;
                color: #1E1E1E;
                border: none;
                border-radius: 4px;
                font-size: 13px;
                cursor: pointer;
                margin-top: 12px;
            }

            .schedule-update-btn:hover {
                background: #3da090;
            }

            .history-filters {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
            }

            .model-filter,
            .status-filter {
                flex: 1;
                padding: 6px 12px;
                background: #252525;
                border: 1px solid #3c3c3c;
                border-radius: 4px;
                color: #fff;
                font-size: 12px;
            }

            .history-item {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .history-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .history-status {
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
                text-transform: uppercase;
            }

            .history-status.success {
                background: rgba(78, 201, 176, 0.2);
                color: #4EC9B0;
            }

            .history-status.failed {
                background: rgba(255, 107, 107, 0.2);
                color: #ff6b6b;
            }

            .history-details {
                color: #888;
                font-size: 12px;
            }

            .schedule-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 2001;
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .schedule-modal-content {
                width: 400px;
                background: #1E1E1E;
                border: 1px solid #3c3c3c;
                border-radius: 8px;
                padding: 20px;
            }

            .schedule-form {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .form-group {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .form-group label {
                color: #888;
                font-size: 12px;
            }

            .model-select,
            .time-input,
            .priority-select {
                padding: 8px 12px;
                background: #252525;
                border: 1px solid #3c3c3c;
                border-radius: 4px;
                color: #fff;
                font-size: 13px;
            }

            .checkbox-label {
                display: flex;
                align-items: center;
                gap: 8px;
                color: #888;
                font-size: 13px;
                cursor: pointer;
            }

            .form-actions {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                margin-top: 8px;
            }

            .cancel-schedule-btn,
            .confirm-schedule-btn {
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 13px;
                cursor: pointer;
            }

            .cancel-schedule-btn {
                background: none;
                border: 1px solid #3c3c3c;
                color: #888;
            }

            .confirm-schedule-btn {
                background: #4EC9B0;
                color: #1E1E1E;
                border: none;
            }

            .update-notification {
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

            .update-notification h4 {
                margin: 0 0 8px 0;
            }

            .update-notification h4.success {
                color: #4EC9B0;
            }

            .update-notification h4.failed {
                color: #ff6b6b;
            }

            .update-notification p {
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
        this.element.querySelector('.refresh-btn').addEventListener('click', () => {
            this.refreshAll();
        });

        // Schedule update button
        this.element.querySelector('.schedule-update-btn').addEventListener('click', () => {
            this.showScheduleModal();
        });

        // Cancel schedule button
        this.element.querySelector('.cancel-schedule-btn').addEventListener('click', () => {
            this.hideScheduleModal();
        });

        // Confirm schedule button
        this.element.querySelector('.confirm-schedule-btn').addEventListener('click', () => {
            this.scheduleUpdate();
        });

        // History filters
        this.element.querySelector('.model-filter').addEventListener('change', () => {
            this.refreshUpdateHistory();
        });

        this.element.querySelector('.status-filter').addEventListener('change', () => {
            this.refreshUpdateHistory();
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

            await this.refreshAll();
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

    async refreshAll() {
        await Promise.all([
            this.refreshUpdateQueue(),
            this.refreshScheduledUpdates(),
            this.refreshUpdateHistory()
        ]);
    }

    async refreshUpdateQueue() {
        const queueList = this.element.querySelector('.queue-list');
        const queue = Array.from(window.modelUpdateService.updateQueue.entries());

        queueList.innerHTML = queue.length ? queue.map(([model, update]) => `
            <div class="queue-item">
                <div class="queue-info">
                    <div class="model-name">${model}</div>
                    <div class="queue-details">
                        Priority: ${update.priority}
                        ${update.dependencies ? '• With Dependencies' : ''}
                        ${update.auto ? '• Automatic' : ''}
                    </div>
                </div>
                <button class="cancel-update-btn" data-model="${model}">Cancel</button>
            </div>
        `).join('') : '<div class="empty-state">No updates in queue</div>';

        // Add cancel button listeners
        queueList.querySelectorAll('.cancel-update-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const model = btn.dataset.model;
                window.modelUpdateService.cancelQueuedUpdate(model);
                this.refreshUpdateQueue();
            });
        });
    }

    async refreshScheduledUpdates() {
        const scheduleList = this.element.querySelector('.schedule-list');
        const schedule = window.modelUpdateService.getSchedule();

        scheduleList.innerHTML = schedule.length ? schedule.map(update => `
            <div class="schedule-item">
                <div class="model-name">${update.model}</div>
                <div class="schedule-details">
                    Next Update: ${new Date(update.nextUpdate).toLocaleString()}
                    • Priority: ${update.priority}
                    ${update.dependencies ? '• With Dependencies' : ''}
                    ${update.auto ? '• Automatic' : ''}
                </div>
                <button class="cancel-update-btn" data-model="${update.model}">Cancel</button>
            </div>
        `).join('') : '<div class="empty-state">No scheduled updates</div>';

        // Add cancel button listeners
        scheduleList.querySelectorAll('.cancel-update-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const model = btn.dataset.model;
                window.modelUpdateService.cancelScheduledUpdate(model);
                this.refreshScheduledUpdates();
            });
        });
    }

    async refreshUpdateHistory() {
        const historyList = this.element.querySelector('.history-list');
        const modelFilter = this.element.querySelector('.model-filter').value;
        const statusFilter = this.element.querySelector('.status-filter').value;

        let history = window.modelUpdateService.getUpdateHistory();

        // Apply filters
        if (modelFilter !== 'all') {
            history = history.filter(h => h.model === modelFilter);
        }
        if (statusFilter !== 'all') {
            history = history.filter(h => h.updates.some(u => u.status === statusFilter));
        }

        historyList.innerHTML = history.length ? history.map(h => 
            h.updates.map(update => `
                <div class="history-item">
                    <div class="history-header">
                        <span class="model-name">${h.model}</span>
                        <span class="history-status ${update.status}">${update.status}</span>
                    </div>
                    <div class="history-details">
                        ${new Date(update.timestamp).toLocaleString()}
                        ${update.fromVersion ? `
                            • ${update.fromVersion} → ${update.toVersion}
                        ` : ''}
                        ${update.automatic ? '• Automatic' : ''}
                        ${update.error ? `<div class="error-message">${update.error}</div>` : ''}
                    </div>
                </div>
            `).join('')
        ).join('') : '<div class="empty-state">No update history</div>';

        // Update model filter options
        const modelSelect = this.element.querySelector('.model-filter');
        const currentValue = modelSelect.value;
        const models = Array.from(new Set(history.map(h => h.model)));
        
        modelSelect.innerHTML = `
            <option value="all">All Models</option>
            ${models.map(model => `
                <option value="${model}" ${model === currentValue ? 'selected' : ''}>
                    ${model}
                </option>
            `).join('')}
        `;
    }

    showScheduleModal() {
        const modal = this.element.querySelector('.schedule-modal');
        const modelSelect = modal.querySelector('.model-select');

        // Populate model select
        const models = Array.from(new Set([
            ...window.modelUpdateService.getUpdateHistory().map(h => h.model)
        ]));

        modelSelect.innerHTML = models.map(model => `
            <option value="${model}">${model}</option>
        `).join('');

        // Set default time to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
        modal.querySelector('.time-input').value = tomorrow.toISOString().slice(0, 16);

        modal.style.display = 'flex';
    }

    hideScheduleModal() {
        this.element.querySelector('.schedule-modal').style.display = 'none';
    }

    async scheduleUpdate() {
        const modal = this.element.querySelector('.schedule-modal');
        const modelName = modal.querySelector('.model-select').value;
        const time = new Date(modal.querySelector('.time-input').value).getTime();
        const priority = modal.querySelector('.priority-select').value;
        const dependencies = modal.querySelector('.dependencies-checkbox').checked;

        await window.modelUpdateService.scheduleUpdate(modelName, {
            time,
            priority,
            dependencies,
            auto: false
        });

        this.hideScheduleModal();
        await this.refreshAll();
    }

    showUpdateNotification(event) {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        
        if (event.type === 'update_complete') {
            notification.innerHTML = `
                <h4 class="success">Update Complete</h4>
                <p>Model: ${event.model}</p>
                <p>Version: ${event.fromVersion} → ${event.toVersion}</p>
                <div class="notification-actions">
                    <button class="view-details-btn">View Details</button>
                    <button class="dismiss-btn">Dismiss</button>
                </div>
            `;
        } else {
            notification.innerHTML = `
                <h4 class="failed">Update Failed</h4>
                <p>Model: ${event.model}</p>
                <p>Error: ${event.error}</p>
                <div class="notification-actions">
                    <button class="view-details-btn">View Details</button>
                    <button class="dismiss-btn">Dismiss</button>
                </div>
            `;
        }

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
window.modelUpdatePanel = new ModelUpdatePanel();
