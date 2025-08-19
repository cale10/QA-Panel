class ModelPredictivePanel {
    // Previous methods remain the same...

    formatThresholdValue(metric, key, value) {
        if (metric === 'memoryUsage') {
            if (key === 'max') {
                return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
            } else if (key === 'trend') {
                return `${(value / (1024 * 1024)).toFixed(1)} MB/h`;
            }
        } else if (metric === 'loadTime' || metric === 'responseTime') {
            if (key === 'max') {
                return `${value} ms`;
            } else if (key === 'trend') {
                return `${value} ms/h`;
            }
        } else if (metric === 'throughput') {
            if (key === 'min') {
                return `${value} req/s`;
            } else if (key === 'trend') {
                return `${value} req/h`;
            }
        } else if (metric === 'errors') {
            if (key === 'max') {
                return `${value}/h`;
            } else if (key === 'trend') {
                return `${value}/h²`;
            }
        }
        return value.toString();
    }

    showPredictiveNotification(event) {
        const notification = document.createElement('div');
        notification.className = 'predictive-notification';
        
        const issues = event.issues;
        const severities = issues.map(i => i.severity);
        const highestSeverity = severities.includes('error') ? 'error' : 'warning';

        notification.innerHTML = `
            <h4>Potential Issues Detected</h4>
            <p>Model: ${event.model}</p>
            <p>${issues.length} issue${issues.length === 1 ? '' : 's'} found:</p>
            <ul style="margin: 4px 0; padding-left: 20px; color: #888;">
                ${issues.map(issue => `
                    <li>${issue.message}</li>
                `).join('')}
            </ul>
            <div class="notification-actions">
                <button class="view-details-btn">View Details</button>
                <button class="dismiss-btn">Dismiss</button>
            </div>
        `;

        // Add event listeners
        notification.querySelector('.view-details-btn').addEventListener('click', () => {
            this.show();
            if (this.selectedModel !== event.model) {
                this.selectedModel = event.model;
                this.element.querySelector('.model-select').value = event.model;
                this.refreshAll();
            }
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
window.modelPredictivePanel = new ModelPredictivePanel();
