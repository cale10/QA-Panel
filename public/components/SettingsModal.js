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

                <div class="settings-tabs">
                    <button class="tab-button active" data-tab="appearance">Appearance</button>
                    <button class="tab-button" data-tab="shortcuts">Keyboard Shortcuts</button>
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
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        panels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}Panel`);
        });
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
            shortcuts: {}
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
