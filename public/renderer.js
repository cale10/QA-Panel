document.addEventListener('DOMContentLoaded', async () => {
    const questionForm = document.getElementById('questionForm');
    const questionInput = document.getElementById('questionInput');
    const answerInput = document.getElementById('answerInput');
    const questionList = document.getElementById('questionList');
    const submitBtn = document.getElementById('submitBtn');
    const lastUsedAppDiv = document.getElementById('lastUsedApp');
    const settingsBtn = document.getElementById('settingsBtn');
    const autoCapture = document.getElementById('autoCapture');
    const capturePreview = document.querySelector('.capture-preview');
    const capturePreviewImg = document.getElementById('capturePreview');
    const captureCloseBtn = document.querySelector('.capture-preview .close-btn');

    // Initialize theme service
    let themeService;
    try {
        themeService = new ThemeService();
        await themeService.waitForInit();
    } catch (error) {
        console.error('Error initializing theme service:', error);
        // Use default theme if service fails
        document.documentElement.style.setProperty('--background-color', '#202124');
        document.documentElement.style.setProperty('--secondary-background-color', '#2d2e31');
        document.documentElement.style.setProperty('--accent-color', '#ffa500');
        document.documentElement.style.setProperty('--text-color', '#ffffff');
        document.documentElement.style.setProperty('--border-color', '#444444');
        document.documentElement.style.setProperty('--input-background-color', '#1e1e1e');
        document.documentElement.style.setProperty('--hover-background-color', 'rgba(255, 255, 255, 0.03)');
        document.documentElement.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.2)');
    }

    let editingId = null;
    let currentQuestions = [];
    let isEditing = false;
    let settingsModal = null;
    let ollamaService = new OllamaService();
    let streamingAnswer = '';
    let streamingInterval = null;
    let lastCapturedImage = null;
    let typingSpeed = 1; // Characters per frame

    // Load auto-capture setting
    const settings = await window.electronAPI.getSettings();
    autoCapture.checked = settings.ai?.autoCapture || false;

    // Save auto-capture setting
    autoCapture.addEventListener('change', async () => {
        const currentSettings = await window.electronAPI.getSettings();
        const newSettings = {
            ...currentSettings,
            ai: {
                ...currentSettings.ai,
                autoCapture: autoCapture.checked,
                onboardingSeen: {
                    ...currentSettings.ai?.onboardingSeen,
                    autoCapture: currentSettings.ai?.onboardingSeen?.autoCapture || false
                }
            }
        };
        await window.electronAPI.updateSettings(newSettings);

        // Show onboarding tooltip once when enabling
        if (autoCapture.checked && !newSettings.ai.onboardingSeen.autoCapture) {
            showOnboardingTooltip();
            const updated = await window.electronAPI.getSettings();
            await window.electronAPI.updateSettings({
                ...updated,
                ai: {
                    ...updated.ai,
                    onboardingSeen: { ...(updated.ai?.onboardingSeen || {}), autoCapture: true }
                }
            });
        }
    });

    function showOnboardingTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'onboarding-tooltip';
        tooltip.setAttribute('role', 'dialog');
        tooltip.setAttribute('aria-live', 'polite');
        tooltip.innerHTML = `
            <div class="tooltip-content">
                <button class="tooltip-close" aria-label="Close">×</button>
                <h4>Auto-capture enabled</h4>
                <p>When you add a question, we’ll briefly hide the panel and capture a screenshot to help AI generate better answers. You can disable this anytime in Settings → AI.</p>
                <div class="tooltip-actions">
                    <button class="secondary" id="tooltipDismiss">Got it</button>
                </div>
            </div>
        `;
        document.body.appendChild(tooltip);
        const close = () => { tooltip.remove(); };
        tooltip.querySelector('.tooltip-close')?.addEventListener('click', close);
        tooltip.querySelector('#tooltipDismiss')?.addEventListener('click', close);
        // Keyboard support
        tooltip.tabIndex = -1;
        tooltip.focus();
        tooltip.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    }

    // Load existing questions and settings
    await Promise.all([
        loadQuestions(),
        loadSettings(),
        updateLastUsedApp()
    ]);

    // Screen capture function
    async function captureScreen() {
        try {
            // Hide the window
            await window.electronAPI.hideWindow();

            // Wait a moment for the window to hide
            await new Promise(resolve => setTimeout(resolve, 500));

            // Capture the screen
            const imageData = await window.electronAPI.captureScreen();
            if (imageData) {
                lastCapturedImage = imageData;
                capturePreviewImg.src = `data:image/png;base64,${imageData}`;
                capturePreview.style.display = 'block';
            }

            // Show the window again
            await window.electronAPI.showWindow();
        } catch (error) {
            console.error('Error capturing screen:', error);
            alert('Failed to capture screen: ' + error.message);
        }
    }

    captureCloseBtn.addEventListener('click', () => {
        capturePreview.style.display = 'none';
        lastCapturedImage = null;
    });

    // Listen for last used app updates
    window.electronAPI.onUpdateLastUsedApp((event, lastUsedApp) => {
        updateLastUsedApp();
        loadQuestions();
    });

    // Listen for streaming responses
    window.electronAPI.onStreamResponse((event, chunk) => {
        streamingAnswer += chunk;
        if (answerInput.value === '') {
            startTypingAnimation();
        }
    });

    function startTypingAnimation() {
        let displayedChars = 0;
        if (streamingInterval) {
            cancelAnimationFrame(streamingInterval);
            streamingInterval = null;
        }

        // Add typing class for animation
        answerInput.classList.add('typing');

        const animate = () => {
            if (displayedChars < streamingAnswer.length) {
                // Type multiple characters per frame for smoother animation
                displayedChars = Math.min(displayedChars + typingSpeed, streamingAnswer.length);
                answerInput.value = streamingAnswer.substring(0, displayedChars);
                answerInput.scrollTop = answerInput.scrollHeight;
                streamingInterval = requestAnimationFrame(animate);
            } else {
                answerInput.classList.remove('typing');
                cancelAnimationFrame(streamingInterval);
                streamingInterval = null;
                streamingAnswer = '';
            }
        };

        streamingInterval = requestAnimationFrame(animate);
    }

    settingsBtn.addEventListener('click', () => {
        if (!settingsModal) {
            settingsModal = new SettingsModal();
        }
        settingsModal.show();
    });

    questionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const settings = await window.electronAPI.getSettings();
        if (settings.ai?.autoCapture) {
            await captureScreen();
        }
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
            // Check if we're at the 5 question limit
            if (!editingId && currentQuestions.length >= 5) {
                alert('Maximum limit of 5 questions reached. Please delete some questions to add more.');
                return;
            }
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

                        // Get the appropriate template
                        let prompt;
                        switch (settings.ai.promptTemplate.mode) {
                            case 'simple':
                                prompt = settings.ai.promptTemplate.templates.simple;
                                break;
                            case 'advanced':
                                prompt = `${settings.ai.promptTemplate.systemPrompt}\n\n`;
                                if (settings.ai.promptTemplate.customInstructions.length > 0) {
                                    prompt += `Instructions:\n${settings.ai.promptTemplate.customInstructions.join('\n')}\n\n`;
                                }
                                prompt += `Question: ${question}`;
                                break;
                            default: // 'basic'
                                prompt = ollamaService.createPrompt(
                                    settings.lastUsedApp,
                                    question,
                                    contextQuestions,
                                    true // Always use context in basic mode
                                );
                        }

                        // Check if Ollama is running
                        const isOllamaRunning = await ollamaService.isOllamaRunning();
                        if (!isOllamaRunning) {
                            throw new Error('Ollama is not running. Please start Ollama and try again.');
                        }

                        // Use vision model if there's a captured image
                        const model = lastCapturedImage ? settings.ai.visionModel : settings.ai.model;
                        finalAnswer = await ollamaService.generateAnswer(model, prompt, lastCapturedImage);

                        // Clear the captured image after using it
                        if (lastCapturedImage) {
                            lastCapturedImage = null;
                            capturePreview.style.display = 'none';
                        }
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
            questionList.innerHTML = `
                <div class="empty-state" role="region" aria-label="No questions">
                    <h3>No questions yet</h3>
                    <p>Try one of these to get started:</p>
                    <ul>
                        <li>What are the key shortcuts for this app?</li>
                        <li>How do I perform <em>common task</em>?</li>
                        <li>Where can I find settings for <em>feature</em>?</li>
                    </ul>
                    <div class="empty-actions">
                        <button id="emptyAddBtn" class="secondary">Add a question</button>
                        <button id="emptySettingsBtn" class="secondary">Open Settings</button>
                    </div>
                    <p class="hint">Tip: Press <strong>Shift+Space</strong> to toggle the panel</p>
                </div>
            `;
            // Wire up quick actions
            const emptyAddBtn = document.getElementById('emptyAddBtn');
            const emptySettingsBtn = document.getElementById('emptySettingsBtn');
            if (emptyAddBtn) emptyAddBtn.addEventListener('click', () => questionInput.focus());
            if (emptySettingsBtn) {
                emptySettingsBtn.addEventListener('click', () => {
                    if (!settingsModal) settingsModal = new SettingsModal();
                    settingsModal.show();
                });
            }
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
                    ${qa.referencesContext ? '<span class="reference-badge">📚 Uses Memory</span>' : ''}
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

            // Get the appropriate template
            let prompt;
            switch (settings.ai.promptTemplate.mode) {
                case 'simple':
                    prompt = settings.ai.promptTemplate.templates.simple;
                    break;
                case 'advanced':
                    prompt = `${settings.ai.promptTemplate.systemPrompt}\n\n`;
                    if (settings.ai.promptTemplate.customInstructions.length > 0) {
                        prompt += `Instructions:\n${settings.ai.promptTemplate.customInstructions.join('\n')}\n\n`;
                    }
                    prompt += `Question: ${qa.question}`;
                    break;
                default: // 'basic'
                    prompt = ollamaService.createPrompt(
                        settings.lastUsedApp,
                        qa.question,
                        contextQuestions,
                        true // Always use context in basic mode
                    );
            }

            // Use vision model if there's a captured image
            const model = lastCapturedImage ? settings.ai.visionModel : settings.ai.model;
            const answer = await ollamaService.generateAnswer(model, prompt, lastCapturedImage);

            // Clear the captured image after using it
            if (lastCapturedImage) {
                lastCapturedImage = null;
                capturePreview.style.display = 'none';
            }

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
        if (settings.theme) {
            document.body.style.setProperty('--background-color', settings.theme.backgroundColor);
            document.body.style.setProperty('--accent-color', settings.theme.accentColor);
            document.body.style.setProperty('--text-color', settings.theme.textColor);
            document.body.style.fontFamily = settings.font;
            document.body.style.fontSize = settings.fontSize;
        }
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
