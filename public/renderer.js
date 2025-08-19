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
    const aiOptInToggle = document.getElementById('aiOptInToggle');
    const aiResultsPanel = document.getElementById('aiResultsPanel');
    const aiResultText = document.getElementById('aiResultText');
    const aiError = document.getElementById('aiError');
    const copyToAnswerBtn = document.getElementById('copyToAnswerBtn');
    const clearResultBtn = document.getElementById('clearResultBtn');
    const ollamaService = (typeof window !== 'undefined' && window.OllamaService) ? new OllamaService() : null;

    // Regression guard: detect merge conflict markers in DOM
    try {
        const __html = document.documentElement?.innerHTML || '';
        if (__html.includes('<<<<<<<') || __html.includes('=======') || __html.includes('>>>>>>>')) {
            console.error('Merge conflict markers detected in DOM. Please resolve before shipping. [SCRUM-41]');
        }
    } catch (_) {}

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

    // SCRUM-22/33: Initialize opt-in state from settings
    (async () => {
        try {
            const s = await window.electronAPI.getSettings();
            if (aiOptInToggle) aiOptInToggle.checked = !!s.ai?.enabled;
        } catch {}
    })();
    aiOptInToggle?.addEventListener('change', async (e) => {
        try {
            const s = await window.electronAPI.getSettings();
            await window.electronAPI.updateSettings({ ...s, ai: { ...(s.ai||{}), enabled: e.target.checked } });
            announce(e.target.checked ? 'AI enabled' : 'AI disabled');
        } catch (err) { console.error(err); announce('Failed to update AI setting'); }
    });

    // SCRUM-33/34: Generate via Ollama and populate results panel
    async function doGenerate() {
        aiError.style.display = 'none';
        aiResultsPanel.style.display = 'none';
        aiResultText.textContent = '';

        const s = await window.electronAPI.getSettings();
        if (!s.ai?.enabled) {
            announce('Enable AI to generate answers');
            return;
        }
        const useVision = !!s.ai?.useVision;
        let model = useVision ? (s.ai?.visionModel) : (s.ai?.model);
        if (!model && ollamaService) {
            try {
                const cat = await ollamaService.catalogModels();
                model = useVision ? (cat.defaults?.defaultVisionModel) : (cat.defaults?.defaultRegularModel);
            } catch (e) { /* ignore */ }
        }
        if (!model) { model = useVision ? 'llava:latest' : 'llama2'; }
        const prompt = questionInput.value.trim();
        if (!prompt) { questionInput.focus(); return; }
        spinnerEl.hidden = false; cancelGenBtn.hidden = false; generateBtn.disabled = true; generateStatus.textContent = 'Generating...';
        let canceled = false;
        const controller = new AbortController();
        abortGen = () => { canceled = true; controller.abort(); };
        try {
            // Note: imageData handling can be added when UI allows attaching an image
            const resp = await window.electronAPI.ollamaGenerateAnswer(model, prompt, null);
            if (canceled) return;
            aiResultText.textContent = resp || '';
            aiResultsPanel.style.display = 'block';
            generateStatus.textContent = resp ? 'Done' : 'No content';
        } catch (err) {
            console.error(err);
            aiError.textContent = err?.message || 'Generation failed';
            aiError.style.display = 'block';
            aiResultsPanel.style.display = 'block';
            generateStatus.textContent = 'Error';
        } finally {
            spinnerEl.hidden = true; cancelGenBtn.hidden = true; generateBtn.disabled = false;
            setTimeout(() => (generateStatus.textContent = ''), 1500);
            abortGen = null;
        }
    }

    generateBtn?.addEventListener('click', doGenerate);
    cancelGenBtn?.addEventListener('click', () => { if (abortGen) abortGen(); });
    copyToAnswerBtn?.addEventListener('click', () => { answerInput.value = aiResultText.textContent; answerInput.focus(); });
    clearResultBtn?.addEventListener('click', () => { aiResultText.textContent=''; aiResultsPanel.style.display='none'; aiError.style.display='none'; });
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
    settingsBtn?.addEventListener('click', () => {
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
            await window.electronAPI.updateSettings({ shortcuts: defaultShortcuts });
            hideShortcutsOverlay();
        });
    }


    // Minimal Generate flow using Ollama via IPC




    cancelGenBtn.addEventListener('click', () => {
        if (abortGen) abortGen();
    });
    // Vision generation
    const visionGenBtn = document.getElementById('visionGenBtn');
    if (visionGenBtn) {
        visionGenBtn.addEventListener('click', async () => {
            try {
                // Honor model setting; if unspecified, use OllamaService catalog defaults
                const settings = await window.electronAPI.getSettings();
                let model = settings?.ai?.visionModel;
                if (!model && ollamaService) {
                    try {
                        const cat = await ollamaService.catalogModels();
                        model = cat.defaults?.defaultVisionModel;
                    } catch (e) { /* ignore */ }
                }
                if (!model) model = 'minicpm-v:latest';

                // Ensure question exists
                const question = questionInput.value.trim();
                if (!question) {
                    questionInput.focus();
                    return;
                }

                // Request screenshot with consent
                const { allowed, image } = await window.electronAPI.captureScreenWithConsent();
                if (!allowed) {
                    generateStatus.textContent = 'Screenshot denied';
                    setTimeout(() => (generateStatus.textContent = ''), 1500);
                    return;
                }
                if (!image) {
                    generateStatus.textContent = 'No image captured';
                    setTimeout(() => (generateStatus.textContent = ''), 1500);
                    return;
                }

                // Call Ollama vision generate
                spinnerEl.hidden = false;
                generateBtn.disabled = true;
                visionGenBtn.disabled = true;
                generateStatus.textContent = 'Generating (vision)...';

                const prompt = `You are assisting with ${settings.lastUsedApp || 'this application'}. Analyze the screenshot and answer: ${question}`;
                const response = await window.electronAPI.ollamaGenerateAnswer(model, prompt, image);

                if (response) {
                    answerInput.value = String(response);
                    generateStatus.textContent = 'Done (vision)';
                } else {
                    generateStatus.textContent = 'No response';
                }
            } catch (err) {
                console.error(err);
                generateStatus.textContent = 'Error (vision)';
            } finally {
                spinnerEl.hidden = true;
                generateBtn.disabled = false;
                if (visionGenBtn) visionGenBtn.disabled = false;
                setTimeout(() => (generateStatus.textContent = ''), 1500);
            }
        });
    }


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

                    const formatText = (text) => {
                        if (!text) return '';
                        // Basic fenced code block support: ```code```
                        const fence = /```([\s\S]*?)```/g;
                        let html = text.replace(fence, (m, code) => {
                            const safe = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                            return `<pre><code>${safe}</code></pre>`;
                        });
                        // Inline code: `code`
                        html = html.replace(/`([^`]+)`/g, (m, code) => `<code>${code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code>`);
                        // Escape remaining angle brackets to avoid injection, except allowed tags
                        html = html.replace(/<(?!\/?(pre|code)\b)/g, '&lt;');
                        return html;
                    };

                    const questionHTML = formatText(qa.question);
                    const answerHTML = formatText(qa.answer || '');

                    li.innerHTML = `
                        <span class="question-number" aria-hidden="true">${index + 1}</span>
                        <div class="qa-question">
                            <span class="qa-label" aria-hidden="true">Q</span>
                            <div class="qa-text">${questionHTML}</div>
                        </div>
                        <div class="qa-answer">
                            <span class="qa-label" aria-hidden="true">A</span>
                            <div class="qa-text">${answerHTML || '<em>Not answered yet</em>'}</div>
                        </div>
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
        settingsBtn?.click();
    }
});
