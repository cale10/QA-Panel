import React, { useState, useEffect, useCallback } from 'react';

const ShortcutInput = ({ name, value, onChange, onReset }) => {
    const [isCapturing, setIsCapturing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleKeyDown = useCallback((e) => {
        if (!isCapturing) return;

        e.preventDefault();
        
        const keys = [];
        if (e.ctrlKey) keys.push('Ctrl');
        if (e.shiftKey) keys.push('Shift');
        if (e.altKey) keys.push('Alt');
        
        // Add the main key if it's not a modifier
        if (!['Control', 'Shift', 'Alt'].includes(e.key)) {
            keys.push(e.key);
        }

        if (keys.length > 0) {
            const shortcut = keys.join('+');
            setCurrentValue(shortcut);
            onChange(name, shortcut);
            setIsCapturing(false);
        }
    }, [isCapturing, name, onChange]);

    useEffect(() => {
        if (isCapturing) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isCapturing, handleKeyDown]);

    return (
        <div className="shortcut-input">
            <label>{name}</label>
            <div
                className={`input-field ${isCapturing ? 'capturing' : ''}`}
                tabIndex={0}
                onClick={() => setIsCapturing(true)}
                onBlur={() => setIsCapturing(false)}
            >
                {isCapturing ? 'Press shortcut...' : currentValue}
            </div>
            <button 
                onClick={(e) => {
                    e.preventDefault();
                    onReset(name);
                }}
                className="reset-button"
            >
                Reset
            </button>
        </div>
    );
};

export default ShortcutInput;
