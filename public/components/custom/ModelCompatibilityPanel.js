class ModelCompatibilityPanel {
    // Previous methods remain the same...

    saveRequirements() {
        const modal = this.element.querySelector('.requirements-modal');
        const modelName = this.element.querySelector('.model-select').value;

        const requirements = {
            platform: {
                os: Array.from(modal.querySelectorAll('input[name="os"]:checked')).map(cb => cb.value),
                arch: Array.from(modal.querySelectorAll('input[name="arch"]:checked')).map(cb => cb.value)
            },
            resources: {
                memory: Number(modal.querySelector('input[name="memory"]').value) || undefined,
                diskSpace: Number(modal.querySelector('input[name="disk-space"]').value) || undefined,
                cpuCores: Number(modal.querySelector('input[name="cpu-cores"]').value) || undefined
            },
            runtime: {
                node: modal.querySelector('input[name="node-version"]').value || undefined,
                electron: modal.querySelector('input[name="electron-version"]').value || undefined
            },
            versions: {
                model: modal.querySelector('input[name="model-version"]').value || undefined,
                dependencies: {}
            }
        };

        // Add GPU requirement if checked
        if (modal.querySelector('input[name="gpu-required"]').checked) {
            requirements.platform.gpu = { required: true };
        }

        // Add dependencies
        const dependencyItems = modal.querySelectorAll('.dependency-item');
        dependencyItems.forEach(item => {
            const name = item.querySelector('.dependency-name').value;
            const version = item.querySelector('.dependency-version').value;
            if (name && version) {
                requirements.versions.dependencies[name] = version;
            }
        });

        // Save requirements
        window.modelCompatibilityService.setSystemRequirements(modelName, requirements);

        // Hide modal and refresh
        this.hideRequirementsModal();
        this.refreshRequirementsDetails(modelName);
        this.refreshCompatibilityInfo();
    }

    showCompatibilityNotification(event) {
        const notification = document.createElement('div');
        notification.className = 'compatibility-notification';
        
        if (event.result.compatible) {
            notification.innerHTML = `
                <h4 class="compatible">Model Compatible</h4>
                <p>Model: ${event.model}</p>
                <p>All compatibility checks passed</p>
                <div class="notification-actions">
                    <button class="view-details-btn">View Details</button>
                    <button class="dismiss-btn">Dismiss</button>
                </div>
            `;
        } else {
            const issues = [
                ...(event.result.platform?.issues || []),
                ...(event.result.resources?.issues || []),
                ...(event.result.runtime?.issues || []),
                ...(event.result.version?.issues || []),
                ...(event.result.dependencies?.issues || [])
            ];

            notification.innerHTML = `
                <h4 class="incompatible">Compatibility Issues</h4>
                <p>Model: ${event.model}</p>
                <p>${issues.length} issue${issues.length === 1 ? '' : 's'} found</p>
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
window.modelCompatibilityPanel = new ModelCompatibilityPanel();
