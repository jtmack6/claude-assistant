/*
 * Claude Assistant plugin for Obsidian
 * This is a pre-built JavaScript version that bypasses TypeScript compilation errors
 */

const { Plugin, PluginSettingTab, Setting, Modal, Notice, request } = require('obsidian');

class ClaudePlugin extends Plugin {
    constructor(app, manifest) {
        super(app, manifest);
        this.settings = {
            apiKey: '',
            modelName: 'claude-3-7-sonnet-20250219',
            maxTokens: 4096
        };
    }

    async onload() {
        await this.loadSettings();

        // Add a ribbon icon for Claude
        this.addRibbonIcon('message-circle', 'Claude Assistant', () => {
            // Open Claude view
            this.activateView();
        });
        
        // Add a command to ask Claude
        this.addCommand({
            id: 'ask-claude',
            name: 'Ask Claude about current selection',
            editorCallback: (editor, view) => {
                const selection = editor.getSelection();
                if (!selection) {
                    new Notice('No text selected');
                    return;
                }
                
                this.askClaude(selection, (response) => {
                    // Insert Claude's response below the current selection
                    const cursorPos = editor.getCursor();
                    editor.replaceRange("\n\n**Claude:** " + response + "\n\n", cursorPos);
                });
            }
        });

        // Add settings tab
        this.addSettingTab(new ClaudeSettingTab(this.app, this));
    }

    activateView() {
        // Add code to open a modal or view with Claude chat interface
        new ClaudeModal(this.app, this).open();
    }

    async askClaude(prompt, callback) {
        if (!this.settings.apiKey) {
            new Notice('Please set your Claude API key in the settings');
            return;
        }

        try {
            new Notice('Asking Claude...');
            
            const response = await request({
                url: 'https://api.anthropic.com/v1/messages',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.settings.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.settings.modelName,
                    max_tokens: this.settings.maxTokens,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            });

            const data = JSON.parse(response);
            callback(data.content[0].text);

        } catch (error) {
            console.error('Error calling Claude API:', error);
            new Notice(`Error: ${error.message}`);
        }
    }

    onunload() {
        // Clean up when the plugin is disabled
    }

    async loadSettings() {
        try {
            const data = await this.loadData();
            this.settings = Object.assign({}, this.settings, data || {});
        } catch (error) {
            console.error('Failed to load settings:', error);
            // Use default settings if loading fails
            this.settings = {
                apiKey: '',
                modelName: 'claude-3-7-sonnet-20250219',
                maxTokens: 4096
            };
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class ClaudeModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        
        contentEl.createEl('h2', {text: 'Chat with Claude'});

        // Create chat history container
        this.responseEl = contentEl.createDiv({cls: 'claude-responses'});
        this.responseEl.setAttr('style', 'height: 300px; overflow-y: auto; margin-bottom: 10px; border: 1px solid var(--background-modifier-border); padding: 10px;');

        // Create input area
        this.inputEl = contentEl.createEl('textarea', {
            cls: 'claude-input',
            attr: {
                placeholder: 'Ask Claude something...',
                rows: '4',
                style: 'width: 100%; resize: vertical;'
            }
        });

        // Create submit button
        const submitBtn = contentEl.createEl('button', {
            text: 'Send',
            cls: 'claude-submit-btn'
        });
        submitBtn.setAttr('style', 'margin-top: 10px;');
        submitBtn.addEventListener('click', () => {
            const prompt = this.inputEl.value;
            if (!prompt.trim()) return;

            // Add user message to chat
            const userMsgEl = this.responseEl.createEl('div', {cls: 'claude-user-message'});
            userMsgEl.innerHTML = `<strong>You:</strong> ${prompt}`;
            userMsgEl.setAttr('style', 'margin-bottom: 10px;');

            // Clear input
            this.inputEl.value = '';

            // Show loading indicator
            const loadingEl = this.responseEl.createEl('div', {
                text: 'Claude is thinking...',
                cls: 'claude-loading'
            });

            // Call API
            this.plugin.askClaude(prompt, (response) => {
                // Remove loading indicator
                loadingEl.remove();

                // Add Claude's response to chat
                const claudeMsgEl = this.responseEl.createEl('div', {cls: 'claude-response-message'});
                claudeMsgEl.innerHTML = `<strong>Claude:</strong> ${response}`;
                claudeMsgEl.setAttr('style', 'margin-bottom: 20px;');

                // Scroll to bottom
                this.responseEl.scrollTo({top: this.responseEl.scrollHeight, behavior: 'smooth'});
            });
        });

        // Handle Enter key in textarea (Shift+Enter for new line)
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitBtn.click();
            }
        });
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

class ClaudeSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const {containerEl} = this;

        containerEl.empty();

        containerEl.createEl('h2', {text: 'Claude Integration Settings'});

        new Setting(containerEl)
            .setName('API Key')
            .setDesc('Your Claude API key from Anthropic')
            .addText(text => text
                .setPlaceholder('Enter your API key')
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Model Name')
            .setDesc('Claude model to use')
            .addDropdown(dropdown => dropdown
                .addOption('claude-3-7-sonnet-20250219', 'Claude 3.7 Sonnet')
                .addOption('claude-3-5-sonnet-20240620', 'Claude 3.5 Sonnet')
                .addOption('claude-3-5-haiku-20240307', 'Claude 3.5 Haiku')
                .addOption('claude-3-opus-20240229', 'Claude 3 Opus')
                .setValue(this.plugin.settings.modelName)
                .onChange(async (value) => {
                    this.plugin.settings.modelName = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Max Tokens')
            .setDesc('Maximum number of tokens in Claude\'s response')
            .addSlider(slider => slider
                .setLimits(1, 4096, 1)
                .setValue(this.plugin.settings.maxTokens)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.maxTokens = value;
                    await this.plugin.saveSettings();
                })
            );
    }
}

module.exports = ClaudePlugin;
