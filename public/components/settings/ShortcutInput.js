class ShortcutInput {
    constructor(shortcutName, defaultValue) {
        this.element = document.createElement('div');
        this.element.className = 'shortcut-input';
        this.shortcutName = shortcutName;
        this.defaultValue = defaultValue;
        this.createContent();
    }

    createContent() {
        this.element.innerHTML = `
            <div class="input-field" tabindex="0" data-shortcut="${this.shortcutName}">${this.defaultValue}</div>
            <button class="reset-button">Reset</button>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const input = this.element.querySelector('.input-field');
        const resetBtn = this.element.querySelector('.reset-button');

        input.addEventListener('click', () => this.startCapture());
        input.addEventListener('blur', () => this.stopCapture());
        input.addEventListener('keydown', (e) => this.handleKeyDown(e));

        resetBtn.addEventListener('click', () => this.reset());
    }

    startCapture() {
        const input = this.element.querySelector('.input-field');
        input.classList.add('capturing');
        input.textContent = 'Press keys...';
    }

    stopCapture() {
        const input = this.element.querySelector('.input-field');
        input.classList.remove('capturing');
        if (input.textContent === 'Press keys...') {
            this.reset();
        }
    }

    handleKeyDown(e) {
        if (!this.element.querySelector('.capturing')) return;

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
            const input = this.element.querySelector('.input-field');
            input.textContent = keys.join(' + ');
            input.classList.remove('capturing');
            input.blur();
        }
    }

    reset() {
        const input = this.element.querySelector('.input-field');
        input.textContent = this.defaultValue;
        input.classList.remove('capturing');
    }

    getValue() {
        return this.element.querySelector('.input-field').textContent;
    }

    setValue(value) {
        this.element.querySelector('.input-field').textContent = value;
    }

    getElement() {
        return this.element;
    }
}

// Export the class
window.ShortcutInput = ShortcutInput;
