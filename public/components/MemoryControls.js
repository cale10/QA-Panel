class MemoryControls {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'memory-controls';
        this.createContent();
        this.loadSettings();
    }

    createContent() {
        this.element.innerHTML = `
            <div class="memory-section">
                <h3>Memory Settings</h3>
                <div class="control-group">
                    <label class="toggle-switch">
                        <input type="checkbox" id="memoryEnabled" checked>
                        <span class="toggle-slider"></span>
                        <span class="toggle-label">Smart History</span>
                    </label>
                    <p class="control-description">Learn from previous interactions to provide better answers</p>
                </div>

                <div class="control-group">
                    <label>History Size</label>
                    <select id="memoryLimit">
                        ${Array.from({length: 9}, (_, i) => i + 1).map(num => `
                            <option value="${num}" ${num === 5 ? 'selected' : ''}>
                                ${num} ${num === 1 ? 'entry' : 'entries'}
                            </option>
                        `).join('')}
                    </select>
                    <p class="control-description">Number of previous interactions to remember</p>
                </div>

                <div class="control-group">
                    <label class="toggle-switch">
                        <input type="checkbox" id="sortByRelevance">
                        <span class="toggle-slider"></span>
                        <span class="toggle-label">Smart Sorting</span>
                    </label>
                    <p class="control-description">Prioritize most relevant previous interactions</p>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const memoryEnabled = this.element.querySelector('#memoryEnabled');
        const memoryLimit = this.element.querySelector('#memoryLimit');
        const sortByRelevance = this.element.querySelector('#sortByRelevance');

        [memoryEnabled, memoryLimit, sortByRelevance].forEach(input => {
            input.addEventListener('change', () => this.saveSettings());
        });
    }

    async saveSettings() {
        try {
            const settings = await window.electronAPI.getSettings();
            
            const newSettings = {
                ...settings,
                ai: {
                    ...settings.ai,
                    contextMemory: {
                        enabled: this.element.querySelector('#memoryEnabled').checked,
                        limit: parseInt(this.element.querySelector('#memoryLimit').value),
                        sortByRelevance: this.element.querySelector('#sortByRelevance').checked
                    }
                }
            };

            await window.electronAPI.updateSettings(newSettings);
        } catch (error) {
            console.error('Error saving memory settings:', error);
        }
    }

    async loadSettings() {
        try {
            const settings = await window.electronAPI.getSettings();
            
            if (settings.ai?.contextMemory) {
                const memoryEnabled = this.element.querySelector('#memoryEnabled');
                const memoryLimit = this.element.querySelector('#memoryLimit');
                const sortByRelevance = this.element.querySelector('#sortByRelevance');

                if (memoryEnabled) memoryEnabled.checked = settings.ai.contextMemory.enabled;
                if (memoryLimit) memoryLimit.value = settings.ai.contextMemory.limit.toString();
                if (sortByRelevance) sortByRelevance.checked = settings.ai.contextMemory.sortByRelevance;
            }
        } catch (error) {
            console.error('Error loading memory settings:', error);
        }
    }

    getElement() {
        return this.element;
    }
}

// Export the class
window.MemoryControls = MemoryControls;
