class SettingsModal {
    constructor() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal-overlay';
        this.isVisible = false;
        this.activeTab = 'appearance';
        this.aiSettings = new AISettings();
        this.createModal();
    }

    createModal() {
        this.modal.innerHTML = `
            <div class="settings-modal">
                <div class="modal-header">
                    <h2>Settings</h2>
                    <button class="close-button" id="closeSettingsBtn">×</button>
                </div>
                
                <div class="settings-tabs">
                    <button class="tab-button active" data-tab="appearance">Appearance</button>
                    <button class="tab-button" data-tab="shortcuts">Keyboard Shortcuts</button>
                    <button class="tab-button" data-tab="ai">AI Features</button>
                </div>

                <div class="settings-content">
                    <div class="tab-panel active" id="appearancePanel">
                        <div class="setting-group">
                            <label>Background Color & Opacity</label>
                            <input type="color" id="bgColorInput">
                            <input type="range" id="bgOpacityInput" min="0" max="1" step="0.1">
                        </div>

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

                        <div class="setting-group">
                            <label>Text Color</label>
                            <input type="color" id="textColorInput">
                        </div>
                    </div>

                    <div class="tab-panel" id="shortcutsPanel">
                        <div class="shortcuts-list">
                            <h3>Global Shortcuts</h3>
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

                    <div class="tab-panel" id="aiPanel"></div>
                </div>

                <div class="modal-footer">
                    <button class="cancel-button" id="cancelSettingsBtn">Cancel</button>
                    <button class="save-button" id="saveSettingsBtn">Save Changes</button>
                </div>
            </div>
        `;

        // Add AI settings panel
        const aiPanel = this.modal.querySelector('#aiPanel');
        aiPanel.appendChild(this.aiSettings.getElement());

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

        tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });

        shortcutInputs.forEach(input => {
            input.addEventListener('click', () => this.startShortcutCapture(input));
            input.addEventListener('blur', () => this.stopShortcutCapture());
        });

        resetButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const shortcutInput = e.target.previousElementSibling;
                const shortcutName = shortcutInput.dataset.shortcut;
                this.resetShortcut(shortcutName, shortcutInput);
            });
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
        }
    }

    hide() {
        if (this.isVisible) {
            document.body.removeChild(this.modal);
            this.isVisible = false;
            this.stopShortcutCapture();
        }
    }

    async loadCurrentSettings() {
        const settings = await window.electronAPI.getSettings();
        
        // Load appearance settings
        const bgColor = settings.backgroundColor.split(',');
        this.modal.querySelector('#bgColorInput').value = bgColor[0];
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

        // Load AI settings
        if (settings.ai) {
            this.aiSettings.setSettings(settings.ai);
        }
    }

    async saveSettings() {
        const bgColor = this.modal.querySelector('#bgColorInput').value;
        const opacity = this.modal.querySelector('#bgOpacityInput').value;
        const backgroundColor = `rgba(${parseInt(bgColor.substr(1,2), 16)}, ${parseInt(bgColor.substr(3,2), 16)}, ${parseInt(bgColor.substr(5,2), 16)}, ${opacity})`;

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
