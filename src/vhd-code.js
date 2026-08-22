(function () {
    'use strict';

    const script = document.currentScript;

    function loadStyles() {
        if (document.querySelector('link[data-vhd-code-styles], style[data-vhd-code-styles]')) {
            return;
        }

        const cssUrl = script?.dataset.css
            || (script?.src ? new URL('vhd-code.css', script.src).href : '');

        if (!cssUrl) {
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssUrl;
        link.dataset.vhdCodeStyles = '';
        document.head.append(link);
    }

    function labels() {
        const french = (document.documentElement.lang || '').toLowerCase().startsWith('fr');

        return french
            ? { copy: 'Copier dans le presse-papiers', copied: 'Copié !' }
            : { copy: 'Copy to clipboard', copied: 'Copied!' };
    }

    function copyIcon() {
        return `
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <rect x="8" y="7" width="11" height="13" rx="1.5"></rect>
                <path d="M16 7V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v11A1.5 1.5 0 0 0 5.5 18H8"></path>
            </svg>
        `;
    }

    function copiedIcon() {
        return `
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="m5 12 4 4 10-10"></path>
            </svg>
        `;
    }

    async function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return;
        }

        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.append(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
    }

    function enhanceBlock(pre) {
        if (!(pre instanceof HTMLElement) || pre.dataset.vhdCodeReady === 'true') {
            return;
        }

        pre.dataset.vhdCodeReady = 'true';

        const wrapper = document.createElement('div');
        wrapper.className = 'vhd-code-wrapper';

        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.append(pre);

        const text = labels();
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'vhd-code-copy';
        button.title = text.copy;
        button.setAttribute('aria-label', text.copy);
        button.innerHTML = copyIcon();

        button.addEventListener('click', async () => {
            const code = pre.querySelector('code');
            const value = (code || pre).textContent || '';

            try {
                await copyText(value);
                button.title = text.copied;
                button.setAttribute('aria-label', text.copied);
                button.innerHTML = copiedIcon();

                window.setTimeout(() => {
                    button.title = text.copy;
                    button.setAttribute('aria-label', text.copy);
                    button.innerHTML = copyIcon();
                }, 1600);
            } catch (error) {
                console.error('Vanilla HTML Designer: unable to copy code.', error);
            }
        });

        wrapper.append(button);
    }

    function enhance(root) {
        const scope = root instanceof Element || root instanceof Document ? root : document;

        if (scope instanceof Element && scope.matches('pre.vhd-code')) {
            enhanceBlock(scope);
        }

        scope.querySelectorAll?.('pre.vhd-code').forEach(enhanceBlock);
    }

    function start() {
        loadStyles();
        enhance(document);

        const observer = new MutationObserver(records => {
            for (const record of records) {
                for (const node of record.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        enhance(node);
                    }
                }
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        window.VanillaHtmlCode = Object.freeze({ enhance });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
