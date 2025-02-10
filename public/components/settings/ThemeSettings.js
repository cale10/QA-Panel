class ThemeSettings {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'theme-settings';
        this.initialized = false;
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
            const settings = await window.electronAPI.getSettings();
            
            this.element.innerHTML = `
                <div class="section-group">
                    <h3 class="section-title">Theme Settings</h3>
                    <div class="setting-group">
                        <label>Theme Mode</label>
                        <select id="themeMode" class="select-control">
                            <option value="dark" ${settings.theme?.mode === 'dark' ? 'selected' : ''}>Dark</option>
                            <option value="light" ${settings.theme?.mode === 'light' ? 'selected' : ''}>Light</option>
                            <option value="system" ${settings.theme?.mode === 'system' ? 'selected' : ''}>System</option>
                        </select>
                        <p class="setting-description">Choose your preferred theme mode</p>
                    </div>

                    <div class="setting-group">
                        <label>Background Color</label>
                        <div class="color-picker">
                            <input type="color" id="backgroundColor" value="${settings.theme?.backgroundColor || '#202124'}">
                            <input type="text" class="color-text" value="${settings.theme?.backgroundColor || '#202124'}">
                            <button class="reset-color" title="Reset to default">↺</button>
                        </div>
                        <p class="setting-description">Main background color</p>
                    </div>

                    <div class="setting-group">
                        <label>Accent Color</label>
                        <div class="color-picker">
                            <input type="color" id="accentColor" value="${settings.theme?.accentColor || '#ffa500'}">
                            <input type="text" class="color-text" value="${settings.theme?.accentColor || '#ffa500'}">
                            <button class="reset-color" title="Reset to default">↺</button>
                        </div>
                        <p class="setting-description">Color for buttons and highlights</p>
                    </div>

                    <div class="setting-group">
                        <label>Text Color</label>
                        <div class="color-picker">
                            <input type="color" id="textColor" value="${settings.theme?.textColor || '#ffffff'}">
                            <input type="text" class="color-text" value="${settings.theme?.textColor || '#ffffff'}">
                            <button class="reset-color" title="Reset to default">↺</button>
                        </div>
                        <p class="setting-description">Main text color</p>
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
        const colorInputs = this.element.querySelectorAll('input[type="color"]');
        const colorTexts = this.element.querySelectorAll('.color-text');
        const resetButtons = this.element.querySelectorAll('.reset-color');
        const themeMode = this.element.querySelector('#themeMode');

        const defaults = {
            backgroundColor: '#202124',
            accentColor: '#ffa500',
            textColor: '#ffffff'
        };

        colorInputs.forEach((input, index) => {
            const textInput = colorTexts[index];
            const resetBtn = resetButtons[index];
            const defaultColor = defaults[input.id];

            input.addEventListener('input', (e) => {
                textInput.value = e.target.value;
                this.updatePreview();
                this.saveSettings();
            });

            textInput.addEventListener('change', (e) => {
                if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                    input.value = e.target.value;
                    this.updatePreview();
                    this.saveSettings();
                } else {
                    textInput.value = input.value;
                }
            });

            resetBtn.addEventListener('click', () => {
                input.value = defaultColor;
                textInput.value = defaultColor;
                this.updatePreview();
                this.saveSettings();
            });
        });

        themeMode.addEventListener('change', () => {
            this.updatePreview();
            this.saveSettings();
        });
    }

    updatePreview() {
        const preview = this.element.querySelector('.theme-preview');
        const backgroundColor = this.element.querySelector('#backgroundColor').value;
        const accentColor = this.element.querySelector('#accentColor').value;
        const textColor = this.element.querySelector('#textColor').value;

        preview.style.backgroundColor = backgroundColor;
        preview.style.color = textColor;
        
        const previewButton = preview.querySelector('.preview-button');
        previewButton.style.backgroundColor = accentColor;
        previewButton.style.color = backgroundColor;

        const previewInput = preview.querySelector('.preview-input');
        previewInput.style.borderColor = accentColor;
    }

    async saveSettings() {
        try {
            const settings = await window.electronAPI.getSettings();
            
            const newSettings = {
                ...settings,
                theme: {
                    mode: this.element.querySelector('#themeMode').value,
                    backgroundColor: this.element.querySelector('#backgroundColor').value,
                    accentColor: this.element.querySelector('#accentColor').value,
                    textColor: this.element.querySelector('#textColor').value
                }
            };

            await window.electronAPI.updateSettings(newSettings);
            document.body.style.setProperty('--background-color', newSettings.theme.backgroundColor);
            document.body.style.setProperty('--accent-color', newSettings.theme.accentColor);
            document.body.style.setProperty('--text-color', newSettings.theme.textColor);
        } catch (error) {
            console.error('Error saving theme settings:', error);
        }
    }

    async getElement() {
        await this.initPromise;
        return this.element;
    }
}

// Export the class
window.ThemeSettings = ThemeSettings;
