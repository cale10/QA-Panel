class ThemeSettings {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'theme-settings';
        this.initialized = false;
        this.themeService = new ThemeService();
        this.initPromise = this.init();
    }

    async init() {
        if (!this.initialized) {
            await this.createContent();
            this.initialized = true;
        }
    }

    async createContent() {
        try {
            await this.themeService.waitForInit();
            const settings = await window.electronAPI.getSettings();
            const themes = this.themeService.getAllThemes();
            
            this.element.innerHTML = `
                <div class="section-group">
                    <h3 class="section-title">Theme Settings</h3>
                    <div class="setting-group">
                        <label>Select Theme</label>
                        <select id="themeSelect" class="select-control">
                            ${Object.entries(themes).map(([id, theme]) => `
                                <option value="${id}" ${settings.theme?.mode === id ? 'selected' : ''}>
                                    ${theme.name}
                                </option>
                            `).join('')}
                        </select>
                        <p class="setting-description">Choose from available themes or create your own</p>
                    </div>

                    <div class="setting-group">
                        <button id="createThemeBtn" class="action-button">
                            <span class="icon">+</span> Create New Theme
                        </button>
                        <button id="deleteThemeBtn" class="action-button danger" style="display: none;">
                            <span class="icon">🗑️</span> Delete Theme
                        </button>
                    </div>

                    <div id="themeEditor" class="theme-editor" style="display: none;">
                        <div class="setting-group">
                            <label>Theme Name</label>
                            <input type="text" id="themeName" class="input-field" placeholder="Enter theme name">
                        </div>

                        <div class="setting-group">
                            <label>Background Color</label>
                            <div class="color-picker">
                                <input type="color" id="backgroundColor">
                                <input type="text" class="color-text">
                            </div>
                        </div>

                        <div class="setting-group">
                            <label>Secondary Background Color</label>
                            <div class="color-picker">
                                <input type="color" id="secondaryBackgroundColor">
                                <input type="text" class="color-text">
                            </div>
                        </div>

                        <div class="setting-group">
                            <label>Accent Color</label>
                            <div class="color-picker">
                                <input type="color" id="accentColor">
                                <input type="text" class="color-text">
                            </div>
                        </div>

                        <div class="setting-group">
                            <label>Text Color</label>
                            <div class="color-picker">
                                <input type="color" id="textColor">
                                <input type="text" class="color-text">
                            </div>
                        </div>

                        <div class="setting-group">
                            <label>Border Color</label>
                            <div class="color-picker">
                                <input type="color" id="borderColor">
                                <input type="text" class="color-text">
                            </div>
                        </div>

                        <div class="setting-group">
                            <label>Input Background Color</label>
                            <div class="color-picker">
                                <input type="color" id="inputBackgroundColor">
                                <input type="text" class="color-text">
                            </div>
                        </div>

                        <div class="setting-group preview-group">
                            <label>Theme Preview</label>
                            <div class="theme-preview">
                                <div class="preview-header">
                                    <span class="preview-title">Preview</span>
                                    <button class="preview-button">Action</button>
                                </div>
                                <div class="preview-content">
                                    <p>Sample text</p>
                                    <div class="preview-input"></div>
                                </div>
                            </div>
                        </div>

                        <div class="setting-group">
                            <button id="saveThemeBtn" class="action-button">
                                <span class="icon">💾</span> Save Theme
                            </button>
                            <button id="cancelThemeBtn" class="action-button">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.setupEventListeners();
        } catch (error) {
            console.error('Error creating theme settings:', error);
            this.element.innerHTML = `
                <div class="error-message">
                    <h3>Error Loading Theme Settings</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    setupEventListeners() {
        const themeSelect = this.element.querySelector('#themeSelect');
        const createThemeBtn = this.element.querySelector('#createThemeBtn');
        const deleteThemeBtn = this.element.querySelector('#deleteThemeBtn');
        const themeEditor = this.element.querySelector('#themeEditor');
        const saveThemeBtn = this.element.querySelector('#saveThemeBtn');
        const cancelThemeBtn = this.element.querySelector('#cancelThemeBtn');
        const colorInputs = this.element.querySelectorAll('input[type="color"]');
        const colorTexts = this.element.querySelectorAll('.color-text');

        // Theme selection
        themeSelect.addEventListener('change', async (e) => {
            const selectedTheme = e.target.value;
            await this.themeService.applyTheme(selectedTheme);
            
            // Show/hide delete button for custom themes
            const isCustomTheme = this.themeService.themes.customThemes[selectedTheme];
            deleteThemeBtn.style.display = isCustomTheme ? 'inline-block' : 'none';
        });

        // Create new theme
        createThemeBtn.addEventListener('click', () => {
            themeEditor.style.display = 'block';
            this.populateThemeEditor();
        });

        // Delete theme
        deleteThemeBtn.addEventListener('click', async () => {
            const selectedTheme = themeSelect.value;
            if (confirm(`Are you sure you want to delete the theme "${this.themeService.getTheme(selectedTheme).name}"?`)) {
                await this.themeService.deleteCustomTheme(selectedTheme);
                await this.createContent(); // Refresh the component
            }
        });

        // Save theme
        saveThemeBtn.addEventListener('click', async () => {
            const themeName = this.element.querySelector('#themeName').value.trim();
            if (!themeName) {
                alert('Please enter a theme name');
                return;
            }

            const theme = {
                backgroundColor: this.element.querySelector('#backgroundColor').value,
                secondaryBackgroundColor: this.element.querySelector('#secondaryBackgroundColor').value,
                accentColor: this.element.querySelector('#accentColor').value,
                textColor: this.element.querySelector('#textColor').value,
                borderColor: this.element.querySelector('#borderColor').value,
                inputBackgroundColor: this.element.querySelector('#inputBackgroundColor').value,
                hoverBackgroundColor: 'rgba(255, 255, 255, 0.03)',
                shadowColor: 'rgba(0, 0, 0, 0.2)'
            };

            const themeId = await this.themeService.addCustomTheme(themeName, theme);
            await this.createContent(); // Refresh the component
            this.element.querySelector('#themeSelect').value = themeId;
            themeEditor.style.display = 'none';
        });

        // Cancel theme creation
        cancelThemeBtn.addEventListener('click', () => {
            themeEditor.style.display = 'none';
        });

        // Color picker functionality
        colorInputs.forEach((input, index) => {
            const textInput = colorTexts[index];

            input.addEventListener('input', (e) => {
                textInput.value = e.target.value;
                this.updatePreview();
            });

            textInput.addEventListener('change', (e) => {
                if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                    input.value = e.target.value;
                    this.updatePreview();
                } else {
                    textInput.value = input.value;
                }
            });
        });
    }

    populateThemeEditor() {
        const currentTheme = this.themeService.getTheme(this.themeService.getCurrentTheme()) || {
            backgroundColor: '#202124',
            secondaryBackgroundColor: '#2d2e31',
            accentColor: '#ffa500',
            textColor: '#ffffff',
            borderColor: '#444444',
            inputBackgroundColor: '#1e1e1e'
        };
        
        // Reset theme name for new themes
        this.element.querySelector('#themeName').value = '';

        // Set color values
        const colorInputs = {
            backgroundColor: currentTheme.backgroundColor || '#202124',
            secondaryBackgroundColor: currentTheme.secondaryBackgroundColor || '#2d2e31',
            accentColor: currentTheme.accentColor || '#ffa500',
            textColor: currentTheme.textColor || '#ffffff',
            borderColor: currentTheme.borderColor || '#444444',
            inputBackgroundColor: currentTheme.inputBackgroundColor || '#1e1e1e'
        };

        Object.entries(colorInputs).forEach(([id, value]) => {
            const input = this.element.querySelector(`#${id}`);
            const textInput = input.nextElementSibling;
            input.value = value;
            textInput.value = value;
        });

        this.updatePreview();
    }

    updatePreview() {
        const preview = this.element.querySelector('.theme-preview');
        const backgroundColor = this.element.querySelector('#backgroundColor').value;
        const secondaryBackgroundColor = this.element.querySelector('#secondaryBackgroundColor').value;
        const accentColor = this.element.querySelector('#accentColor').value;
        const textColor = this.element.querySelector('#textColor').value;
        const borderColor = this.element.querySelector('#borderColor').value;
        const inputBackgroundColor = this.element.querySelector('#inputBackgroundColor').value;

        // Apply colors to preview
        preview.style.backgroundColor = backgroundColor;
        preview.style.color = textColor;
        preview.style.border = `1px solid ${borderColor}`;
        
        const previewButton = preview.querySelector('.preview-button');
        previewButton.style.backgroundColor = accentColor;
        previewButton.style.color = backgroundColor;
        previewButton.style.border = `1px solid ${borderColor}`;

        const previewInput = preview.querySelector('.preview-input');
        previewInput.style.backgroundColor = inputBackgroundColor;
        previewInput.style.borderColor = borderColor;

        const previewHeader = preview.querySelector('.preview-header');
        previewHeader.style.backgroundColor = secondaryBackgroundColor;
        previewHeader.style.borderBottom = `1px solid ${borderColor}`;
    }

    async saveSettings() {
        try {
            const themeSelect = this.element.querySelector('#themeSelect');
            if (!themeSelect) return;

            const selectedTheme = themeSelect.value;
            await this.themeService.applyTheme(selectedTheme);
        } catch (error) {
            console.error('Error saving theme settings:', error);
        }
    }

    async getElement() {
        await this.initPromise;
        return this.element;
    }

    getSettings() {
        const themeSelect = this.element.querySelector('#themeSelect');
        if (!themeSelect) return {};

        const currentTheme = this.themeService.getTheme(themeSelect.value) || {};
        return {
            mode: themeSelect.value,
            ...currentTheme
        };
    }

    async setSettings(settings) {
        if (!settings?.theme) return;
        await this.initPromise;

        const themeSelect = this.element.querySelector('#themeSelect');
        if (themeSelect) {
            themeSelect.value = settings.theme.mode || 'dark';
            await this.themeService.applyTheme(themeSelect.value);
            
            // Show/hide delete button for custom themes
            const deleteThemeBtn = this.element.querySelector('#deleteThemeBtn');
            const isCustomTheme = this.themeService.themes.customThemes[themeSelect.value];
            if (deleteThemeBtn) {
                deleteThemeBtn.style.display = isCustomTheme ? 'inline-block' : 'none';
            }
        }
    }
}

// Export the class
window.ThemeSettings = ThemeSettings;
