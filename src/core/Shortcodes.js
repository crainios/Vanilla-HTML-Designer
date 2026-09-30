// Shortcode previews belong to the editor DOM, never to the saved project.
const tokenPattern = /^(?:\{[^{}<>]+\})(?:[^{}<>]*\{[^{}<>]+\})*$/;
const defaultTags = [
    'shortcode'
];

function validTagName(value) {
    const tagName = String(value || '').trim().toLowerCase();
    return /^[a-z][a-z0-9_-]*$/.test(tagName) ? tagName : null;
}

function shortcodeMarkup(tagName, source) {
    return `<${tagName}>${source}</${tagName}>`;
}

export function serializeShortcodes(container) {
    if (!container.querySelector('[data-vhd-shortcode], [data-vhd-shortcode-caret]')) return container.innerHTML;
    const clone = container.cloneNode(true);
    clone.querySelectorAll('[data-vhd-shortcode-caret]').forEach(element => element.remove());
    clone.querySelectorAll('[data-vhd-shortcode]').forEach(element => {
        const tagName = validTagName(element.dataset.vhdShortcodeTag)
            || validTagName(element.localName)
            || 'shortcode';
        const token = document.createElement(tagName);
        token.textContent = element.dataset.vhdShortcode;
        element.replaceWith(token);
    });
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(node => {
        node.textContent = node.textContent.replace(/\u200b/g, '');
        if (!node.textContent) node.remove();
    });
    return clone.innerHTML;
}

// Used by plain-text paste and clear formatting: only shortcode markup survives.
export function shortcodeTextFragment(text) {
    const fragment = document.createDocumentFragment();
    const value = String(text);
    const pattern = /<([a-z][a-z0-9_-]*)>((?:\{[^{}<>]+\})(?:[^{}<>]*\{[^{}<>]+\})*)<\/\1>/gi;
    let offset = 0;

    for (const match of value.matchAll(pattern)) {
        if (match.index > offset) {
            fragment.append(document.createTextNode(value.slice(offset, match.index)));
        }

        const element = document.createElement(match[1].toLowerCase());
        element.textContent = match[2];
        fragment.append(element);
        offset = match.index + match[0].length;
    }

    if (offset < value.length) {
        fragment.append(document.createTextNode(value.slice(offset)));
    }

    return fragment;
}

export function shortcodePlainText(container) {
    let text = '';
    const visit = node => {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent.replace(/\u200b/g, '');
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches('[data-vhd-shortcode-caret]')) return;
            if (node.matches('[data-vhd-shortcode]') && tokenPattern.test(node.dataset.vhdShortcode)) {
                const tagName = validTagName(node.dataset.vhdShortcodeTag)
                    || validTagName(node.localName)
                    || 'shortcode';
                text += shortcodeMarkup(tagName, node.dataset.vhdShortcode);
                return;
            }
            if (node.tagName === 'BR') { text += '\n'; return; }
            const block = /^(P|DIV|H[1-6]|LI|BLOCKQUOTE|TR)$/.test(node.tagName);
            if (block && text && !text.endsWith('\n')) text += '\n';
            node.childNodes.forEach(visit);
            if (block && !text.endsWith('\n')) text += '\n';
        } else {
            node.childNodes.forEach(visit);
        }
    };
    container.childNodes.forEach(visit);
    return text.replace(/\n$/, '');
}

export default class Shortcodes {
    constructor(options) {
        this.options = options;
        this.tags = [...new Set([
            ...defaultTags,
            ...(Array.isArray(options.shortcodeTags) ? options.shortcodeTags : [])
        ].map(validTagName).filter(Boolean))];
        this.selector = this.tags.join(',');
        this.mode = options.shortcodeMode === 'rendered' ? 'rendered' : 'shortcode';
        this.views = new WeakMap();
        this.labels = { loading: 'Loading…', error: 'Preview unavailable' };
    }

    protect(container, refresh = false, forcedMode = null) {
        const mode = forcedMode ?? this.mode;
        const keepForcedRendering = forcedMode === 'rendered';
        container.querySelectorAll(this.selector).forEach(element => {
            const source = element.dataset.vhdShortcode || element.textContent;
            if (!tokenPattern.test(source)) return;
            const tagName = validTagName(element.dataset.vhdShortcodeTag)
                || validTagName(element.localName)
                || 'shortcode';
            const markup = shortcodeMarkup(tagName, source);
            const context = {
                tagName,
                type: tagName,
                source,
                html: markup
            };
            element.contentEditable = 'false';
            element.removeAttribute('title');
            if (!refresh && this.views.has(element)) return;
            const revision = {};
            this.views.set(element, revision);
            const display = typeof this.options.shortcodeDisplay === 'function'
                ? this.options.shortcodeDisplay(source, context) : null;
            const legacyBlock = tagName !== 'shortcode';
            const block = display === 'block'
                || (display !== 'inline' && legacyBlock);
            element.dataset.vhdShortcode = source;
            element.dataset.vhdShortcodeTag = tagName;
            element.className = 'vhd-shortcode';
            element.style.display = block ? 'block' : 'inline-block';
            element.style.width = block ? '100%' : 'auto';
            element.style.minWidth = block ? '100%' : '0';
            element.style.flex = block ? '0 0 100%' : '0 1 auto';
            element.style.clear = block ? 'both' : '';
            element.style.maxWidth = '100%';
            element.style.boxSizing = 'border-box';
            element.style.verticalAlign = 'middle';
            const host = document.createElement('span');
            host.textContent = source;
            host.style.cssText = block
                ? 'display:block;width:100%;min-width:100%;max-width:100%;box-sizing:border-box;'
                : 'display:inline-block;max-width:100%;vertical-align:middle;';
            const shadow = host.attachShadow({ mode: 'open' });
            const label = document.createElement('span');
            label.textContent = source;
            label.style.cssText = block
                ? 'display:block;width:100%;max-width:100%;box-sizing:border-box;white-space:nowrap;overflow-x:auto;background:#eef2ff;color:#3730a3;border:1px solid #a5b4fc;border-radius:4px;padding:2px 6px;'
                : 'display:inline-block;max-width:100%;white-space:nowrap;background:#eef2ff;color:#3730a3;border:1px solid #a5b4fc;border-radius:4px;padding:2px 6px;';
            const preview = document.createElement('span');
            preview.style.cssText = block
                ? 'display:block;width:100%;min-width:100%;max-width:100%;box-sizing:border-box;'
                : 'display:inline-block;max-width:100%;vertical-align:middle;';
            preview.append(label);
            const tooltip = document.createElement('span');
            tooltip.id = 'shortcode-tooltip';
            tooltip.setAttribute('role', 'tooltip');
            tooltip.textContent = `Shortcode : ${source}`;
            tooltip.hidden = true;
            tooltip.style.cssText = 'position:fixed;inset:auto;margin:0;padding:6px 10px;border:0;border-radius:5px;background:#111827;color:#fff;font:13px/1.4 system-ui,sans-serif;max-width:calc(100vw - 16px);box-sizing:border-box;overflow-wrap:anywhere;pointer-events:none;z-index:2147483647;';
            if (typeof tooltip.showPopover === 'function') tooltip.setAttribute('popover', 'manual');
            element.tabIndex = -1;
            element.setAttribute('role', 'group');
            element.setAttribute('aria-label', tooltip.textContent);
            label.setAttribute('aria-describedby', tooltip.id);
            const hideTooltip = () => {
                if (tooltip.hasAttribute('popover') && tooltip.matches(':popover-open')) tooltip.hidePopover();
                tooltip.hidden = true;
            };
            const showTooltip = () => {
                tooltip.hidden = false;
                if (typeof tooltip.showPopover === 'function') tooltip.showPopover();
                const rect = element.getBoundingClientRect();
                const bounds = tooltip.getBoundingClientRect();
                tooltip.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - bounds.width - 8))}px`;
                tooltip.style.top = `${Math.max(8, rect.top >= bounds.height + 8 ? rect.top - bounds.height - 6 : rect.bottom + 6)}px`;
            };
            element.onpointerenter = showTooltip;
            element.onpointerleave = hideTooltip;
            element.onfocus = showTooltip;
            element.onblur = hideTooltip;
            element.onkeydown = event => {
                if (event.key === 'Escape') hideTooltip();
            };
            element.onpointerdown = event => {
                if (event.button !== 0) return;
                const editable = element.closest('[contenteditable="true"]');
                const parent = element.parentNode;
                if (!editable || !parent) return;
                event.preventDefault();
                editable.focus({ preventScroll: true });
                const range = document.createRange();
                const after = event.clientX >= element.getBoundingClientRect().left
                    + element.getBoundingClientRect().width / 2;
                if (after) range.setStartAfter(element);
                else range.setStartBefore(element);
                range.collapse(true);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                editable.dispatchEvent(new CustomEvent('vhd:shortcode-caret', {
                    bubbles: true,
                    detail: { range: range.cloneRange() }
                }));
            };
            shadow.append(preview, tooltip);
            element.replaceChildren(host);
            element.nextElementSibling?.matches('[data-vhd-shortcode-caret]')
                && element.nextElementSibling.remove();
            if (!block) {
                const next = element.nextSibling;
                if (next?.nodeType === Node.TEXT_NODE) {
                    if (!next.textContent.startsWith('\u200b')) next.textContent = `\u200b${next.textContent}`;
                } else {
                    element.after(document.createTextNode('\u200b'));
                }
            }

            if (mode !== 'rendered' || typeof this.options.renderShortcode !== 'function') return;
            label.textContent = `${source} — ${this.labels.loading}`;
            const showError = () => {
                if (
                    this.views.get(element) === revision
                    && (keepForcedRendering || this.mode === 'rendered')
                ) {
                    label.textContent = `${source} — ${this.labels.error}`;
                }
            };
            Promise.resolve().then(() => this.options.renderShortcode(source, {
                ...context,
                display: block ? 'block' : 'inline'
            })).then(html => {
                if (
                    this.views.get(element) !== revision
                    || !element.isConnected
                    || (!keepForcedRendering && this.mode !== 'rendered')
                ) return;
                if (typeof html !== 'string') { showError(); return; }
                const rendered = document.createElement(block ? 'div' : 'span');
                rendered.className = 'vhd-shortcode-rendered';
                rendered.dataset.vhdShortcodePreview = '';
                rendered.inert = true;
                rendered.style.cssText = block
                    ? 'display:block;width:100%;min-width:100%;max-width:100%;box-sizing:border-box;pointer-events:none;'
                    : 'display:inline-block;max-width:100%;min-width:0;vertical-align:middle;pointer-events:none;';
                rendered.innerHTML = html;
                preview.replaceChildren();
                element.append(rendered);
            }).catch(showError);
        });
    }
}
