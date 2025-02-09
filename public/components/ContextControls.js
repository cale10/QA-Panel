class ContextControls {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'context-controls';
        this.createContent();
        this.loadSettings(); // Add this line to load settings after creating content
    }

    createContent() {
        this.element.innerHTML = `
            <div class="context-section">
                <h3>Context Controls</h3>
                <div class="control-group">
                    <label>
                        <input type="checkbox" id="contextEnabled" checked>
                        Enable Context Memory
                    </label>
                    <p class="control-description">Consider previous Q&As when generating answers</p>
                </div>

                <div class="control-group">
                    <label>History Limit</label>
                    <select id="contextLimit">
                        ${Array.from({length: 9}, (_, i) => i + 1).map(num => `
                            <option value="${num}" ${num === 5 ? 'selected' : ''}>
                                ${num}
                            </option>
                        `).join('')}
                    </select>
                    <p class="control-description">Number of previous Q&As to remember</p>
                </div>

                <div class="control-group">
                    <label>
                        <input type="checkbox" id="sortByRelevance">
                        Sort by Relevance
                    </label>
                    <p class="control-description">Sort previous Q&As by relevance instead of time</p>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const contextEnabled = this.element.querySelector('#contextEnabled');
        const contextLimit = this.element.querySelector('#contextLimit');
        const sortByRelevance = this.element.querySelector('#sortByRelevance');

        [contextEnabled, contextLimit, sortByRelevance].forEach(input => {
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
                        enabled: this.element.querySelector('#contextEnabled').checked,
                        limit: parseInt(this.element.querySelector('#contextLimit').value),
                        sortByRelevance: this.element.querySelector('#sortByRelevance').checked
                    }
                }
            };

            await window.electronAPI.updateSettings(newSettings);
        } catch (error) {
            console.error('Error saving context settings:', error);
        }
    }

    async loadSettings() {
        try {
            const settings = await window.electronAPI.getSettings();
            
            if (settings.ai?.contextMemory) {
                const contextEnabled = this.element.querySelector('#contextEnabled');
                const contextLimit = this.element.querySelector('#contextLimit');
                const sortByRelevance = this.element.querySelector('#sortByRelevance');

                if (contextEnabled) contextEnabled.checked = settings.ai.contextMemory.enabled;
                if (contextLimit) contextLimit.value = settings.ai.contextMemory.limit.toString();
                if (sortByRelevance) sortByRelevance.checked = settings.ai.contextMemory.sortByRelevance;
            }
        } catch (error) {
            console.error('Error loading context settings:', error);
        }
    }

    getElement() {
        return this.element;
    }
}

// Export the class
window.ContextControls = ContextControls;
