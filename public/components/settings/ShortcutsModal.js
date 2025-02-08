import React, { useState, useEffect } from 'react';
import ShortcutsList from './ShortcutsList';

const defaultShortcuts = {
    global: {
        toggleApp: 'Shift+Space',
        newQuestion: 'Shift+N',
        exportData: 'Ctrl+Shift+E',
        importData: 'Ctrl+Shift+I'
    },
    navigation: {
        focusQuestion: '1-9',
        editQuestion: 'q',
        editAnswer: 'a',
        deleteQuestion: 'd',
        unfocus: 'Escape'
    }
};

const ShortcutsModal = ({ onClose, onSave }) => {
    const [shortcuts, setShortcuts] = useState(defaultShortcuts);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        // Load current shortcuts from settings
        const loadShortcuts = async () => {
            const settings = await window.electronAPI.getSettings();
            if (settings.shortcuts) {
                setShortcuts({
                    global: { ...settings.shortcuts },
                    navigation: {
                        focusQuestion: '1-9',
                        editQuestion: 'q',
                        editAnswer: 'a',
                        deleteQuestion: 'd',
                        unfocus: 'Escape'
                    }
                });
            }
        };
        loadShortcuts();
    }, []);

    const handleGlobalShortcutChange = (name, value) => {
        setShortcuts(prev => ({
            ...prev,
            global: {
                ...prev.global,
                [name]: value
            }
        }));
        setHasChanges(true);
    };

    const handleNavigationShortcutChange = (name, value) => {
        setShortcuts(prev => ({
            ...prev,
            navigation: {
                ...prev.navigation,
                [name]: value
            }
        }));
        setHasChanges(true);
    };

    const handleReset = (section, key) => {
        setShortcuts(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: defaultShortcuts[section][key]
            }
        }));
        setHasChanges(true);
    };

    const handleResetAll = () => {
        setShortcuts(defaultShortcuts);
        setHasChanges(true);
    };

    const handleSave = async () => {
        try {
            await window.electronAPI.updateSettings({ shortcuts: shortcuts.global });
            onSave();
            onClose();
        } catch (error) {
            console.error('Failed to save shortcuts:', error);
            // TODO: Show error message to user
        }
    };

    return (
        <div className="shortcuts-modal">
            <div className="modal-header">
                <h2>Keyboard Shortcuts</h2>
                <button className="close-button" onClick={onClose}>×</button>
            </div>

            <div className="modal-content">
                <ShortcutsList
                    title="Global Shortcuts"
                    shortcuts={shortcuts.global}
                    onShortcutChange={handleGlobalShortcutChange}
                    onReset={(key) => handleReset('global', key)}
                />

                <ShortcutsList
                    title="In-App Navigation"
                    shortcuts={shortcuts.navigation}
                    onShortcutChange={handleNavigationShortcutChange}
                    onReset={(key) => handleReset('navigation', key)}
                />

                <div className="modal-footer">
                    <button 
                        className="reset-all-button"
                        onClick={handleResetAll}
                    >
                        Reset All to Defaults
                    </button>
                    <div className="action-buttons">
                        <button 
                            className="cancel-button"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button 
                            className="save-button"
                            onClick={handleSave}
                            disabled={!hasChanges}
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShortcutsModal;
