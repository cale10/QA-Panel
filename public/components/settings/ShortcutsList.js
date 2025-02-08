import React from 'react';
import ShortcutInput from './ShortcutInput';

const ShortcutsList = ({ shortcuts, onShortcutChange, onReset, title }) => {
    return (
        <div className="shortcuts-list">
            <h3>{title}</h3>
            {Object.entries(shortcuts).map(([key, value]) => (
                <ShortcutInput
                    key={key}
                    name={key}
                    value={value}
                    onChange={onShortcutChange}
                    onReset={() => onReset(key)}
                />
            ))}
        </div>
    );
};

export default ShortcutsList;
