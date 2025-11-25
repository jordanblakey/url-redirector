import { storage } from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('source');
    const target = urlParams.get('target');
    const ruleId = parseInt(urlParams.get('ruleId') || '', 10);

    const sourceEl = document.getElementById('source');
    const targetEl = document.getElementById('target');
    const proceedBtn = document.getElementById('proceedBtn');
    const overrideBtn = document.getElementById('overrideBtn');
    const overrideConfirmContainer = document.getElementById('override-confirm-container');
    const confirmOverrideBtn = document.getElementById('confirmOverrideBtn') as HTMLButtonElement;

    if (sourceEl && targetEl && source && target) {
        sourceEl.textContent = source;
        targetEl.textContent = target;
    }

    proceedBtn?.addEventListener('click', () => {
        if (target) {
            window.location.href = target;
        }
    });

    overrideBtn?.addEventListener('click', () => {
        overrideConfirmContainer?.classList.remove('hidden');
        overrideBtn.classList.add('hidden');

        let countdown = 5;
        const interval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                confirmOverrideBtn.textContent = `Confirm Override (${countdown})`;
            } else {
                clearInterval(interval);
                confirmOverrideBtn.textContent = 'Confirm Override';
                confirmOverrideBtn.disabled = false;
            }
        }, 1000);
    });

    confirmOverrideBtn?.addEventListener('click', async () => {
        if (ruleId && source) {
            const rules = await storage.getRules();
            const rule = rules.find(r => r.id === ruleId);
            if (rule) {
                rule.overrideUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
                await storage.saveRules(rules);
                window.location.href = source;
            }
        }
    });
});
