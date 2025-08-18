class ShortcutsModal {
    constructor() {
        this.modal = document.createElement('div');
        this.modal.className = 'shortcuts-modal-overlay';
        this.isVisible = false;
        this.createModal();
    }

    createModal() {
        this.modal.innerHTML = `
            <div class="shortcuts-modal">
                <div class="modal-header">
                    <h2>Keyboard Shortcuts</h2>
                    <button class="close-button" id="closeShortcutsBtn" title="Close (Esc)">×</button>
                </div>
                <div class="modal-content">
                    <div class="shortcuts-section">
                        <h3>Global Shortcuts</h3>
                        <div class="shortcuts-list">
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Shift + Space</span>
                                <span class="shortcut-description">Show/Hide App</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Shift + N</span>
                                <span class="shortcut-description">Focus New Question</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Ctrl + Shift + E</span>
                                <span class="shortcut-description">Export Data</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Ctrl + Shift + I</span>
                                <span class="shortcut-description">Import Data</span>
                            </div>
                        </div>
                    </div>
                    <div class="shortcuts-section">
                        <h3>Question List Navigation</h3>
                        <div class="shortcuts-list">
                            <div class="shortcut-item">
                                <span class="shortcut-keys">1-9</span>
                                <span class="shortcut-description">Focus question by number</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Q</span>
                                <span class="shortcut-description">Edit focused question</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">A</span>
                                <span class="shortcut-description">Edit focused answer</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">D</span>
                                <span class="shortcut-description">Delete focused question</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Esc</span>
                                <span class="shortcut-description">Clear focus</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const closeBtn = this.modal.querySelector('#closeShortcutsBtn');
        closeBtn.addEventListener('click', () => this.hide());

        // Add Escape key handler
        this.modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });

        // Close when clicking outside the modal
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
    }

    show() {
        if (!this.isVisible) {
            document.body.appendChild(this.modal);
            this.isVisible = true;
            // Focus the close button for keyboard accessibility
            this.modal.querySelector('#closeShortcutsBtn').focus();
        }
    }

    hide() {
        if (this.isVisible) {
            document.body.removeChild(this.modal);
            this.isVisible = false;
        }
    }
}

// Export the class
window.ShortcutsModal = ShortcutsModal;
