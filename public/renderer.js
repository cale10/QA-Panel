document.addEventListener('DOMContentLoaded', () => {
    const questionForm = document.getElementById('questionForm');
    const questionInput = document.getElementById('questionInput');
    const answerInput = document.getElementById('answerInput');
    const questionList = document.getElementById('questionList');
    const submitBtn = document.getElementById('submitBtn');
    const lastUsedAppDiv = document.getElementById('lastUsedApp');
    const settingsBtn = document.getElementById('settingsBtn');
    const notification = document.getElementById('notification');

    const generateBtn = document.getElementById('generateBtn');
    const cancelGenBtn = document.getElementById('cancelGenBtn');
    const spinnerEl = document.getElementById('spinner');
    const generateStatus = document.getElementById('generateStatus');
    let editingId = null;
    let currentQuestions = [];
    let isEditing = false;
    let settingsModal = null;
    let lastFocusedBeforeSettings = null;

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

    // Settings button opens modal and stores focus return target
    settingsBtn.addEventListener('click', () => {
        lastFocusedBeforeSettings = document.activeElement || settingsBtn;
        if (!settingsModal) {
            settingsModal = new SettingsModal();
        }
        settingsModal.show();
        // Announce opening
        announce('Settings opened');
        // When modal closes, return focus
        const originalHide = settingsModal.hide.bind(settingsModal);
        settingsModal.hide = () => {
            originalHide();
            if (lastFocusedBeforeSettings && typeof lastFocusedBeforeSettings.focus === 'function') {
                lastFocusedBeforeSettings.focus();
                announce('Returned focus to previous element');
            }
        };
    });

    // SCRUM-5: Non-blocking generation
    let abortGen = null;

    generateBtn.addEventListener('click', async () => {
        if (!questionInput.value.trim()) {
            questionInput.focus();
            return;
        }
        // Setup UI state
        spinnerEl.hidden = false;
        cancelGenBtn.hidden = false;
        generateBtn.disabled = true;
        generateStatus.textContent = 'Generating...';

        // Simulated async generation with AbortController
        const controller = new AbortController();
        abortGen = () => controller.abort();

        try {
            const answer = await simulateGeneration(questionInput.value.trim(), { signal: controller.signal });
            if (!controller.signal.aborted) {
                answerInput.value = answer;
                generateStatus.textContent = 'Done';
            }
        } catch (err) {
            if (controller.signal.aborted) {
                generateStatus.textContent = 'Canceled';
            } else {
                console.error(err);
                generateStatus.textContent = 'Error generating';
            }
        } finally {
            spinnerEl.hidden = true;
            cancelGenBtn.hidden = true;
            generateBtn.disabled = false;
            setTimeout(() => (generateStatus.textContent = ''), 1500);
            abortGen = null;
        }
    });

    cancelGenBtn.addEventListener('click', () => {
        if (abortGen) abortGen();
    });

    function simulateGeneration(prompt, { signal }) {
        // This simulates a streaming/long-running generation and supports cancel
        return new Promise((resolve, reject) => {
            const duration = 2500 + Math.random() * 2000;
            const timeout = setTimeout(() => {
                resolve(`Suggested answer for: ${prompt}`);
            }, duration);

            const onAbort = () => {
                clearTimeout(timeout);
                reject(new DOMException('Aborted', 'AbortError'));
            };

            if (signal.aborted) return onAbort();
            signal.addEventListener('abort', onAbort, { once: true });
        });
    }

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

    function announce(message) {
        if (notification) {
            notification.textContent = message;
        }
    }

    async function addOrUpdateQuestion() {
        const question = questionInput.value.trim();
        const answer = answerInput.value.trim();

        if (!question) {
            announce('Please enter a question.');
            return;
        }

        try {
            if (editingId) {
                await window.electronAPI.updateQuestion(editingId, question, answer);
                editingId = null;
                submitBtn.textContent = 'Add Question';
                announce('Question updated');
            } else {
                await window.electronAPI.addQuestion(question, answer);
                announce('Question added');
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
        } catch (err) {
            console.error(err);
            announce('An error occurred while saving the question.');
        }
    }

    async function loadQuestions() {
        try {
            currentQuestions = await window.electronAPI.getQuestions();
            questionList.innerHTML = '';
            if (currentQuestions.length === 0) {
                const p = document.createElement('p');
                p.textContent = 'No questions for this app yet.';
                p.setAttribute('role', 'note');
                questionList.appendChild(p);
            } else {
                currentQuestions.forEach((qa, index) => {
                    const li = document.createElement('li');
                    li.setAttribute('role', 'listitem');
                    li.setAttribute('tabindex', '0');
                    li.setAttribute('aria-label', `Question ${index + 1}: ${qa.question}`);
                    li.innerHTML = `
                        <span class="question-number" aria-hidden="true">${index + 1}</span>
                        <strong>Q: ${qa.question}</strong>
                        <p>A: ${qa.answer || 'Not answered yet'}</p>
                        <div class="question-actions">
                            <button class="edit-btn" data-id="${qa.id}" title="Edit this question (Shortcut: q)" aria-label="Edit question ${index + 1}">Edit</button>
                            <button class="delete-btn" data-id="${qa.id}" title="Delete this question (Shortcut: d)" aria-label="Delete question ${index + 1}">Delete</button>
                        </div>
                    `;
                    li.dataset.id = qa.id;
                    questionList.appendChild(li);
                });

                document.querySelectorAll('.edit-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => editQuestion(e.target.dataset.id));
                });
                document.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.target.dataset.id;
                        const qa = currentQuestions.find(q => q.id === parseInt(id));
                        const text = qa ? `Delete question: "${qa.question}"?` : 'Delete this question?';
                        if (confirm(text)) {
                            try {
                                await deleteQuestion(id);
                                announce('Question deleted');
                            } catch (err) {
                                console.error(err);
                                announce('Failed to delete question');
                            }
                        }
                    });
                });
            }
        } catch (err) {
            console.error(err);
            announce('Failed to load questions');
        }
    }

    async function loadSettings() {
        try {
            const settings = await window.electronAPI.getSettings();
            applySettings(settings);
        } catch (err) {
            console.error(err);
            announce('Failed to load settings');
        }
    }

    function applySettings(settings) {
        document.body.style.backgroundColor = settings.backgroundColor;
        document.body.style.fontFamily = settings.font;
        document.body.style.fontSize = settings.fontSize;
        document.body.style.color = settings.fontColor;
        document.body.style.textShadow = settings.textShadow;
    }

    async function updateLastUsedApp() {
        try {
            const lastUsedApp = await window.electronAPI.getLastUsedApp();
            lastUsedAppDiv.textContent = `Last Used App: ${lastUsedApp || 'None'}`;
        } catch (err) {
            console.error(err);
            announce('Failed to update last used app');
        }
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
        await loadQuestions();
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
            // SCRUM-10: confirmation before delete via keyboard
            const qa = currentQuestions.find(q => q.id === parseInt(id));
            const text = qa ? `Delete question: "${qa.question}"?` : 'Delete this question?';
            if (confirm(text)) {
                deleteQuestion(parseInt(id));
            }
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

    // Deep linking to open settings via hash: #settings
    if (window.location.hash === '#settings') {
        settingsBtn.click();
    }
});
