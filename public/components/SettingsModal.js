class SettingsModal {
    constructor() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal-overlay';
        this.isVisible = false;
        this.activeTab = 'appearance';
        this.aiSettings = new AISettings();
        this.capturingShortcut = false;
        this.createModal();
    }

    async createModal() {
        this.modal.innerHTML = `
            <div class="settings-modal">
                <div class="modal-header">
                    <h2>Settings</h2>
                    <button class="close-button" id="closeSettingsBtn" title="Close (Esc)">×</button>
                </div>
                
                <div class="settings-tabs">
                    <button class="tab-button active" data-tab="appearance">
                        <span class="icon">🎨</span>
                        <span>Appearance</span>
                    </button>
                    <button class="tab-button" data-tab="keyboard">
                        <span class="icon">⌨️</span>
                        <span>Keyboard</span>
                    </button>
                    <button class="tab-button" data-tab="ai">
                        <span class="icon">🤖</span>
                        <span>AI Features</span>
                    </button>
                    <button class="tab-button" data-tab="context">
                        <span class="icon">📚</span>
                        <span>Context</span>
                    </button>
                    <button class="tab-button" data-tab="advanced">
                        <span class="icon">⚙️</span>
                        <span>Advanced</span>
                    </button>
                </div>

                <div class="settings-content">
                    <div class="tab-panel active" id="appearancePanel">
                        <div class="section-group">
                            <h3 class="section-title">Colors</h3>
                            <div class="setting-group">
                                <label>Background Color & Opacity</label>
                                <input type="color" id="bgColorInput">
                                <input type="range" id="bgOpacityInput" min="0" max="1" step="0.1">
                            </div>
                            <div class="setting-group">
                                <label>Text Color</label>
                                <input type="color" id="textColorInput">
                            </div>
                        </div>

                        <div class="section-group">
                            <h3 class="section-title">Typography</h3>
                            <div class="setting-group">
                                <label>Font Family</label>
                                <select id="fontFamilyInput">
                                    <option value="Arial">Arial</option>
                                    <option value="Helvetica">Helvetica</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                    <option value="Courier New">Courier New</option>
                                </select>
                            </div>
                            <div class="setting-group">
                                <label>Font Size</label>
                                <select id="fontSizeInput">
                                    <option value="12px">Small</option>
                                    <option value="16px">Medium</option>
                                    <option value="20px">Large</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="tab-panel" id="keyboardPanel">
                        <div class="section-group">
                            <h3 class="section-title">Global Shortcuts</h3>
                            <div class="shortcuts-list">
                                <div class="shortcut-input">
                                    <label>Show/Hide App</label>
                                    <div class="input-field" tabindex="0" data-shortcut="toggleApp">Shift+Space</div>
                                    <button class="reset-button">Reset</button>
                                </div>
                                <div class="shortcut-input">
                                    <label>Focus New Question</label>
                                    <div class="input-field" tabindex="0" data-shortcut="newQuestion">Shift+N</div>
                                    <button class="reset-button">Reset</button>
                                </div>
                                <div class="shortcut-input">
                                    <label>Export Data</label>
                                    <div class="input-field" tabindex="0" data-shortcut="exportData">Ctrl+Shift+E</div>
                                    <button class="reset-button">Reset</button>
                                </div>
                                <div class="shortcut-input">
                                    <label>Import Data</label>
                                    <div class="input-field" tabindex="0" data-shortcut="importData">Ctrl+Shift+I</div>
                                    <button class="reset-button">Reset</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="tab-panel" id="aiPanel"></div>

                    <div class="tab-panel" id="contextPanel">
                        <div class="section-group">
                            <h3 class="section-title">Memory Settings</h3>
                            <div class="setting-group">
                                <label>History Limit</label>
                                <select id="historyLimitSelect">
                                    ${Array.from({length: 9}, (_, i) => i + 1).map(num => 
                                        `<option value="${num}">${num}</option>`
                                    ).join('')}
                                </select>
                                <p class="setting-description">Number of previous Q&As to remember</p>
                            </div>
                            <div class="setting-group">
                                <label>Sort Method</label>
                                <select id="sortMethodSelect">
                                    <option value="time">Chronological</option>
                                    <option value="relevance">By Relevance</option>
                                </select>
                                <p class="setting-description">How to sort previous questions</p>
                            </div>
                        </div>
                    </div>

                    <div class="tab-panel" id="advancedPanel">
                        <div class="section-group">
                            <h3 class="section-title">Data Management</h3>
                            <div class="setting-group">
                                <button class="action-button" id="exportDataBtn">Export Data</button>
                                <button class="action-button" id="importDataBtn">Import Data</button>
                            </div>
                        </div>
                        <div class="section-group">
                            <h3 class="section-title">Updates</h3>
                            <div class="setting-group">
                                <button class="action-button" id="checkUpdatesBtn">Check for Updates</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="cancel-button" id="cancelSettingsBtn">Cancel</button>
                    <button class="save-button" id="saveSettingsBtn">Save Changes</button>
                </div>
            </div>
        `;

        // Add AI settings panel
        const aiPanel = this.modal.querySelector('#aiPanel');
        const aiElement = await this.aiSettings.getElement();
        aiPanel.appendChild(aiElement);

        this.setupEventListeners();
    }

    setupEventListeners() {
        const closeBtn = this.modal.querySelector('#closeSettingsBtn');
        const cancelBtn = this.modal.querySelector('#cancelSettingsBtn');
        const saveBtn = this.modal.querySelector('#saveSettingsBtn');
        const tabButtons = this.modal.querySelectorAll('.tab-button');
        const shortcutInputs = this.modal.querySelectorAll('.input-field[data-shortcut]');
        const resetButtons = this.modal.querySelectorAll('.reset-button');

        closeBtn.addEventListener('click', () => this.hide());
        cancelBtn.addEventListener('click', () => this.hide());
        saveBtn.addEventListener('click', () => this.saveSettings());

        // Add Escape key handler
        this.modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.capturingShortcut) {
                this.hide();
            }
        });

        // Close when clicking outside the modal
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });

        shortcutInputs.forEach(input => {
            input.addEventListener('click', () => this.startShortcutCapture(input));
            input.addEventListener('blur', () => this.stopShortcutCapture());
            input.addEventListener('keydown', (e) => this.handleShortcutCapture(e, input));
        });

        resetButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const shortcutInput = e.target.previousElementSibling;
                const shortcutName = shortcutInput.dataset.shortcut;
                this.resetShortcut(shortcutName, shortcutInput);
            });
        });

        // Advanced tab buttons
        const exportBtn = this.modal.querySelector('#exportDataBtn');
        const importBtn = this.modal.querySelector('#importDataBtn');
        const updateBtn = this.modal.querySelector('#checkUpdatesBtn');

        if (exportBtn) exportBtn.addEventListener('click', () => {
            // TODO: Implement export functionality
        });

        if (importBtn) importBtn.addEventListener('click', () => {
            // TODO: Implement import functionality
        });

        if (updateBtn) updateBtn.addEventListener('click', () => {
            // TODO: Implement update check
        });
    }

    switchTab(tabName) {
        const tabs = this.modal.querySelectorAll('.tab-button');
        const panels = this.modal.querySelectorAll('.tab-panel');

        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        panels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}Panel`);
        });

        this.activeTab = tabName;
    }

    async show() {
        if (!this.isVisible) {
            document.body.appendChild(this.modal);
            this.isVisible = true;
            await this.loadCurrentSettings();
            // Focus the close button for keyboard accessibility
            this.modal.querySelector('#closeSettingsBtn').focus();
        }
    }

    hide() {
        if (this.isVisible) {
            document.body.removeChild(this.modal);
            this.isVisible = false;
            this.capturingShortcut = false;
        }
    }

    startShortcutCapture(input) {
        this.capturingShortcut = true;
        input.classList.add('capturing');
        input.textContent = 'Press keys...';
    }

    stopShortcutCapture() {
        const input = this.modal.querySelector('.capturing');
        if (input) {
            input.classList.remove('capturing');
            if (input.textContent === 'Press keys...') {
                const shortcutName = input.dataset.shortcut;
                this.resetShortcut(shortcutName, input);
            }
        }
        this.capturingShortcut = false;
    }

    handleShortcutCapture(e, input) {
        if (!input.classList.contains('capturing')) return;

        e.preventDefault();
        e.stopPropagation();

        const keys = [];
        if (e.ctrlKey) keys.push('Ctrl');
        if (e.shiftKey) keys.push('Shift');
        if (e.altKey) keys.push('Alt');
        if (e.metaKey) keys.push('Meta');

        const key = e.key;
        if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
            keys.push(key.length === 1 ? key.toUpperCase() : key);
        }

        if (keys.length > 0) {
            input.textContent = keys.join('+');
            input.classList.remove('capturing');
            input.blur();
            this.capturingShortcut = false;
        }
    }

    async loadCurrentSettings() {
        const settings = await window.electronAPI.getSettings();
        
        // Load appearance settings
        const bgColor = settings.backgroundColor.match(/rgba?\(([^)]+)\)/)[1].split(',');
        const rgb = bgColor.slice(0, 3).map(x => parseInt(x.trim()));
        const hex = '#' + rgb.map(x => x.toString(16).padStart(2, '0')).join('');
        
        this.modal.querySelector('#bgColorInput').value = hex;
        this.modal.querySelector('#bgOpacityInput').value = parseFloat(bgColor[3]);
        this.modal.querySelector('#fontFamilyInput').value = settings.font;
        this.modal.querySelector('#fontSizeInput').value = settings.fontSize;
        this.modal.querySelector('#textColorInput').value = settings.fontColor;

        // Load shortcuts
        Object.entries(settings.shortcuts).forEach(([name, value]) => {
            const input = this.modal.querySelector(`[data-shortcut="${name}"]`);
            if (input) {
                input.textContent = value;
            }
        });

        // Load context settings
        if (settings.ai?.contextMemory) {
            const historyLimit = this.modal.querySelector('#historyLimitSelect');
            const sortMethod = this.modal.querySelector('#sortMethodSelect');
            if (historyLimit) historyLimit.value = settings.ai.contextMemory.limit.toString();
            if (sortMethod) sortMethod.value = settings.ai.contextMemory.sortByRelevance ? 'relevance' : 'time';
        }

        // Load AI settings
        if (settings.ai) {
            await this.aiSettings.setSettings(settings.ai);
        }
    }

    async saveSettings() {
        const bgColor = this.modal.querySelector('#bgColorInput').value;
        const opacity = this.modal.querySelector('#bgOpacityInput').value;
        const r = parseInt(bgColor.substr(1,2), 16);
        const g = parseInt(bgColor.substr(3,2), 16);
        const b = parseInt(bgColor.substr(5,2), 16);
        const backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;

        const settings = {
            backgroundColor,
            font: this.modal.querySelector('#fontFamilyInput').value,
            fontSize: this.modal.querySelector('#fontSizeInput').value,
            fontColor: this.modal.querySelector('#textColorInput').value,
            shortcuts: {},
            ai: this.aiSettings.getSettings()
        };

        // Save shortcuts
        this.modal.querySelectorAll('[data-shortcut]').forEach(input => {
            settings.shortcuts[input.dataset.shortcut] = input.textContent;
        });

        await window.electronAPI.updateSettings(settings);
        this.hide();
        window.location.reload();
    }

    resetShortcut(shortcutName, input) {
        const defaultShortcuts = {
            toggleApp: 'Shift+Space',
            newQuestion: 'Shift+N',
            exportData: 'Ctrl+Shift+E',
            importData: 'Ctrl+Shift+I'
        };

        input.textContent = defaultShortcuts[shortcutName] || '';
    }
}

// Export the class
window.SettingsModal = SettingsModal;
