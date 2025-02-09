class ShortcutsList {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'shortcuts-list';
        this.createContent();
    }

    createContent() {
        this.element.innerHTML = `
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
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const shortcutInputs = this.element.querySelectorAll('.input-field[data-shortcut]');
        const resetButtons = this.element.querySelectorAll('.reset-button');

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

    startShortcutCapture(input) {
        input.classList.add('capturing');
        input.textContent = 'Press keys...';
    }

    stopShortcutCapture() {
        const input = this.element.querySelector('.capturing');
        if (input) {
            input.classList.remove('capturing');
            if (input.textContent === 'Press keys...') {
                const shortcutName = input.dataset.shortcut;
                this.resetShortcut(shortcutName, input);
            }
        }
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

    getElement() {
        return this.element;
    }
}

// Export the class
window.ShortcutsList = ShortcutsList;
