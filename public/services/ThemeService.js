class ThemeService {
    constructor() {
        this.themes = null;
        this.currentTheme = null;
        this.initPromise = this.init();
    }

    async init() {
        try {
            const settings = await window.electronAPI.getSettings();
            this.themes = settings.themes || {
                themes: {
                    dark: {
                        name: "Dark Theme",
                        backgroundColor: "#202124",
                        accentColor: "#ffa500",
                        textColor: "#ffffff",
                        secondaryBackgroundColor: "#2d2e31",
                        borderColor: "#444444",
                        inputBackgroundColor: "#1e1e1e",
                        hoverBackgroundColor: "rgba(255, 255, 255, 0.03)",
                        shadowColor: "rgba(0, 0, 0, 0.2)"
                    },
                    light: {
                        name: "Light Theme",
                        backgroundColor: "#ffffff",
                        accentColor: "#ffa500",
                        textColor: "#202124",
                        secondaryBackgroundColor: "#f5f5f5",
                        borderColor: "#e0e0e0",
                        inputBackgroundColor: "#ffffff",
                        hoverBackgroundColor: "rgba(0, 0, 0, 0.03)",
                        shadowColor: "rgba(0, 0, 0, 0.1)"
                    }
                },
                customThemes: {}
            };

            // Save default themes if not present
            if (!settings.themes) {
                await this.saveThemes();
            }

            this.currentTheme = settings.theme?.mode || 'dark';
            await this.applyTheme(this.currentTheme);
        } catch (error) {
            console.error('Error initializing ThemeService:', error);
        }
    }

    async applyTheme(themeName) {
        const theme = this.getTheme(themeName);
        if (!theme) return;

        // Apply theme variables to root
        const root = document.documentElement;
        Object.entries(theme).forEach(([key, value]) => {
            if (key !== 'name') {
                root.style.setProperty(`--${this.camelToKebab(key)}`, value);
            }
        });

        // Update settings
        const settings = await window.electronAPI.getSettings();
        await window.electronAPI.updateSettings({
            ...settings,
            theme: {
                ...settings.theme,
                mode: themeName,
                ...theme
            }
        });

        this.currentTheme = themeName;
    }

    getTheme(themeName) {
        return this.themes?.themes[themeName] || this.themes?.customThemes[themeName];
    }

    getAllThemes() {
        return {
            ...this.themes?.themes,
            ...this.themes?.customThemes
        };
    }

    async addCustomTheme(name, theme) {
        if (!this.themes) return;
        
        const themeName = name.toLowerCase().replace(/\s+/g, '-');
        this.themes.customThemes[themeName] = {
            name,
            ...theme
        };

        await this.saveThemes();
        return themeName;
    }

    async deleteCustomTheme(themeName) {
        if (!this.themes?.customThemes[themeName]) return;
        
        delete this.themes.customThemes[themeName];
        await this.saveThemes();

        // If current theme was deleted, switch to dark
        if (this.currentTheme === themeName) {
            await this.applyTheme('dark');
        }
    }

    async saveThemes() {
        try {
            const settings = await window.electronAPI.getSettings();
            await window.electronAPI.updateSettings({
                ...settings,
                themes: this.themes
            });
        } catch (error) {
            console.error('Error saving themes:', error);
            throw error;
        }
    }

    camelToKebab(str) {
        return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    async waitForInit() {
        return this.initPromise;
    }
}

// Export the class
window.ThemeService = ThemeService;
