document.addEventListener('DOMContentLoaded', async () => {
    const questionForm = document.getElementById('questionForm');
    const questionInput = document.getElementById('questionInput');
    const answerInput = document.getElementById('answerInput');
    const questionList = document.getElementById('questionList');
    const submitBtn = document.getElementById('submitBtn');
    const lastUsedAppDiv = document.getElementById('lastUsedApp');
    const settingsBtn = document.getElementById('settingsBtn');
    const contextControlsDiv = document.getElementById('contextControls');

    let editingId = null;
    let currentQuestions = [];
    let isEditing = false;
    let settingsModal = null;
    let ollamaService = new OllamaService();
    let contextControls = new ContextControls();

    // Initialize context controls
    contextControlsDiv.appendChild(await contextControls.getElement());

    // Load existing questions and settings
    await Promise.all([
        loadQuestions(),
        loadSettings(),
        updateLastUsedApp()
    ]);

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
                const settings = await window.electronAPI.getSettings();
                let finalAnswer = answer;

                // Auto-generate answer if enabled and no answer provided
                if (settings.ai?.enabled && settings.ai?.autoAnswer && !answer) {
                    try {
                        showLoading(submitBtn, 'Generating answer...');
                        const contextQuestions = await window.electronAPI.getContextualQuestions(question);
                        const prompt = ollamaService.createPrompt(
                            settings.lastUsedApp,
                            question,
                            contextQuestions,
                            settings.ai.contextMemory?.enabled
                        );

                        // Check if Ollama is running
                        const isOllamaRunning = await ollamaService.isOllamaRunning();
                        if (!isOllamaRunning) {
                            throw new Error('Ollama is not running. Please start Ollama and try again.');
                        }

                        finalAnswer = await ollamaService.generateAnswer(settings.ai.model, prompt);
                    } catch (error) {
                        console.error('Error generating AI answer:', error);
                        alert(`Error generating answer: ${error.message}`);
                        finalAnswer = '';
                    } finally {
                        hideLoading(submitBtn, 'Add Question');
                    }
                }

                await window.electronAPI.addQuestion(question, finalAnswer);
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
            questionList.innerHTML = '<p style="color: #666; text-align: center;">No questions for this app yet.</p>';
        } else {
            currentQuestions.forEach((qa, index) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="question-number">${index + 1}</span>
                    <strong>Q: ${qa.question}</strong>
                    <p>A: ${qa.answer || 'Not answered yet'}</p>
                    <div class="question-actions">
                        ${!qa.answer ? `<button class="ai-answer-btn" data-id="${qa.id}">🤖 Generate Answer</button>` : ''}
                        <button class="edit-btn" data-id="${qa.id}">Edit</button>
                        <button class="delete-btn" data-id="${qa.id}">Delete</button>
                    </div>
                    ${qa.isAIGenerated ? '<span class="ai-generated-badge">🤖 AI Generated</span>' : ''}
                    ${qa.referencesContext ? '<span class="reference-badge">📚 References Context</span>' : ''}
                `;
                li.setAttribute('tabindex', '0');
                li.dataset.id = qa.id;
                questionList.appendChild(li);
            });

            // Add event listeners for buttons
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => editQuestion(e.target.dataset.id));
            });
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => deleteQuestion(e.target.dataset.id));
            });
            document.querySelectorAll('.ai-answer-btn').forEach(btn => {
                btn.addEventListener('click', (e) => generateAnswer(e.target.dataset.id));
            });
        }
    }

    async function generateAnswer(id) {
        const qa = currentQuestions.find(q => q.id === parseInt(id));
        if (!qa) return;

        const button = document.querySelector(`.ai-answer-btn[data-id="${id}"]`);
        if (!button) return;

        try {
            showLoading(button, 'Generating...');
            const settings = await window.electronAPI.getSettings();
            if (!settings.ai?.enabled) {
                throw new Error('AI features are not enabled');
            }

            // Check if Ollama is running
            const isOllamaRunning = await ollamaService.isOllamaRunning();
            if (!isOllamaRunning) {
                throw new Error('Ollama is not running. Please start Ollama and try again.');
            }

            const contextQuestions = await window.electronAPI.getContextualQuestions(qa.question);
            const prompt = ollamaService.createPrompt(
                settings.lastUsedApp,
                qa.question,
                contextQuestions,
                settings.ai.contextMemory?.enabled
            );
            const answer = await ollamaService.generateAnswer(settings.ai.model, prompt);

            await window.electronAPI.updateQuestion(parseInt(id), qa.question, answer, true);
            await loadQuestions();
        } catch (error) {
            console.error('Error generating answer:', error);
            alert(`Error generating answer: ${error.message}`);
            button.textContent = '🤖 Error - Try Again';
        } finally {
            hideLoading(button, '🤖 Generate Answer');
        }
    }

    function showLoading(element, text) {
        element.disabled = true;
        element.innerHTML = `
            <div class="loading-indicator">
                <div class="spinner"></div>
                ${text}
            </div>
        `;
    }

    function hideLoading(element, text) {
        element.disabled = false;
        element.textContent = text;
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
        if (confirm('Are you sure you want to delete this question?')) {
            await window.electronAPI.deleteQuestion(parseInt(id));
            loadQuestions();
        }
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
