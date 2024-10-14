# QA-Panel

QA-Panel is an innovative desktop application built with Electron, designed to streamline the process of managing questions and answers across different applications. It provides a seamless, context-aware interface for capturing, organizing, and retrieving information.

## Features

- **Context-Aware Q&A Management**: Automatically associates questions and answers with the application you're currently using.
- **Customizable Global Shortcuts**: Quick access to key functions without interrupting your workflow.
- **Enhanced Keyboard Navigation**: Efficiently manage your Q&A entries using keyboard shortcuts.
- **Transparent and Frameless Interface**: Sleek, modern design that doesn't obstruct your view.
- **Persistent Data Storage**: Your Q&A data is automatically saved and persists between sessions.
- **Import/Export Functionality**: Easily backup or transfer your data.
- **Customizable Appearance**: Adjust the app's look to suit your preferences.
- **System Tray Integration**: Access the app quickly from your system tray.

## Key Shortcuts (Default)

### Global Shortcuts
- Show/Hide App: `Ctrl+Shift+Space`
- Focus on New Question: `Ctrl+Shift+N`
- Export Data: `Ctrl+Shift+E`
- Import Data: `Ctrl+Shift+I`

### In-App Keyboard Navigation
- Focus on Specific Question: `1-9` (corresponds to question number)
- Edit Focused Question: `q`
- Edit Focused Answer: `a`
- Delete Focused Question: `d`
- Unfocus Current Element: `Escape`

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/qa-panel.git
   ```
2. Navigate to the project directory:
   ```
   cd qa-panel
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Usage

To start the application in development mode:

```
npm start
```

To build the application for production:

```
npm run build
```

## Customization

### Appearance
You can customize the app's appearance through the settings menu, including:
- Background color and opacity
- Font family and size
- Text color

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

---

We hope QA-Panel enhances your productivity and makes managing your questions and answers a breeze! If you have any issues or suggestions, please open an issue on GitHub.
