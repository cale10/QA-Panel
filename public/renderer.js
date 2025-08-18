document.addEventListener('DOMContentLoaded', () => {
    const questionForm = document.getElementById('questionForm');
    const questionInput = document.getElementById('questionInput');
    const answerInput = document.getElementById('answerInput');
    const questionList = document.getElementById('questionList');
    const submitBtn = document.getElementById('submitBtn');
    const lastUsedAppDiv = document.getElementById('lastUsedApp');
    const settingsBtn = document.getElementById('settingsBtn');

    let editingId = null;
    let currentQuestions = [];
    let isEditing = false;
    let settingsModal = null;

    // Shortcuts overlay elements
    const shortcutsOverlay = document.getElementById('shortcutsOverlay');
    const closeShortcutsBtn = document.getElementById('closeShortcutsBtn');

    // Load existing questions and settings
    loadQuestions();
    loadSettings();
    updateLastUsedApp();

    // Listen for last used app updates
    window.electronAPI.onUpdateLastUsedApp((event, lastUsedApp) => {
        updateLastUsedApp();
        loadQuestions();
    });

    // Shortcuts overlay events
    function showShortcutsOverlay() {
        if (shortcutsOverlay) {
            shortcutsOverlay.style.display = 'flex';
            const modal = shortcutsOverlay.querySelector('.shortcuts-modal');
            if (modal) modal.focus();
        }
    }

    function hideShortcutsOverlay() {
        if (shortcutsOverlay) {
            shortcutsOverlay.style.display = 'none';
        }
    }

    if (closeShortcutsBtn) {
        closeShortcutsBtn.addEventListener('click', () => hideShortcutsOverlay());
    }

    // Handle tray "Show Shortcuts" action
    if (window.electronAPI.onShowShortcutsOverlay) {
        window.electronAPI.onShowShortcutsOverlay(() => {
            showShortcutsOverlay();
        });
    }

    // Allow Esc to close the overlay
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && shortcutsOverlay && shortcutsOverlay.style.display !== 'none') {
            hideShortcutsOverlay();
        }
    });

    settingsBtn.addEventListener('click', () => {
        if (!settingsModal) {
            settingsModal = new SettingsModal();
        }
        settingsModal.show();
    });
    // Overlay restore defaults button
    const restoreShortcutsBtn = document.getElementById('restoreShortcutsBtn');
    if (restoreShortcutsBtn) {
        restoreShortcutsBtn.addEventListener('click', async () => {
            // Reset global shortcuts to defaults via settings
            const defaultShortcuts = {
                toggleApp: 'Shift+Space',
                newQuestion: 'Shift+N',
                exportData: 'Ctrl+Shift+E',
                importData: 'Ctrl+Shift+I'
            };
            const currentSettings = await window.electronAPI.getSettings();
            await window.electronAPI.updateSettings({ shortcuts: defaultShortcuts });
            hideShortcutsOverlay();
        });
    }


    questionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await addOrUpdateQuestion();
    });

    answerInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            await addOrUpdateQuestion();
        }
    });

    // Track focus state of input fields
    questionInput.addEventListener('focus', () => {
        isEditing = true;
    });

    answerInput.addEventListener('focus', () => {
        isEditing = true;
    });

    questionInput.addEventListener('blur', () => {
        isEditing = false;
    });

    answerInput.addEventListener('blur', () => {
        isEditing = false;
    });

    async function addOrUpdateQuestion() {
        const question = questionInput.value.trim();
        const answer = answerInput.value.trim();

        if (question) {
            if (editingId) {
                await window.electronAPI.updateQuestion(editingId, question, answer);
                editingId = null;
                submitBtn.textContent = 'Add Question';
            } else {
                await window.electronAPI.addQuestion(question, answer);
            }
            questionInput.value = '';
            answerInput.value = '';
            await loadQuestions();
            // Focus the last added/edited question
            if (currentQuestions.length > 0) {
                const lastIndex = currentQuestions.length - 1;
                const lastQuestion = questionList.children[lastIndex];
                if (lastQuestion) {
                    lastQuestion.focus();
                }
            }
        }
    }

    async function loadQuestions() {
        currentQuestions = await window.electronAPI.getQuestions();
        questionList.innerHTML = '';
        if (currentQuestions.length === 0) {
            questionList.innerHTML = '<p>No questions for this app yet.</p>';
        } else {
            currentQuestions.forEach((qa, index) => {
                const li = document.createElement('li');
                li.setAttribute('role', 'listitem');
                li.setAttribute('aria-label', `Question ${index + 1}: ${qa.question}`);
                li.innerHTML = `
                    <span class="question-number" aria-hidden="true">${index + 1}</span>
                    <strong>Q: ${qa.question}</strong>
                    <p>A: ${qa.answer || 'Not answered yet'}</p>
                    <div class="question-actions">
                        <button class="edit-btn" data-id="${qa.id}" aria-label="Edit question ${index + 1}">Edit</button>
                        <button class="delete-btn" data-id="${qa.id}" aria-label="Delete question ${index + 1}">Delete</button>
                    </div>
                `;
                li.setAttribute('tabindex', '0');
                li.dataset.id = qa.id;
                questionList.appendChild(li);
            });

            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => editQuestion(e.target.dataset.id));
            });
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => deleteQuestion(e.target.dataset.id));
            });
        }
    }

    async function loadSettings() {
        const settings = await window.electronAPI.getSettings();
        applySettings(settings);
    }

    function applySettings(settings) {
        document.body.style.backgroundColor = settings.backgroundColor;
        document.body.style.fontFamily = settings.font;
        document.body.style.fontSize = settings.fontSize;
        document.body.style.color = settings.fontColor;
        document.body.style.textShadow = settings.textShadow;
    }

    async function updateLastUsedApp() {
        const lastUsedApp = await window.electronAPI.getLastUsedApp();
        lastUsedAppDiv.textContent = `Last Used App: ${lastUsedApp || 'None'}`;
    }

    async function editQuestion(id) {
        const qa = currentQuestions.find(q => q.id === parseInt(id));
        if (qa) {
            questionInput.value = qa.question;
            answerInput.value = qa.answer || '';
            editingId = qa.id;
            submitBtn.textContent = 'Update Question';
            questionInput.focus();
        }
    }

    async function deleteQuestion(id) {
        await window.electronAPI.deleteQuestion(parseInt(id));
        loadQuestions();
    }

    document.addEventListener('keydown', (e) => {
        // Don't process shortcuts if we're editing
        if (isEditing) {
            return;
        }

        if (e.key >= '1' && e.key <= '4') {
            e.preventDefault();
            const index = parseInt(e.key) - 1;
            if (index < currentQuestions.length) {

                const li = questionList.children[index];
                li.focus();
            }
        } else if (e.key === 'q' && document.activeElement.tagName === 'LI') {
            e.preventDefault();
            const id = document.activeElement.dataset.id;
            editQuestion(parseInt(id));
        } else if (e.key === 'a' && document.activeElement.tagName === 'LI') {
            e.preventDefault();
            const id = document.activeElement.dataset.id;
            editQuestion(parseInt(id));
            setTimeout(() => answerInput.focus(), 0);
        } else if (e.key === 'd' && document.activeElement.tagName === 'LI') {
            e.preventDefault();
            const id = document.activeElement.dataset.id;
            deleteQuestion(parseInt(id));
        } else if (e.key === 'Escape') {
            document.activeElement.blur();
        } else if (e.key === 'N' && e.shiftKey) {
            e.preventDefault();
            questionInput.focus();
        }
    });

    window.electronAPI.onFocusNewQuestion(() => {
        questionInput.focus();
    });
});
