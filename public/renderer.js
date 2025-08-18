document.addEventListener('DOMContentLoaded', () => {
    const questionForm = document.getElementById('questionForm');
    const questionInput = document.getElementById('questionInput');
    const answerInput = document.getElementById('answerInput');
    const questionList = document.getElementById('questionList');
    const submitBtn = document.getElementById('submitBtn');
    const lastUsedAppDiv = document.getElementById('lastUsedApp');
    const settingsBtn = document.getElementById('settingsBtn');

    const generateBtn = document.getElementById('generateBtn');
    const cancelGenBtn = document.getElementById('cancelGenBtn');
    const spinnerEl = document.getElementById('spinner');
    const generateStatus = document.getElementById('generateStatus');
    let editingId = null;
    let currentQuestions = [];
    let isEditing = false;
    let settingsModal = null;

    // Load existing questions and settings
    loadQuestions();
    loadSettings();
    updateLastUsedApp();

    // Listen for last used app updates
    window.electronAPI.onUpdateLastUsedApp((event, lastUsedApp) => {
        updateLastUsedApp();
        loadQuestions();
    });

    settingsBtn.addEventListener('click', () => {
        if (!settingsModal) {
            settingsModal = new SettingsModal();
        }
        settingsModal.show();
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
                li.innerHTML = `
                    <span class="question-number">${index + 1}</span>
                    <strong>Q: ${qa.question}</strong>
                    <p>A: ${qa.answer || 'Not answered yet'}</p>
                    <div class="question-actions">
                        <button class="edit-btn" data-id="${qa.id}" title="Edit this question (Shortcut: q)" aria-label="Edit question ${index + 1}">Edit</button>
                        <button class="delete-btn" data-id="${qa.id}" title="Delete this question (Shortcut: d)" aria-label="Delete question ${index + 1}">Delete</button>
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
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    // SCRUM-10: confirmation before delete
                    const qa = currentQuestions.find(q => q.id === parseInt(id));
                    const text = qa ? `Delete question: "${qa.question}"?` : 'Delete this question?';
                    if (confirm(text)) {
                        deleteQuestion(id);
                    }
                });
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
});
