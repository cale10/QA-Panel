document.addEventListener('DOMContentLoaded', () => {
    const questionForm = document.getElementById('questionForm');
    const questionInput = document.getElementById('questionInput');
    const answerInput = document.getElementById('answerInput');
    const questionList = document.getElementById('questionList');
    const submitBtn = document.getElementById('submitBtn');
    const settingsForm = document.getElementById('settingsForm');
    const backgroundColorInput = document.getElementById('backgroundColor');
    const opacityInput = document.getElementById('opacity');
    const fontInput = document.getElementById('font');
    const fontSizeInput = document.getElementById('fontSize');
    const fontColorInput = document.getElementById('fontColor');
    const toggleAppInput = document.getElementById('toggleApp');
    const newQuestionInput = document.getElementById('newQuestion');
    const exportDataInput = document.getElementById('exportData');
    const importDataInput = document.getElementById('importData');
    const deleteQuestionInput = document.getElementById('deleteQuestion');
    const lastUsedAppDiv = document.getElementById('lastUsedApp');

    let editingId = null;
    let currentQuestions = [];

    // Load existing questions and settings
    loadQuestions();
    loadSettings();
    updateLastUsedApp();

    // Listen for last used app updates
    window.electronAPI.onUpdateLastUsedApp((event, lastUsedApp) => {
        updateLastUsedApp();
        loadQuestions();
    });

    // Listen for focus new question event
    window.electronAPI.onFocusNewQuestion(() => {
        focusOnNewQuestion();
    });

    // Listen for export data event
    window.electronAPI.onExportData(() => {
        exportData();
    });

    // Listen for import data event
    window.electronAPI.onImportData(() => {
        importData();
    });

    // Listen for delete question event
    window.electronAPI.onDeleteQuestion(() => {
        deleteLastQuestion();
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
            loadQuestions();
            focusOnNewQuestion();
        }
    });

    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const backgroundColor = backgroundColorInput.value;
        const opacity = opacityInput.value;
        const rgbaColor = hexToRGBA(backgroundColor, opacity);
        const font = fontInput.value;
        const fontSize = fontSizeInput.value + 'px';
        const fontColor = fontColorInput.value;
        
        const newSettings = {
            backgroundColor: rgbaColor,
            font,
            fontSize,
            fontColor,
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            shortcuts: {
                toggleApp: toggleAppInput.value,
                newQuestion: newQuestionInput.value,
                exportData: exportDataInput.value,
                importData: importDataInput.value,
                deleteQuestion: deleteQuestionInput.value
            }
        };
        
        await window.electronAPI.updateSettings(newSettings);
        applySettings(newSettings);
    });

    async function loadQuestions() {
        currentQuestions = await window.electronAPI.getQuestions();
        questionList.innerHTML = '';
        if (currentQuestions.length === 0) {
            questionList.innerHTML = '<p>No questions for this app yet.</p>';
        } else {
            currentQuestions.forEach((qa) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <strong>Q: ${qa.question}</strong>
                    <p>A: ${qa.answer || 'Not answered yet'}</p>
                    <div class="question-actions">
                        <button class="edit-btn" data-id="${qa.id}">Edit</button>
                        <button class="delete-btn" data-id="${qa.id}">Delete</button>
                    </div>
                `;
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
        const settings = await window.electronAPI.getSettings();
        applySettings(settings);
    }

    function applySettings(settings) {
        document.body.style.backgroundColor = settings.backgroundColor;
        document.body.style.fontFamily = settings.font;
        document.body.style.fontSize = settings.fontSize;
        document.body.style.color = settings.fontColor;
        document.body.style.textShadow = settings.textShadow;

        const rgbaValues = settings.backgroundColor.match(/[\d.]+/g);
        if (rgbaValues && rgbaValues.length === 4) {
            backgroundColorInput.value = rgbaToHex(rgbaValues[0], rgbaValues[1], rgbaValues[2]);
            opacityInput.value = rgbaValues[3];
        }
        fontInput.value = settings.font;
        fontSizeInput.value = parseInt(settings.fontSize);
        fontColorInput.value = settings.fontColor;

        // Set shortcut input values
        toggleAppInput.value = settings.shortcuts.toggleApp;
        newQuestionInput.value = settings.shortcuts.newQuestion;
        exportDataInput.value = settings.shortcuts.exportData;
        importDataInput.value = settings.shortcuts.importData;
        deleteQuestionInput.value = settings.shortcuts.deleteQuestion;
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
            focusOnNewQuestion();
        }
    }

    async function deleteQuestion(id) {
        await window.electronAPI.deleteQuestion(parseInt(id));
        loadQuestions();
    }

    async function deleteLastQuestion() {
        if (currentQuestions.length > 0) {
            const lastQuestion = currentQuestions[currentQuestions.length - 1];
            await deleteQuestion(lastQuestion.id);
        }
    }

    async function exportData() {
        const result = await window.electronAPI.exportData();
        if (result.success) {
            alert('Data exported successfully');
        } else {
            alert(`Failed to export data: ${result.message}`);
        }
    }

    async function importData() {
        const result = await window.electronAPI.importData();
        if (result.success) {
            alert('Data imported successfully');
            loadQuestions();
        } else {
            alert(`Failed to import data: ${result.message}`);
        }
    }

    function hexToRGBA(hex, opacity) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    function rgbaToHex(r, g, b) {
        return "#" + ((1 << 24) + (parseInt(r) << 16) + (parseInt(g) << 8) + parseInt(b)).toString(16).slice(1);
    }

    function focusOnNewQuestion() {
        questionInput.focus();
        questionInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});
