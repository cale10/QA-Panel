document.addEventListener('DOMContentLoaded', () => {
    const questionForm = document.getElementById('questionForm');
    const questionInput = document.getElementById('questionInput');
    const answerInput = document.getElementById('answerInput');
    const questionList = document.getElementById('questionList');
    const submitBtn = document.getElementById('submitBtn');
    const lastUsedAppDiv = document.getElementById('lastUsedApp');
    const settingsBtn = document.getElementById('settingsBtn');
    const notification = document.getElementById('notification');

    let editingId = null;
    let currentQuestions = [];
    let isEditing = false;
    let settingsModal = null;
    let lastFocusedBeforeSettings = null;

    // Load existing questions and settings
    loadQuestions();
    loadSettings();
    updateLastUsedApp();

    // Listen for last used app updates
    window.electronAPI.onUpdateLastUsedApp((event, lastUsedApp) => {
        updateLastUsedApp();
        loadQuestions();
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
                    li.innerHTML = `
                        <span class="question-number" aria-hidden="true">${index + 1}</span>
                        <strong>Q: ${qa.question}</strong>
                        <p>A: ${qa.answer || 'Not answered yet'}</p>
                        <div class="question-actions">
                            <button class="edit-btn" data-id="${qa.id}" aria-label="Edit question ${index + 1}">Edit</button>
                            <button class="delete-btn" data-id="${qa.id}" aria-label="Delete question ${index + 1}">Delete</button>
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
                        try {
                            await deleteQuestion(id);
                            announce('Question deleted');
                        } catch (err) {
                            console.error(err);
                            announce('Failed to delete question');
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

    // Deep linking to open settings via hash: #settings
    if (window.location.hash === '#settings') {
        settingsBtn.click();
    }
});
