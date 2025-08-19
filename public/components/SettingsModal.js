class SettingsModal {
    constructor() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal-overlay';
        this.isVisible = false;
        this.activeShortcutInput = null;
        this.currentKeys = new Set();
        this.createModal();
        // Bind focus trap handler
        this.boundFocusTrapHandler = this.handleFocusTrapKeydown.bind(this);
    }

    createModal() {
        // ... (previous HTML content remains the same until the end of setupEventListeners)
        this.modal.innerHTML = `
            <div class="settings-modal" id="settingsModal" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
                <div class="modal-header">
                    <h2 id="settingsTitle">Settings</h2>
                    <button class="close-button" id="closeSettingsBtn" aria-label="Close settings">×</button>
                </div>

                <div class="settings-tabs" role="tablist" aria-label="Settings sections">
                    <button class="tab-button active" role="tab" aria-selected="true" aria-controls="appearancePanel" id="tab-appearance" data-tab="appearance">Appearance</button>
                    <button class="tab-button" role="tab" aria-selected="false" aria-controls="aiPanel" id="tab-ai" data-tab="ai">AI</button>
                    <button class="tab-button" role="tab" aria-selected="false" aria-controls="shortcutsPanel" id="tab-shortcuts" data-tab="shortcuts">Keyboard Shortcuts</button>
                </div>
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

                        <div class="tab-panel" id="aiPanel" role="tabpanel" aria-labelledby="tab-ai" tabindex="0"></div>

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
                        <div class="tab-panel" id="aiPanel">
                            <div class="setting-group">
                                <label>Provider</label>
                                <select id="aiProvider">
                                    <option value="ollama">Ollama (local)</option>
                                </select>
                            </div>
                            <div class="setting-group">
                                <label>Ollama Base URL</label>
                                <input type="text" id="aiBaseUrl" placeholder="http://127.0.0.1:11434">
                            </div>
                            <div class="setting-group">
                                <label>Model</label>
                                <select id="aiModel">
                                    <option value="">-- Select a model --</option>
                                </select>
                                <button id="refreshModelsBtn" class="reset-button" style="margin-left:8px">Refresh</button>
                            </div>
                            <div class="setting-group">
                                <label>Temperature</label>
                                <input type="number" id="aiTemperature" step="0.1" min="0" max="2" placeholder="0.7">
                            </div>
                            <div class="setting-group">
                                <label>
                                    <input type="checkbox" id="aiRequireManual"> Require manual Generate (opt-in answering)
                                </label>
                            </div>
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

        this.setupEventListeners();
    }

    setupEventListeners() {
        const closeBtn = this.modal.querySelector('#closeSettingsBtn');
        const cancelBtn = this.modal.querySelector('#cancelSettingsBtn');
        const saveBtn = this.modal.querySelector('#saveSettingsBtn');
        const tabButtons = this.modal.querySelectorAll('.tab-button');
        const shortcutInputs = this.modal.querySelectorAll('.input-field[data-shortcut]');
        const resetButtons = this.modal.querySelectorAll('.reset-button');

        const aiProvider = this.modal.querySelector('#aiProvider');
        const aiBaseUrl = this.modal.querySelector('#aiBaseUrl');
        const aiModel = this.modal.querySelector('#aiModel');
        const aiTemperature = this.modal.querySelector('#aiTemperature');
        const aiRequireManual = this.modal.querySelector('#aiRequireManual');
        const refreshModelsBtn = this.modal.querySelector('#refreshModelsBtn');

        refreshModelsBtn?.addEventListener('click', async () => {
            await this.loadModels(aiBaseUrl.value);
        });

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

        // Global keydown/keyup handlers for shortcut capture
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    handleKeyDown(e) {
        if (!this.activeShortcutInput) return;

        e.preventDefault();

        // Add the key to our set
        if (e.key === 'Control') this.currentKeys.add('Ctrl');
        else if (e.key === 'Shift') this.currentKeys.add('Shift');
        else if (e.key === 'Alt') this.currentKeys.add('Alt');
        else if (!['Control', 'Shift', 'Alt'].includes(e.key)) {
            // Capitalize first letter of key for better display
            const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
            this.currentKeys.add(key);
        }

        // Update the display
        this.updateShortcutDisplay();
    }

    handleKeyUp(e) {
        if (!this.activeShortcutInput) return;

        // If it's not a modifier key and we have a combination, complete the capture
        if (!['Control', 'Shift', 'Alt'].includes(e.key)) {
            this.completeShortcutCapture();
        } else {
            // Remove the modifier key from our set
            if (e.key === 'Control') this.currentKeys.delete('Ctrl');
            else if (e.key === 'Shift') this.currentKeys.delete('Shift');
            else if (e.key === 'Alt') this.currentKeys.delete('Alt');
            this.updateShortcutDisplay();
        }
    }

    updateShortcutDisplay() {
        if (this.activeShortcutInput) {
            const keys = Array.from(this.currentKeys);
            this.activeShortcutInput.textContent = keys.length > 0 ? keys.join('+') : 'Press shortcut...';
        }
    }

    startShortcutCapture(input) {
        if (this.activeShortcutInput) {
            this.stopShortcutCapture();
        }

        this.activeShortcutInput = input;
        this.currentKeys.clear();
        input.textContent = 'Press shortcut...';
        input.classList.add('capturing');
    }

    stopShortcutCapture() {
        if (this.activeShortcutInput) {
            this.activeShortcutInput.classList.remove('capturing');
            if (this.currentKeys.size === 0) {
                // Restore the previous value if no new shortcut was set
                this.loadCurrentSettings();
            }
            this.activeShortcutInput = null;
            this.currentKeys.clear();
        }
    }

    completeShortcutCapture() {
        if (this.activeShortcutInput && this.currentKeys.size > 0) {
            const shortcut = Array.from(this.currentKeys).join('+');
            this.activeShortcutInput.textContent = shortcut;
            this.stopShortcutCapture();
        }
    }

    switchTab(tabName) {
        const tabs = this.modal.querySelectorAll('.tab-button');
        const panels = this.modal.querySelectorAll('.tab-panel');

        tabs.forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
            tab.tabIndex = isActive ? 0 : -1;
        });

        panels.forEach(panel => {
            const isActive = panel.id === `${tabName}Panel`;
            panel.classList.toggle('active', isActive);
            panel.hidden = !isActive;
        });

        // Lazy mount AI settings when its tab is opened
        if (tabName === 'ai') {
            this.mountAISettings();
        }
    }

    async mountAISettings() {
        if (this.aiMounted) return;
        try {
            const aiPanel = this.modal.querySelector('#aiPanel');
            if (!aiPanel) return;
            const aiSettings = new AISettings();
            const el = await aiSettings.getElement();
            aiPanel.innerHTML = '';
            aiPanel.appendChild(el);
            this.aiMounted = true;
        } catch (error) {
            console.error('Failed to mount AI settings:', error);
        }
    }


    async show() {
        if (!this.isVisible) {
            document.body.appendChild(this.modal);
            this.isVisible = true;
            await this.loadCurrentSettings();
            // Setup focus trap and initial focus
            this.setupInitialFocus();
            document.addEventListener('keydown', this.boundFocusTrapHandler, true);
        }
    }

    hide() {
        if (this.isVisible) {
            document.body.removeChild(this.modal);
            this.isVisible = false;
            this.stopShortcutCapture();
            // Remove focus trap listener
            document.removeEventListener('keydown', this.boundFocusTrapHandler, true);
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
        const ai = settings.ai || {};
        this.modal.querySelector('#aiProvider').value = ai.provider || 'ollama';
        this.modal.querySelector('#aiBaseUrl').value = ai.baseUrl || 'http://127.0.0.1:11434';
        this.modal.querySelector('#aiTemperature').value = ai.temperature ?? 0.7;
        this.modal.querySelector('#aiRequireManual').checked = !!ai.requireManual;
        await this.loadModels(ai.baseUrl);
        if (ai.model) {
            const modelSel = this.modal.querySelector('#aiModel');
            if (modelSel) modelSel.value = ai.model;
        }
    }

    async loadModels(baseUrl) {
        try {
            if (!baseUrl) baseUrl = 'http://127.0.0.1:11434';
            const modelsResp = await window.electronAPI.ollamaListModels();
            const modelSel = this.modal.querySelector('#aiModel');
            modelSel.innerHTML = '<option value="">-- Select a model --</option>';
            const tags = (modelsResp?.models || modelsResp?.data || modelsResp?.models) || [];
            const list = tags.map(m => m.name || m.model || '').filter(Boolean);
            list.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                modelSel.appendChild(opt);
            });
        } catch (e) {
            console.error('Failed to load models', e);
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
            ai: {
                provider: this.modal.querySelector('#aiProvider').value,
                baseUrl: this.modal.querySelector('#aiBaseUrl').value,
                model: this.modal.querySelector('#aiModel').value,
                temperature: parseFloat(this.modal.querySelector('#aiTemperature').value) || 0.7,
                requireManual: this.modal.querySelector('#aiRequireManual').checked
            }
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

    // Focus trap helpers
    getFocusableElements() {
        const dialog = this.modal.querySelector('.settings-modal');
        if (!dialog) return [];
        const focusableSelectors = [
            'a[href]', 'area[href]', 'input:not([disabled])', 'select:not([disabled])',
            'textarea:not([disabled])', 'button:not([disabled])', 'iframe', 'object', 'embed',
            '[contenteditable]', '[tabindex]:not([tabindex="-1"])'
        ];
        return Array.from(dialog.querySelectorAll(focusableSelectors.join(',')))
            .filter(el => el.offsetParent !== null || el === document.activeElement);
    }

    setupInitialFocus() {
        // Try focusing the close button first; otherwise the first focusable element
        const closeBtn = this.modal.querySelector('#closeSettingsBtn');
        const toFocus = closeBtn || this.getFocusableElements()[0];
        if (toFocus && typeof toFocus.focus === 'function') {
            toFocus.focus();
        }
    }

    handleFocusTrapKeydown(e) {
        if (!this.isVisible) return;
        if (e.key !== 'Tab') return;
        const focusables = this.getFocusableElements();
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;

        if (e.shiftKey) {
            if (active === first || !this.modal.contains(active)) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (active === last || !this.modal.contains(active)) {
                e.preventDefault();
                first.focus();
            }
        }
    }
}

// Export the class
window.SettingsModal = SettingsModal;
