import { App, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as CryptoJS from 'crypto-js';

interface MyPluginSettings {
    password: string; // Encrypted password storage
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    password: '', // Default empty password
};

export default class EncryptedPlugin extends Plugin {
    settings: MyPluginSettings;
    isVerifyPasswordCorrect: boolean = true;

    async onload() {
        await this.loadSettings();

        // Запит пароля під час завантаження
    if (this.settings.password) {
        const verifyPasswordModal = new CustomPasswordModal(this.app, this, () => {
            if (!this.isVerifyPasswordCorrect) {
                new Notice("Access denied. Incorrect password.");
                this.unload(); // Закриваємо плагін, якщо пароль неправильний
            }
        });
        verifyPasswordModal.open();
    }

        // Add settings tab
        this.addSettingTab(new PasswordSettingTab(this.app, this));

        // Command to verify password
        this.addCommand({
            id: 'verify-password',
            name: 'Verify Password',
            callback: () => {
                new CustomPasswordModal(this.app, this, (success) => {
                    if (success) {
                        new Notice('Password verified successfully!');
                    } else {
                        new Notice('Incorrect password!');
                    }
                }).open();
            },
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (!this.settings.password) {
        console.log("No password is set.");
    }
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    encrypt(text: string): string {
        return CryptoJS.AES.encrypt(text, 'your-secret-key').toString();
    }
    
    decrypt(text: string): string {
        const bytes = CryptoJS.AES.decrypt(text, 'your-secret-key');
        return bytes.toString(CryptoJS.enc.Utf8);
    }
}

class PasswordSettingTab extends PluginSettingTab {
    plugin: EncryptedPlugin;

    constructor(app: App, plugin: EncryptedPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl('h2', { text: 'Password Protection Settings' });

        new Setting(containerEl)
            .setName('Set Password')
            .setDesc('Set or update the plugin password.')
            .addButton((button) => {
                button.setButtonText('Set Password').onClick(() => {
                    new SetPasswordModal(this.app, this.plugin, () => {
                        new Notice('Password set successfully!');
                    }).open();
                });
            });
    }
}

class SetPasswordModal extends Modal {
    plugin: EncryptedPlugin;
    onSubmit: () => void;

    constructor(app: App, plugin: EncryptedPlugin, onSubmit: () => void) {
        super(app);
        this.plugin = plugin;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl, modalEl } = this;

        const closeButton = modalEl.querySelector('.modal-close-button');
        if (closeButton) {
            closeButton.remove(); // Видаляємо кнопку закриття
        }

        contentEl.empty();
        contentEl.createEl('h2', { text: 'Set Password' });

        // Якщо пароль вже встановлено, показати поле для старого пароля
        let oldPasswordInput: HTMLInputElement | null = null;
        if (this.plugin.settings.password) {
            contentEl.createEl('p', { text: 'Please enter your current password to change it.' });
            oldPasswordInput = contentEl.createEl('input', { type: 'password', placeholder: 'Enter current password' });
            oldPasswordInput.style.marginBottom = '1em';
        }

        // Поля для нового пароля
        const newPasswordInput = contentEl.createEl('input', { type: 'password', placeholder: 'Enter new password' });
        const confirmNewPasswordInput = contentEl.createEl('input', { type: 'password', placeholder: 'Confirm new password' });
        const errorMessage = contentEl.createEl('p', { cls: 'password-error' });

        // Додавання кнопок
        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText('Save')
                    .setCta()
                    .onClick(() => {
                        // Перевірка старого пароля
                        if (this.plugin.settings.password && oldPasswordInput) {
                            const decryptedOldPassword = this.plugin.decrypt(this.plugin.settings.password);
                            if (oldPasswordInput.value !== decryptedOldPassword) {
                                errorMessage.setText('Incorrect current password.');
                                errorMessage.style.color = 'red';
                                return;
                            }
                        }

                        // Перевірка нового пароля
                        if (newPasswordInput.value === confirmNewPasswordInput.value && newPasswordInput.value.length > 0) {
                            this.plugin.settings.password = this.plugin.encrypt(newPasswordInput.value);
                            this.plugin.saveSettings();
                            this.close();
                            this.onSubmit();
                        } else {
                            errorMessage.setText('New passwords do not match or are empty.');
                            errorMessage.style.color = 'red';
                        }
                    })
            )
            .addButton((btn) =>
                btn
                    .setButtonText('Cancel')
                    .onClick(() => {
                        this.close();
                    })
            );

        // Додавання стилів
        if (oldPasswordInput) oldPasswordInput.style.marginBottom = '1em';
        newPasswordInput.style.marginBottom = '1em';
        confirmNewPasswordInput.style.marginBottom = '1em';
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}




class CustomPasswordModal {
    app: App;
    plugin: EncryptedPlugin;
    onSubmit: (success: boolean) => void;
    modalEl: HTMLElement;

    constructor(app: App, plugin: EncryptedPlugin, onSubmit: (success: boolean) => void) {
        this.app = app;
        this.plugin = plugin;
        this.onSubmit = onSubmit;
        this.modalEl = document.createElement('div'); // Контейнер модального вікна
    }

    open() {
        // Створюємо фон
        const backdrop = document.createElement('div');
        backdrop.classList.add('custom-modal-backdrop');
        backdrop.style.position = 'fixed';
        backdrop.style.top = '0';
        backdrop.style.left = '0';
        backdrop.style.width = '100vw';
        backdrop.style.height = '100vh';
        backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        backdrop.style.zIndex = '1000';

        // Створюємо контент модального вікна
        this.modalEl.classList.add('custom-modal-content');
        this.modalEl.style.position = 'fixed';
        this.modalEl.style.top = '50%';
        this.modalEl.style.left = '50%';
        this.modalEl.style.transform = 'translate(-50%, -50%)';
        this.modalEl.style.backgroundColor = 'white';
        this.modalEl.style.padding = '20px';
        this.modalEl.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        this.modalEl.style.zIndex = '1001';
        this.modalEl.style.borderRadius = '8px';
        this.modalEl.style.minWidth = '300px';

        // Додаємо заголовок
        const title = document.createElement('h2');
        title.textContent = 'Verify Password';
        this.modalEl.appendChild(title);

        // Додаємо поле для пароля
        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.placeholder = 'Enter your password';
        passwordInput.style.display = 'block';
        passwordInput.style.marginBottom = '10px';
        passwordInput.style.width = '100%';
        passwordInput.style.padding = '10px';
        this.modalEl.appendChild(passwordInput);

        // Додаємо повідомлення про помилку
        const errorMessage = document.createElement('p');
        errorMessage.style.color = 'red';
        errorMessage.style.display = 'none';
        errorMessage.textContent = 'Incorrect password!';
        this.modalEl.appendChild(errorMessage);

        // Додаємо кнопки
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'space-between';

        const verifyButton = document.createElement('button');
        verifyButton.textContent = 'Verify';
        verifyButton.style.padding = '10px';
        verifyButton.style.marginRight = '10px';
        verifyButton.style.cursor = 'pointer';
        verifyButton.onclick = () => {
            const decryptedPassword = this.plugin.decrypt(this.plugin.settings.password);
            if (passwordInput.value === decryptedPassword) {
                this.onSubmit(true);
                this.close();
            } else {
                errorMessage.style.display = 'block';
            }
        };
        buttonContainer.appendChild(verifyButton);

        this.modalEl.appendChild(buttonContainer);

        // Додаємо в DOM
        document.body.appendChild(backdrop);
        document.body.appendChild(this.modalEl);

        // Забороняємо закриття при кліку на фон
        backdrop.onclick = (event) => {
            event.stopPropagation(); // Запобігає закриттю
        };
    }

    close() {
        this.modalEl.remove();
        document.querySelector('.custom-modal-backdrop')?.remove();
    }
}
