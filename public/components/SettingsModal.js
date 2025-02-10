class SettingsModal {
    constructor() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal-overlay';
        this.isVisible = false;
        this.activeTab = 'theme';
        this.themeSettings = new ThemeSettings();
        this.aiSettings = new AISettings();
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
                    <button class="tab-button active" data-tab="theme">
                        <span class="icon">🎨</span>
                        <span>Theme</span>
                    </button>
                    <button class="tab-button" data-tab="ai">
                        <span class="icon">🤖</span>
                        <span>AI Features</span>
                    </button>
                    <button class="tab-button" data-tab="keyboard">
                        <span class="icon">⌨️</span>
                        <span>Keyboard</span>
                    </button>
                    <button class="tab-button" data-tab="advanced">
                        <span class="icon">⚙️</span>
                        <span>Advanced</span>
                    </button>
                </div>

                <div class="settings-content">
                    <div class="tab-panel active" id="themePanel"></div>
                    <div class="tab-panel" id="aiPanel"></div>

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
                                <p class="setting-description">Note: Planning to upgrade to Llama 3.2 vision model</p>
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

        // Add Theme settings panel
        const themePanel = this.modal.querySelector('#themePanel');
        const themeElement = await this.themeSettings.getElement();
        themePanel.appendChild(themeElement);

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

        if (exportBtn) exportBtn.addEventListener('click', () => this.exportData());
        if (importBtn) importBtn.addEventListener('click', () => this.importData());
        if (updateBtn) updateBtn.addEventListener('click', () => this.checkUpdates());
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

        // Load shortcuts
        Object.entries(settings.shortcuts).forEach(([name, value]) => {
            const input = this.modal.querySelector(`[data-shortcut="${name}"]`);
            if (input) {
                input.textContent = value;
            }
        });

        // Load AI settings
        if (settings.ai) {
            await this.aiSettings.setSettings(settings.ai);
        }

        // Load theme settings
        if (settings.theme) {
            await this.themeSettings.setSettings(settings.theme);
        }
    }

    async saveSettings() {
        const settings = await window.electronAPI.getSettings();

        // Save shortcuts
        const shortcuts = {};
        this.modal.querySelectorAll('[data-shortcut]').forEach(input => {
            shortcuts[input.dataset.shortcut] = input.textContent;
        });

        const newSettings = {
            ...settings,
            shortcuts,
            ai: this.aiSettings.getSettings(),
            theme: this.themeSettings.getSettings()
        };

        await window.electronAPI.updateSettings(newSettings);
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

    async exportData() {
        const { filePath } = await window.electronAPI.showSaveDialog({
            title: 'Export Data',
            defaultPath: 'qa-panel-backup.json',
            filters: [{ name: 'JSON Files', extensions: ['json'] }]
        });

        if (filePath) {
            await window.electronAPI.exportData(filePath);
        }
    }

    async importData() {
        const { filePaths } = await window.electronAPI.showOpenDialog({
            title: 'Import Data',
            filters: [{ name: 'JSON Files', extensions: ['json'] }],
            properties: ['openFile']
        });

        if (filePaths && filePaths[0]) {
            await window.electronAPI.importData(filePaths[0]);
            window.location.reload();
        }
    }

    async checkUpdates() {
        // TODO: Implement update check
        alert('Update check feature coming soon!\nPlanned upgrade: Llama 3.2 vision model');
    }
}

// Export the class
window.SettingsModal = SettingsModal;
