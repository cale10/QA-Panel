document.addEventListener('DOMContentLoaded', () => {
    const questionForm = document.getElementById('questionForm');
    const questionInput = document.getElementById('questionInput');
    const answerInput = document.getElementById('answerInput');
    const questionList = document.getElementById('questionList');
    const submitBtn = document.getElementById('submitBtn');
    const lastUsedAppDiv = document.getElementById('lastUsedApp');

    let editingId = null;
    let currentQuestions = [];
    let focusedQuestionIndex = -1;
    let settings = {};
    let lastKeyPressTime = 0;

    // Load existing questions and settings
    loadQuestions();
    loadSettings();
    updateLastUsedApp();

    // Listen for last used app updates
    window.electronAPI.onUpdateLastUsedApp((event, lastUsedApp) => {
        updateLastUsedApp();
        loadQuestions();
    });

    questionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
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
            focusQuestion(currentQuestions.length - 1);
        }
    });

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
                        <button class="edit-btn" data-id="${qa.id}">Edit</button>
                        <button class="delete-btn" data-id="${qa.id}">Delete</button>
                    </div>
                `;
                li.setAttribute('tabindex', '0');
                li.dataset.id = qa.id;
                questionList.appendChild(li);
            });

            // Add event listeners for edit and delete buttons
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => editQuestion(e.target.dataset.id));
            });
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => deleteQuestion(e.target.dataset.id));
            });
        }
    }

    async function loadSettings() {
        settings = await window.electronAPI.getSettings();
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

    function focusQuestion(index) {
        if (index >= 0 && index < currentQuestions.length) {
            focusedQuestionIndex = index;
            questionList.children[index].focus();
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
        loadQuestions();
    }

    document.addEventListener('keydown', (e) => {
        const now = Date.now();
        const isShortcutKey = (e.key >= '1' && e.key <= '9') || 
                              (e.key === 'q' || e.key === 'a' || e.key === 'd') ||
                              (e.key === 'N' && e.shiftKey);
        const isInputField = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

        if (isShortcutKey && !isInputField) {
            e.preventDefault(); // Prevent default behavior for shortcut keys only when not in input fields
            
            if (now - lastKeyPressTime < 250) {
                return; // Ignore key presses within 250ms of a shortcut
            }

            if (e.key >= '1' && e.key <= '9') {
                const index = parseInt(e.key) - 1;
                focusQuestion(index);
            } else if (e.key === 'q' && document.activeElement.tagName === 'LI') {
                const id = document.activeElement.dataset.id;
                editQuestion(id);
                setTimeout(() => questionInput.focus(), 0);
            } else if (e.key === 'a' && document.activeElement.tagName === 'LI') {
                const id = document.activeElement.dataset.id;
                editQuestion(id);
                setTimeout(() => answerInput.focus(), 0);
            } else if (e.key === 'd' && document.activeElement.tagName === 'LI') {
                const id = document.activeElement.dataset.id;
                deleteQuestion(id);
            } else if (e.key === 'N' && e.shiftKey) {
                questionInput.focus();
            }

            lastKeyPressTime = now;
        } else if (e.key === 'Escape') {
            document.activeElement.blur();
        }
    });
});
