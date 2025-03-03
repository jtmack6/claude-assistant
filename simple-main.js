const { Plugin, PluginSettingTab, Setting, Modal, Notice } = require('obsidian');

class ClaudePlugin extends Plugin {
    async onload() {
        console.log("Claude Assistant plugin loaded!");
        
        // Add a ribbon icon for Claude
        this.addRibbonIcon('message-circle', 'Claude Assistant', () => {
            new Notice('Claude Assistant clicked!');
        });
        
        // Add a simple command
        this.addCommand({
            id: 'claude-test-command',
            name: 'Test Claude Assistant',
            callback: () => {
                new Notice('Claude Assistant command executed!');
            }
        });
    }

    onunload() {
        console.log("Claude Assistant plugin unloaded!");
    }
}

module.exports = ClaudePlugin;
