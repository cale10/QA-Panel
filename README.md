# QA-Panel

QA-Panel is an innovative desktop application built with Electron, designed to streamline the process of managing questions and answers across different applications. It provides a seamless, context-aware interface for capturing, organizing, and retrieving information, with integrated AI capabilities powered by Ollama.

## Features

- **Context-Aware Q&A Management**: Automatically associates questions and answers with the application you're currently using.
- **AI-Powered Answers**: Generate answers automatically using Ollama's language models.
- **Smart Context Memory**: AI considers previous Q&As when generating answers, with configurable history limits and relevance sorting.
- **Vision Model Support**: Use vision-capable models like Llava for image-related questions.
- **Customizable Global Shortcuts**: Quick access to key functions without interrupting your workflow.
- **Enhanced Keyboard Navigation**: Efficiently manage your Q&A entries using keyboard shortcuts.
- **Transparent and Frameless Interface**: Sleek, modern design with a dark theme that doesn't obstruct your view.
- **Persistent Data Storage**: Your Q&A data and settings are automatically saved and persist between sessions.
- **Import/Export Functionality**: Easily backup or transfer your data.
- **Customizable Appearance**: Adjust the app's look to suit your preferences.
- **System Tray Integration**: Access the app quickly from your system tray.

## Key Shortcuts (Default)

### Global Shortcuts
- Show/Hide App: `Shift+Space`
- Focus on New Question: `Shift+N`
- Export Data: `Ctrl+Shift+E`
- Import Data: `Ctrl+Shift+I`

### In-App Keyboard Navigation
- Focus on Specific Question: `1-9` (corresponds to question number)
- Edit Focused Question: `q`
- Edit Focused Answer: `a`
- Delete Focused Question: `d`
- Unfocus Current Element: `Escape`

## Prerequisites

1. Install [Ollama](https://ollama.ai/) for AI features
2. Pull required models:
   ```bash
   # For text-based questions
   ollama pull llama2

   # For vision-related questions (optional)
   ollama pull llava
   ```

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/cale10/qa-panel.git
   ```
2. Navigate to the project directory:
   ```bash
   cd qa-panel
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

To start the application in development mode:

```bash
npm start
```

To build the application for production:

```bash
npm run build
```

## AI Features

### Auto-Answer
Enable automatic answer generation when adding new questions. The AI will:
- Use the selected language model (default: llama2)
- Consider the current application context
- Reference previous Q&As if context memory is enabled

### Context Memory
Configure how the AI uses previous questions and answers:
- Enable/disable context memory
- Set the number of previous Q&As to remember (1-9)
- Choose between chronological or relevance-based sorting

### Vision Support
When using vision-capable models like Llava:
- Capture and analyze screenshots
- Generate answers based on visual content
- Combine visual and textual context

## Customization

### Appearance
Customize the app's appearance through the settings menu:
- Background color and opacity
- Font family and size
- Text color
- Text shadow effects

### AI Settings
Configure AI behavior in the settings menu:
- Choose primary and vision models
- Adjust temperature for creativity vs. precision
- Configure context memory settings
- Enable/disable auto-answer feature

### Shortcuts
All global shortcuts can be customized in the settings menu to suit your workflow.

## Data Management

- **Auto-save**: All your questions, answers, and settings are automatically saved.
- **Export**: Use the export function to backup your data or transfer it to another machine.
- **Import**: Easily restore your data from a previous export.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Uses [electron-builder](https://www.electron.build/) for packaging and distribution
- AI features powered by [Ollama](https://ollama.ai/)

---

We hope QA-Panel enhances your productivity and makes managing your questions and answers a breeze! If you have any issues or suggestions, please open an issue on GitHub.
