import { VERSION } from '../version.js';
import emojiCategories from './EmojiData.js';
import specialCharacterCategories from './SpecialCharacterData.js';

function brandLogoIcon() {
    return `
        <svg class="vhd-brand-logo" viewBox="0 0 72 48" aria-hidden="true" focusable="false">
            <rect x="1" y="1" width="70" height="46" rx="12" fill="#111827" stroke="#312e81" stroke-width="2"></rect>
            <path d="M18 11 7 24l11 13" fill="none" stroke="#ff3cac" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M27 15 35 34l8-19" fill="none" stroke="#8b5cf6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M51 18 47 31" fill="none" stroke="#00e5ff" stroke-width="4" stroke-linecap="round"></path>
            <path d="M55 11 66 24 55 37" fill="none" stroke="#ffb000" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
    `;
}

function indentIcon(type) {
    const arrow = type === 'outdent'
        ? '<path d="M10 9 6 12l4 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
        : '<path d="m6 9 4 3-4 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';

    return `
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            ${arrow}
            <path d="M13 7h7M13 12h7M13 17h7"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"/>
        </svg>
    `;
}

function alignmentIcon(type) {
    const widths = {
        left: [15, 11, 15, 8],
        center: [15, 9, 13, 7],
        right: [15, 11, 15, 8],
        justify: [15, 15, 15, 15]
    }[type];

    const x = width => {
        if (type === 'center') {
            return (18 - width) / 2;
        }

        if (type === 'right') {
            return 17 - width;
        }

        return 1;
    };

    return `
        <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
            ${widths.map((width, index) =>
                `<rect x="${x(width)}" y="${3 + index * 3.2}" width="${width}" height="1.5" rx=".5"></rect>`
            ).join('')}
        </svg>
    `;
}

function listIcon(ordered = false) {
    return ordered
        ? `
            <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
                <text x="1" y="6" font-size="5">1.</text>
                <text x="1" y="11" font-size="5">2.</text>
                <text x="1" y="16" font-size="5">3.</text>
                <rect x="7" y="3" width="10" height="1.4" rx=".5"></rect>
                <rect x="7" y="8" width="10" height="1.4" rx=".5"></rect>
                <rect x="7" y="13" width="10" height="1.4" rx=".5"></rect>
            </svg>
        `
        : `
            <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
                <circle cx="3" cy="4" r="1.2"></circle>
                <circle cx="3" cy="9" r="1.2"></circle>
                <circle cx="3" cy="14" r="1.2"></circle>
                <rect x="7" y="3" width="10" height="1.4" rx=".5"></rect>
                <rect x="7" y="8" width="10" height="1.4" rx=".5"></rect>
                <rect x="7" y="13" width="10" height="1.4" rx=".5"></rect>
            </svg>
        `;
}

function listStyleIcon(styleType) {
    const examples = {
        disc: '●',
        square: '■',
        circle: '○',
        decimal: '1 2 3',
        'lower-alpha': 'a b c',
        'upper-alpha': 'A B C',
        'lower-roman': 'i ii iii',
        'upper-roman': 'I II III',
        none: '×'
    };
    const example = examples[styleType] || examples.disc;
    const isBullet = ['disc', 'square', 'circle'].includes(styleType);

    return `
        <span class="vhd-list-style-example ${isBullet ? 'is-bullet' : ''}">
            ${example}
        </span>
    `;
}


function historyIcon(direction) {
    const transform = direction === 'redo' ? 'scale(-1 1) translate(-18 0)' : '';

    return `
        <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
            <g transform="${transform}">
                <path d="M7.2 4H3.5V.8L.7 4.3l2.8 3.5V4.9h3.7a5.1 5.1 0 1 1 0 10.2H5.5v-1.7h1.7a3.4 3.4 0 1 0 0-6.8z"></path>
            </g>
        </svg>
    `;
}

function clearFormattingIcon() {
    return `
        <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
            <path d="M5.1 2h8.2v1.7H10l-2.7 8h2.9v1.7H2.7v-1.7h2.8l2.7-8H5.1z"></path>
            <path d="M11.5 11.2l4.8 4.8-1.2 1.2-4.8-4.8z"></path>
        </svg>
    `;
}


function textColorIcon() {
    return `
        <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
            <path d="M3 15h2l1.2-3h5.6l1.2 3h2L10 2H8L3 15zm4-5 2-5 2 5H7z"></path>
            <rect x="3" y="16" width="12" height="1.5" rx=".5"></rect>
        </svg>
    `;
}

function backgroundColorIcon() {
    return `
        <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
            <path d="M3 13.5h12V17H3z"></path>
            <path d="M5 12l3.5-9h1L13 12h-2l-.8-2H7.8L7 12H5zm3.5-4h1L9 6.5 8.5 8z"></path>
        </svg>
    `;
}


function codeIcon(type) {
    if (type === 'json') {
        return `
            <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
                <path d="M6.5 2.5H5.3c-1.3 0-2 .7-2 2v2.1c0 .9-.4 1.4-1.3 1.6.9.2 1.3.7 1.3 1.6v2.1c0 1.3.7 2 2 2h1.2v-1.5h-.8c-.6 0-.9-.3-.9-.9V9.7c0-1-.4-1.6-1.2-2 .8-.4 1.2-1 1.2-2V4.5c0-.6.3-.9.9-.9h.8V2.5zm5 0v1.5h.8c.6 0 .9.3.9.9v1.2c0 1 .4 1.6 1.2 2-.8.4-1.2 1-1.2 2v1.8c0 .6-.3.9-.9.9h-.8v1.5h1.2c1.3 0 2-.7 2-2V10c0-.9.4-1.4 1.3-1.6-.9-.2-1.3-.7-1.3-1.6V4.5c0-1.3-.7-2-2-2h-1.2z"></path>
            </svg>
        `;
    }

    return `
        <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
            <path d="M6.2 4.1L1.8 9l4.4 4.9 1.2-1.1L4 9l3.4-3.8-1.2-1.1zm5.6 0-1.2 1.1L14 9l-3.4 3.8 1.2 1.1L16.2 9l-4.4-4.9z"></path>
        </svg>
    `;
}


function insertCodeIcon() {
    return `
        <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
            <path d="M6.2 4.1 1.8 9l4.4 4.9 1.2-1.1L4 9l3.4-3.8-1.2-1.1zm5.6 0-1.2 1.1L14 9l-3.4 3.8 1.2 1.1L16.2 9l-4.4-4.9z"></path>
            <path d="M10.8 2.5 7.2 15.5" fill="none" stroke="currentColor" stroke-width="1.4"></path>
        </svg>
    `;
}


function searchReplaceIcon() {
    return `
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <circle cx="10.5" cy="10.5" r="5.5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"/>
            <path d="M14.5 14.5 20 20M4 20h7M8.5 17.5 11 20l-2.5 2.5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"/>
        </svg>
    `;
}

function previewIcon() {
    return `
        <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
            <path d="M9 3C4.8 3 2 6.2.8 9c1.2 2.8 4 6 8.2 6s7-3.2 8.2-6C16 6.2 13.2 3 9 3zm0 10.2C6 13.2 3.8 11 2.7 9 3.8 7 6 4.8 9 4.8S14.2 7 15.3 9C14.2 11 12 13.2 9 13.2z"></path>
            <circle cx="9" cy="9" r="2.4"></circle>
        </svg>
    `;
}

function fullscreenIcon() {
    return `
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"/>
        </svg>
    `;
}



function inlineImageIcon() {
    return `
        <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
            <rect x="2" y="3" width="14" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"></rect>
            <circle cx="6" cy="7" r="1.5"></circle>
            <path d="M3.5 13l3.5-3.5 2.3 2.2 2.1-2.1 3.1 3.4z"></path>
        </svg>
    `;
}


function videoIcon() {
    return `
        <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
            <rect x="2" y="4" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"></rect>
            <path d="M12 7l4-2v8l-4-2z"></path>
        </svg>
    `;
}

export default class TextToolbar {
    constructor(translations, actions = {}) {
        this.t = translations;
        this.actions = actions;
        this.defaultFontFamily = actions.defaultFontFamily || 'system-ui';
        this.customButtons = Array.isArray(actions.customButtons) ? actions.customButtons : [];
        this.disabledToolbarButtons = new Set(
            Array.isArray(actions.disabledToolbarButtons)
                ? actions.disabledToolbarButtons.map(value => String(value))
                : []
        );
        this.activeEditable = null;
        this.commandButtons = new Map();
        this.alignmentTrigger = null;
        this.listTrigger = null;
        this.quoteButton = null;
        this.linkButton = null;
        this.formatSelect = null;
        this.fontSizeSelect = null;
        this.fontFamilySelect = null;
        this.savedRange = null;
        this.element = document.createElement('div');
        this.element.className = 'vhd-text-toolbar';
        this.element.hidden = false;

        this.#build();

        document.addEventListener('pointerdown', event => {
            const dropdown = event.target.closest?.(
                '.vhd-toolbar-dropdown'
            );

            /*
             * Keep a menu open only while the pointer interaction occurs inside one of the
             * toolbar dropdowns themselves. A click anywhere else — canvas,
             * Properties, another normal toolbar control, etc. — closes all
             * open menus.
             *
             * Dropdown triggers keep their own toggle logic and call
             * #closeMenus() before opening, so switching directly from one
             * dropdown to another remains deterministic.
             */
            if (
                !(dropdown instanceof HTMLElement)
                || !this.element.contains(dropdown)
            ) {
                this.#closeMenus();
            }
        }, true);

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                this.#closeMenus();
            }
        }, true);

        document.addEventListener('selectionchange', () => {
            const selection = window.getSelection();
            const node = selection?.anchorNode;
            const element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;

            if (
                element instanceof HTMLElement
                && this.activeEditable
                && (element === this.activeEditable || this.activeEditable.contains(element))
            ) {
                this.updateActiveStates();
            }
        });
    }

    #toolbarItem(key, element) {
        if (!(element instanceof HTMLElement)) {
            return element;
        }

        element.dataset.vhdToolbarKey = key;

        if (this.disabledToolbarButtons.has(key)) {
            element.hidden = true;
        }

        return element;
    }

    #cleanupToolbarSeparators() {
        const children = Array.from(this.element.children);

        const isVisibleItem = element =>
            !element.hidden
            && !element.classList.contains('vhd-toolbar-separator');

        children.forEach((element, index) => {
            if (!element.classList.contains('vhd-toolbar-separator')) {
                return;
            }

            const hasVisibleBefore = children
                .slice(0, index)
                .reverse()
                .some(isVisibleItem);

            const hasVisibleAfter = children
                .slice(index + 1)
                .some(isVisibleItem);

            const previousVisible = children
                .slice(0, index)
                .reverse()
                .find(element => !element.hidden);

            element.hidden =
                !hasVisibleBefore
                || !hasVisibleAfter
                || previousVisible?.classList.contains('vhd-toolbar-separator');
        });
    }

    #runExternalFormattingCommand(command, value = null) {
        if (typeof this.actions.formatSelection !== 'function') {
            return false;
        }

        return this.actions.formatSelection(command, value) === true;
    }

    #button(label, command, value = null, html = null) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'vhd-toolbar-button';
        button.title = label;
        button.setAttribute('aria-label', label);

        if (html) {
            button.innerHTML = html;
        } else {
            button.textContent = label;
        }

        if (
            [
                'bold',
                'italic',
                'underline',
                'strikeThrough',
                'superscript',
                'subscript'
            ].includes(command)
        ) {
            this.commandButtons.set(command, button);
        }

        button.addEventListener('mousedown', event => {
            this.#saveSelection();
            event.preventDefault();

            if (this.#runExternalFormattingCommand(command, value)) {
                return;
            }

            if (command === 'createLink') {
                const url = window.prompt('URL');

                if (url) {
                    this.#restoreSelection();
                    document.execCommand(command, false, url);
                    this.#keepSelection();
                }

                return;
            }

            this.#restoreSelection();
            document.execCommand(command, false, value);
            this.#keepSelection();
        });

        return button;
    }


    #actionButton(label, callback, html) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'vhd-toolbar-button';
        button.title = label;
        button.setAttribute('aria-label', label);
        button.innerHTML = html;
        button.addEventListener('mousedown', event => {
            this.#saveSelection();
            event.preventDefault();
            callback?.();
        });
        return button;
    }



    #separator() {
        const separator = document.createElement('span');
        separator.className = 'vhd-toolbar-separator';
        separator.setAttribute('aria-hidden', 'true');
        return separator;
    }


    #selectionTextNodeSegments(range) {
        if (
            !(range instanceof Range)
            || !(this.activeEditable instanceof HTMLElement)
            || range.collapsed
        ) {
            return [];
        }

        const walker = document.createTreeWalker(
            this.activeEditable,
            NodeFilter.SHOW_TEXT
        );

        const segments = [];
        let node;

        while ((node = walker.nextNode())) {
            if (!node.nodeValue || !range.intersectsNode(node)) {
                continue;
            }

            let start = 0;
            let end = node.nodeValue.length;

            if (node === range.startContainer) {
                start = range.startOffset;
            }

            if (node === range.endContainer) {
                end = range.endOffset;
            }

            if (start < end) {
                segments.push({ node, start, end });
            }
        }

        return segments;
    }

    #wrapTextSegment(node, start, end, property, value) {
        if (
            !(node instanceof Text)
            || start < 0
            || end > node.nodeValue.length
            || start >= end
        ) {
            return;
        }

        let selectedNode = node;

        if (end < selectedNode.nodeValue.length) {
            selectedNode.splitText(end);
        }

        if (start > 0) {
            selectedNode = selectedNode.splitText(start);
        }

        const parent = selectedNode.parentElement;

        if (
            parent instanceof HTMLSpanElement
            && parent.childNodes.length === 1
            && parent.firstChild === selectedNode
        ) {
            parent.style[property] = value;
            return;
        }

        const span = document.createElement('span');
        span.style[property] = value;
        selectedNode.replaceWith(span);
        span.append(selectedNode);
    }

    #applyLetterSpacing(value) {
        if (!(this.activeEditable instanceof HTMLElement)) {
            return false;
        }

        if (!this.#restoreSelection()) {
            return false;
        }

        const selection = window.getSelection();

        if (
            !selection
            || selection.rangeCount === 0
            || selection.isCollapsed
        ) {
            return false;
        }

        const range = selection.getRangeAt(0);

        if (!this.activeEditable.contains(range.commonAncestorContainer)) {
            return false;
        }

        const spacing = Number(value);

        if (!Number.isFinite(spacing)) {
            return false;
        }

        const bookmark = this.#getTextSelectionBookmark();
        const segments = this.#selectionTextNodeSegments(range);

        /*
         * Process from the end of the DOM selection backwards. Splitting a
         * text node therefore cannot invalidate offsets collected for an
         * earlier segment.
         */
        segments.reverse().forEach(({ node, start, end }) => {
            this.#wrapTextSegment(
                node,
                start,
                end,
                'letterSpacing',
                `${spacing}px`
            );
        });

        this.activeEditable.normalize();

        if (bookmark) {
            this.#restoreTextSelectionBookmark(bookmark);
        }

        this.activeEditable.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: 'formatLetterSpacing',
            data: String(spacing)
        }));

        this.#keepSelection(false);
        return true;
    }

    #selectionLineHeightTargets(range) {
        if (
            !(range instanceof Range)
            || !(this.activeEditable instanceof HTMLElement)
        ) {
            return [];
        }

        const blockSelector = [
            'p',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'li',
            'blockquote',
            'pre',
            'div'
        ].join(',');

        const targets = new Set();

        if (range.collapsed) {
            const node = range.startContainer;
            const element = node.nodeType === Node.ELEMENT_NODE
                ? node
                : node.parentElement;
            const block = element?.closest?.(blockSelector);

            if (
                block instanceof HTMLElement
                && block !== this.activeEditable
                && this.activeEditable.contains(block)
            ) {
                targets.add(block);
            }

            return Array.from(targets);
        }

        for (const { node } of this.#selectionTextNodeSegments(range)) {
            const block = node.parentElement?.closest?.(blockSelector);

            if (
                block instanceof HTMLElement
                && block !== this.activeEditable
                && this.activeEditable.contains(block)
            ) {
                targets.add(block);
            }
        }

        return Array.from(targets);
    }

    #applyLineHeight(value) {
        if (!(this.activeEditable instanceof HTMLElement)) {
            return false;
        }

        if (!this.#restoreSelection()) {
            return false;
        }

        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0) {
            return false;
        }

        const range = selection.getRangeAt(0);

        if (!this.activeEditable.contains(range.commonAncestorContainer)) {
            return false;
        }

        const lineHeight = Number(value);

        if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
            return false;
        }

        const bookmark = this.#getTextSelectionBookmark();
        const targets = this.#selectionLineHeightTargets(range);

        if (targets.length) {
            targets.forEach(target => {
                target.style.lineHeight = String(lineHeight);
            });
        } else {
            /*
             * Heading blocks use the heading itself as contenteditable, so
             * styling that outer element would not be persisted in
             * block.content. Wrap its inner content instead. The same fallback
             * also covers legacy text content made only of direct text nodes.
             */
            const wrapper = document.createElement('span');
            wrapper.style.lineHeight = String(lineHeight);

            const fragment = document.createDocumentFragment();

            while (this.activeEditable.firstChild) {
                fragment.append(this.activeEditable.firstChild);
            }

            wrapper.append(fragment);
            this.activeEditable.append(wrapper);
        }

        if (bookmark) {
            this.#restoreTextSelectionBookmark(bookmark);
        }

        this.activeEditable.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: 'formatLineHeight',
            data: String(lineHeight)
        }));

        this.#keepSelection(false);
        return true;
    }

    #formattingSelectRow(label, values, onChange) {
        const row = document.createElement('label');
        row.className =
            'vhd-toolbar-menu-item vhd-toolbar-formatting-select-item';

        const text = document.createElement('span');
        text.className = 'vhd-toolbar-formatting-select-label';
        text.textContent = label;

        const select = document.createElement('select');
        select.className = 'vhd-toolbar-formatting-select';
        select.setAttribute('aria-label', label);

        values.forEach(([value, optionLabel]) => {
            const option = document.createElement('option');
            option.value = String(value);
            option.textContent = optionLabel;
            select.append(option);
        });

        select.addEventListener('mousedown', () => {
            this.#saveSelection();
        });

        select.addEventListener('click', event => {
            event.stopPropagation();
        });

        select.addEventListener('change', event => {
            event.stopPropagation();
            onChange(select.value);
            this.#closeMenus();
        });

        row.append(text, select);
        return row;
    }


    #additionalFormattingDropdown(colorControl, backgroundColorControl) {
        const wrapper = document.createElement('div');
        wrapper.className = 'vhd-toolbar-dropdown';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'vhd-toolbar-button vhd-toolbar-dropdown-trigger';
        trigger.title = this.t.toolbar.moreFormatting;
        trigger.setAttribute('aria-label', this.t.toolbar.moreFormatting);
        trigger.setAttribute('aria-haspopup', 'true');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.innerHTML = `
            <span class="vhd-toolbar-more-format-icon">A</span>
            <span class="vhd-toolbar-caret">▾</span>
        `;

        const menu = document.createElement('div');
        menu.className = 'vhd-toolbar-menu vhd-toolbar-formatting-menu';
        menu.hidden = true;

        const addCommand = (key, label, command, icon) => {
            if (this.disabledToolbarButtons.has(key)) {
                return;
            }

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'vhd-toolbar-menu-item';
            button.title = label;
            button.setAttribute('aria-label', label);
            button.innerHTML = `
                <span class="vhd-toolbar-menu-icon">${icon}</span>
                <span>${label}</span>
            `;

            this.commandButtons.set(command, button);

            button.addEventListener('mousedown', event => {
                this.#saveSelection();
                event.preventDefault();

                if (this.#runExternalFormattingCommand(command, null)) {
                    this.#closeMenus();
                    return;
                }

                this.#restoreSelection();
                document.execCommand(command, false, null);
                this.#keepSelection();
                this.#closeMenus();
            });

            menu.append(button);
        };

        addCommand(
            'strike',
            this.t.toolbar.strike,
            'strikeThrough',
            '<s>S</s>'
        );

        addCommand(
            'superscript',
            this.t.toolbar.superscript,
            'superscript',
            '<span class="vhd-toolbar-script-icon">x<sup>2</sup></span>'
        );

        addCommand(
            'subscript',
            this.t.toolbar.subscript,
            'subscript',
            '<span class="vhd-toolbar-script-icon">x<sub>2</sub></span>'
        );

        const addColor = (key, label, control) => {
            if (this.disabledToolbarButtons.has(key)) {
                return;
            }

            const row = document.createElement('div');
            row.className = 'vhd-toolbar-menu-item vhd-toolbar-menu-color-item';

            const icon = document.createElement('span');
            icon.className = 'vhd-toolbar-menu-icon';

            const sourceSvg = control.querySelector('svg');
            if (sourceSvg) {
                icon.append(sourceSvg.cloneNode(true));
            }

            const text = document.createElement('span');
            text.textContent = label;
            text.className = 'vhd-toolbar-menu-color-label';

            control.classList.add('vhd-toolbar-color-control-menu');

            const colorInput = control.querySelector('input[type="color"]');

            const openColorPicker = event => {
                if (!(colorInput instanceof HTMLInputElement)) {
                    return;
                }

                /*
                 * The actual color input remains the source of truth, but the
                 * whole menu row is an activation target. Preserve the text
                 * selection before opening the native picker.
                 */
                this.#saveSelection();
                event?.preventDefault?.();

                try {
                    if (typeof colorInput.showPicker === 'function') {
                        colorInput.showPicker();
                    } else {
                        colorInput.click();
                    }
                } catch {
                    colorInput.click();
                }
            };

            row.addEventListener('mousedown', event => {
                if (
                    event.target === colorInput
                    || control.contains(event.target)
                ) {
                    return;
                }

                openColorPicker(event);
            });

            row.append(icon, text, control);
            menu.append(row);
        };

        addColor('textColor', this.t.toolbar.color, colorControl);
        addColor('backgroundColor', this.t.toolbar.backgroundColor, backgroundColorControl);

        if (!this.disabledToolbarButtons.has('letterSpacing')) {
            menu.append(
                this.#formattingSelectRow(
                    this.t.toolbar.letterSpacing,
                    [
                        ['0', '0 px'],
                        ['0.5', '0.5 px'],
                        ['1', '1 px'],
                        ['2', '2 px'],
                        ['3', '3 px']
                    ],
                    value => this.#applyLetterSpacing(value)
                )
            );
        }

        trigger.addEventListener('mousedown', event => {
            this.#saveSelection();
            event.preventDefault();

            const willOpen = menu.hidden;
            this.#closeMenus();

            if (willOpen) {
                menu.hidden = false;
                trigger.setAttribute('aria-expanded', 'true');
            }
        });

        wrapper.append(trigger, menu);

        if (!menu.children.length) {
            wrapper.hidden = true;
        }

        return wrapper;
    }

    #lineHeightDropdown() {
        return this.#dropdown(
            this.t.toolbar.lineHeight,
            '<span class="vhd-toolbar-line-height-icon">A↕</span>',
            ['1', '1.15', '1.25', '1.5', '1.75', '2'].map(value => ({
                label: value,
                icon: `<span style="line-height:${value}">A≡</span>`,
                action: () => this.#applyLineHeight(value)
            }))
        );
    }


    #dropdown(label, iconHtml, items, stateKey = null) {
        const wrapper = document.createElement('div');
        wrapper.className = 'vhd-toolbar-dropdown';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'vhd-toolbar-button vhd-toolbar-dropdown-trigger';
        trigger.title = label;
        trigger.setAttribute('aria-label', label);
        trigger.setAttribute('aria-haspopup', 'true');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.innerHTML = `${iconHtml}<span class="vhd-toolbar-caret">▾</span>`;

        const menu = document.createElement('div');
        menu.className = 'vhd-toolbar-menu';
        menu.hidden = true;

        for (const item of items) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'vhd-toolbar-menu-item';
            button.title = item.label;
            button.setAttribute('aria-label', item.label);
            button.innerHTML = item.icon
                ? `<span class="vhd-toolbar-menu-icon">${item.icon}</span><span>${item.label}</span>`
                : `<span>${item.label}</span>`;

            button.addEventListener('mousedown', event => {
                event.preventDefault();
                this.#restoreSelection();
                item.action();
                this.#keepSelection();
                this.#closeMenus();
            });

            menu.append(button);
        }

        trigger.addEventListener('mousedown', event => {
            this.#saveSelection();
            event.preventDefault();
            const willOpen = menu.hidden;
            this.#closeMenus();

            if (willOpen) {
                menu.hidden = false;
                trigger.setAttribute('aria-expanded', 'true');
            }
        });

        if (stateKey === 'alignment') {
            this.alignmentTrigger = trigger;
        }

        if (stateKey === 'list') {
            this.listTrigger = trigger;
        }

        wrapper.append(trigger, menu);
        return wrapper;
    }


    registerPluginButton(definition, context = {}) {
        if (!definition || typeof definition !== 'object') {
            throw new TypeError(
                'Vanilla HTML Designer: toolbar button definition must be an object.'
            );
        }

        const id = String(definition.id ?? '').trim();
        const label = String(definition.label ?? '').trim();

        if (!id || !label || typeof definition.action !== 'function') {
            throw new Error(
                'Vanilla HTML Designer: plugin toolbar button requires id, label and action.'
            );
        }

        const fullId = `${context.plugin || 'plugin'}:${id}`;

        if (
            this.element.querySelector(
                `[data-vhd-plugin-toolbar-id="${CSS.escape(fullId)}"]`
            )
        ) {
            throw new Error(
                `Vanilla HTML Designer: toolbar button "${fullId}" already exists.`
            );
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'vhd-toolbar-button vhd-plugin-toolbar-button';
        button.dataset.vhdPluginToolbarId = fullId;
        button.title = label;
        button.setAttribute('aria-label', label);

        if (definition.icon) {
            button.innerHTML = String(definition.icon);
        } else {
            button.textContent = String(definition.text ?? label.slice(0, 1));
        }

        button.addEventListener('mousedown', event => {
            this.#saveSelection();
            event.preventDefault();
        });

        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            this.#closeMenus();

            definition.action({
                editable: this.activeEditable
            });
        });

        const customActions = this.element.querySelector(
            '[data-vhd-toolbar-key="customActions"]'
        );

        if (customActions) {
            this.element.insertBefore(button, customActions);
        } else {
            this.element.append(button);
        }

        this.#cleanupToolbarSeparators();

        return button;
    }

    #closeMenus() {
        this.element.querySelectorAll('.vhd-toolbar-menu').forEach(menu => {
            menu.hidden = true;
        });

        this.element.querySelectorAll('.vhd-toolbar-dropdown-trigger').forEach(trigger => {
            trigger.setAttribute('aria-expanded', 'false');
        });
    }

    #applyList(ordered, styleType) {
        const selection = window.getSelection();

        if (!selection?.rangeCount) {
            return;
        }

        const targetTag = ordered ? 'ol' : 'ul';
        const range = selection.getRangeAt(0);
        const segments = this.#selectionTextNodeSegments(range);
        const selectedLists = new Set();

        segments.forEach(({ node }) => {
            const list = node.parentElement?.closest?.('ol,ul');

            if (list && this.activeEditable?.contains(list)) {
                selectedLists.add(list);
            }
        });

        let anchor = selection.anchorNode;

        if (anchor?.nodeType === Node.TEXT_NODE) {
            anchor = anchor.parentElement;
        }

        const anchorList = anchor?.closest?.('ol,ul');

        if (anchorList && this.activeEditable?.contains(anchorList)) {
            selectedLists.add(anchorList);
        }

        const selectionAlreadyUsesTargetList = selectedLists.size > 0
            && [...selectedLists].every(list =>
                list.tagName.toLowerCase() === targetTag
            )
            && (
                range.collapsed
                || segments.every(({ node }) =>
                    node.parentElement?.closest?.('ol,ul')
                        ?.tagName.toLowerCase() === targetTag
                )
            );

        if (!selectionAlreadyUsesTargetList) {
            document.execCommand(
                ordered ? 'insertOrderedList' : 'insertUnorderedList',
                false,
                null
            );

            selectedLists.clear();

            if (selection.rangeCount) {
                this.#selectionTextNodeSegments(selection.getRangeAt(0))
                    .forEach(({ node }) => {
                        const list = node.parentElement?.closest?.(targetTag);

                        if (list && this.activeEditable?.contains(list)) {
                            selectedLists.add(list);
                        }
                    });
            }

            anchor = selection.anchorNode;

            if (anchor?.nodeType === Node.TEXT_NODE) {
                anchor = anchor.parentElement;
            }

            const convertedList = anchor?.closest?.(targetTag);

            if (convertedList && this.activeEditable?.contains(convertedList)) {
                selectedLists.add(convertedList);
            }
        }

        let changed = false;

        selectedLists.forEach(list => {
            if (list.tagName.toLowerCase() !== targetTag) {
                return;
            }

            if (list.style.listStyleType !== styleType) {
                changed = true;
            }

            list.style.listStyleType = styleType;
            changed = this.#removeLeadingListDashes(list) || changed;
        });

        if (changed || !selectionAlreadyUsesTargetList) {
            this.activeEditable?.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                inputType: 'formatList',
                data: styleType
            }));
        }
    }

    #removeLeadingListDashes(list) {
        let changed = false;

        list.querySelectorAll(':scope > li').forEach(item => {
            const walker = document.createTreeWalker(
                item,
                NodeFilter.SHOW_TEXT
            );
            let textNode = walker.nextNode();
            const leadingWhitespaceNodes = [];

            while (textNode && !textNode.data.trim()) {
                leadingWhitespaceNodes.push(textNode);
                textNode = walker.nextNode();
            }

            if (!textNode) {
                return;
            }

            const cleaned = textNode.data.replace(
                /^[\s\u00a0]*[-‐‑‒–—][\s\u00a0]+/u,
                ''
            );

            if (cleaned !== textNode.data) {
                leadingWhitespaceNodes.forEach(node => node.remove());
                textNode.data = cleaned;
                changed = true;
            }
        });

        return changed;
    }

    #clearListFormatting() {
        const selection = window.getSelection();

        if (!selection?.rangeCount) {
            return;
        }

        let node = selection.anchorNode;

        if (node?.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
        }

        let list = node?.closest?.('ol,ul');

        if (!list && !selection.isCollapsed) {
            const segment = this.#selectionTextNodeSegments(
                selection.getRangeAt(0)
            ).find(({ node }) => node.parentElement?.closest?.('ol,ul'));

            list = segment?.node.parentElement?.closest?.('ol,ul');
        }

        if (!list || !this.activeEditable?.contains(list)) {
            return;
        }

        document.execCommand(
            list.tagName === 'OL'
                ? 'insertOrderedList'
                : 'insertUnorderedList',
            false,
            null
        );

        this.activeEditable.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: 'formatList',
            data: null
        }));
    }


    #clearFormatting() {
        const editable = this.activeEditable;

        if (!(editable instanceof HTMLElement) || editable.contentEditable !== 'true') {
            return;
        }

        if (!this.#restoreSelection()) {
            return;
        }

        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            return;
        }

        const range = selection.getRangeAt(0);

        if (!editable.contains(range.commonAncestorContainer)) {
            return;
        }

        const plainText = selection.toString();
        const lines = plainText.replace(/\r\n?/g, '\n').split('\n');

        if (/^H[1-6]$/.test(editable.tagName)) {
            const container = document.createElement('div');
            const beforeRange = range.cloneRange();
            const afterRange = range.cloneRange();

            beforeRange.selectNodeContents(editable);
            beforeRange.setEnd(range.startContainer, range.startOffset);
            container.append(beforeRange.cloneContents());
            const beforeHtml = container.innerHTML;

            container.replaceChildren();
            afterRange.selectNodeContents(editable);
            afterRange.setStart(range.endContainer, range.endOffset);
            container.append(afterRange.cloneContents());

            if (this.#runExternalFormattingCommand('clearFormatting', {
                plainText,
                beforeHtml,
                afterHtml: container.innerHTML
            })) {
                return;
            }
        }

        const fragment = document.createDocumentFragment();
        const insertedNodes = [];

        lines.forEach((line, index) => {
            if (index > 0) {
                const breakElement = document.createElement('br');
                fragment.append(breakElement);
                insertedNodes.push(breakElement);
            }

            if (line) {
                const textNode = document.createTextNode(line);
                fragment.append(textNode);
                insertedNodes.push(textNode);
            }
        });

        const structuralSelector = [
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'blockquote',
            'pre',
            'code',
            'ol',
            'ul',
            'li',
            'p[style]',
            'p[class]',
            'div[style]',
            'div[class]'
        ].join(',');
        const structuralElement = [...editable.querySelectorAll(structuralSelector)]
            .find(element => {
                try {
                    return range.intersectsNode(element);
                } catch {
                    return false;
                }
            });

        let resultRange = document.createRange();

        if (structuralElement) {
            const beforeRange = range.cloneRange();
            const afterRange = range.cloneRange();
            beforeRange.selectNodeContents(editable);
            beforeRange.setEnd(range.startContainer, range.startOffset);
            afterRange.selectNodeContents(editable);
            afterRange.setStart(range.endContainer, range.endOffset);

            const before = beforeRange.cloneContents();
            const after = afterRange.cloneContents();
            const removeEmptyListBoundary = (content, edge) => {
                let node = edge === 'start'
                    ? content.firstChild
                    : content.lastChild;

                while (node?.childNodes?.length) {
                    node = edge === 'start'
                        ? node.firstChild
                        : node.lastChild;
                }

                const element = node?.nodeType === Node.ELEMENT_NODE
                    ? node
                    : node?.parentElement;
                const item = element?.closest?.('li');

                if (
                    !(item instanceof HTMLLIElement)
                    || item.textContent.trim()
                    || item.querySelector('img,video,iframe,table,hr')
                ) {
                    return;
                }

                let parent = item.parentElement;
                item.remove();

                while (
                    parent
                    && ['OL', 'UL'].includes(parent.tagName)
                    && !parent.querySelector('li')
                ) {
                    const nextParent = parent.parentElement;
                    parent.remove();
                    parent = nextParent;
                }
            };

            removeEmptyListBoundary(before, 'end');
            removeEmptyListBoundary(after, 'start');

            const paragraph = document.createElement('p');
            paragraph.append(fragment);

            if (!paragraph.childNodes.length) {
                paragraph.append(document.createElement('br'));
            }

            editable.replaceChildren(before, paragraph, after);
            resultRange.selectNodeContents(paragraph);
        } else {
            range.deleteContents();
            range.insertNode(fragment);

            if (insertedNodes.length) {
                resultRange.setStartBefore(insertedNodes[0]);
                resultRange.setEndAfter(insertedNodes.at(-1));
            } else {
                resultRange.setStart(range.startContainer, range.startOffset);
                resultRange.collapse(true);
            }
        }

        selection.removeAllRanges();
        selection.addRange(resultRange);
        this.savedRange = resultRange.cloneRange();

        editable.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: 'formatRemove',
            data: null
        }));
        this.#keepSelection();
    }

    #applyIndent(command) {
        if (
            !(this.activeEditable instanceof HTMLElement)
            || !['indent', 'outdent'].includes(command)
        ) {
            return;
        }

        if (!this.#restoreSelection()) {
            return;
        }

        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0) {
            return;
        }

        const range = selection.getRangeAt(0);
        const blockSelector = 'p,div,li,h1,h2,h3,h4,h5,h6';
        const targets = [];

        const addTarget = element => {
            if (
                element instanceof HTMLElement
                && this.activeEditable.contains(element)
                && !targets.includes(element)
            ) {
                targets.push(element);
            }
        };

        const closestBlock = node => {
            const element = node?.nodeType === Node.TEXT_NODE
                ? node.parentElement
                : node;

            if (!(element instanceof HTMLElement)) {
                return null;
            }

            if (element === this.activeEditable) {
                return this.activeEditable;
            }

            return element.closest(blockSelector);
        };

        const startBlock = closestBlock(range.startContainer);
        const endBlock = closestBlock(range.endContainer);

        if (
            startBlock instanceof HTMLLIElement
            || endBlock instanceof HTMLLIElement
        ) {
            document.execCommand(command, false, null);

            this.activeEditable.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                inputType: command === 'indent'
                    ? 'formatIndent'
                    : 'formatOutdent',
                data: null
            }));

            this.#keepSelection();
            return;
        }

        if (range.collapsed) {
            addTarget(startBlock);
        } else {
            const candidates = this.activeEditable.querySelectorAll(blockSelector);

            candidates.forEach(element => {
                try {
                    if (range.intersectsNode(element)) {
                        addTarget(element);
                    }
                } catch (error) {
                    // Ignore nodes that cannot be intersected by the current range.
                }
            });

            if (!targets.length) {
                addTarget(startBlock);
                addTarget(endBlock);
            }
        }

        if (!targets.length) {
            addTarget(this.activeEditable);
        }

        const step = 2;

        targets.forEach(element => {
            const current = Number.parseFloat(
                element.style.marginLeft || getComputedStyle(element).marginLeft || '0'
            ) || 0;

            const currentRem = current / (
                Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
            );

            const next = command === 'indent'
                ? currentRem + step
                : Math.max(0, currentRem - step);

            if (next <= 0) {
                element.style.removeProperty('margin-left');
            } else {
                element.style.marginLeft = `${next}rem`;
            }
        });

        this.activeEditable.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: command === 'indent'
                ? 'formatIndent'
                : 'formatOutdent',
            data: null
        }));

        this.#keepSelection();
    }

    #applyAlignment(alignment) {
        if (!['left', 'center', 'right', 'justify'].includes(alignment)) {
            return;
        }

        if (this.#runExternalFormattingCommand('alignment', alignment)) {
            return;
        }

        if (!(this.activeEditable instanceof HTMLElement)) {
            return;
        }

        if (!this.#restoreSelection()) {
            return;
        }

        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0) {
            return;
        }

        const range = selection.getRangeAt(0);
        const blockSelector = 'p,div,li,blockquote,h1,h2,h3,h4,h5,h6';
        const targets = [];

        const addTarget = element => {
            if (
                element instanceof HTMLElement
                && this.activeEditable.contains(element)
                && !targets.includes(element)
            ) {
                targets.push(element);
            }
        };

        const closestBlock = node => {
            const element = node?.nodeType === Node.TEXT_NODE
                ? node.parentElement
                : node;

            if (!(element instanceof HTMLElement)) {
                return null;
            }

            if (element === this.activeEditable) {
                return this.activeEditable;
            }

            const block = element.closest(blockSelector);

            return block && this.activeEditable.contains(block)
                ? block
                : this.activeEditable;
        };

        if (range.collapsed) {
            addTarget(closestBlock(range.startContainer));
        } else {
            const walker = document.createTreeWalker(
                this.activeEditable,
                NodeFilter.SHOW_ELEMENT,
                {
                    acceptNode: node => {
                        if (
                            !(node instanceof HTMLElement)
                            || !node.matches(blockSelector)
                        ) {
                            return NodeFilter.FILTER_SKIP;
                        }

                        try {
                            return range.intersectsNode(node)
                                ? NodeFilter.FILTER_ACCEPT
                                : NodeFilter.FILTER_SKIP;
                        } catch {
                            return NodeFilter.FILTER_SKIP;
                        }
                    }
                }
            );

            let node;

            while ((node = walker.nextNode())) {
                /*
                 * Keep the deepest paragraph-like nodes. Applying alignment
                 * to a parent and its child at the same time is unnecessary
                 * and can make nested rich text harder to edit.
                 */
                const hasMatchingChild = [...node.querySelectorAll(blockSelector)]
                    .some(child => {
                        try {
                            return range.intersectsNode(child);
                        } catch {
                            return false;
                        }
                    });

                if (!hasMatchingChild) {
                    addTarget(node);
                }
            }

            if (!targets.length) {
                addTarget(closestBlock(range.startContainer));
                addTarget(closestBlock(range.endContainer));
            }
        }

        if (!targets.length) {
            addTarget(this.activeEditable);
        }

        for (const target of targets) {
            target.style.textAlign = alignment;
        }

        this.activeEditable.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: 'formatJustify',
            data: null
        }));

        this.#keepSelection(false);
        this.updateActiveStates();
    }

    #toggleQuote() {
        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0) {
            return;
        }

        let node = selection.anchorNode;

        if (node?.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
        }

        if (!(node instanceof HTMLElement)) {
            return;
        }

        const blockquote = node.closest('blockquote');

        if (blockquote && this.activeEditable?.contains(blockquote)) {
            const parent = blockquote.parentNode;

            while (blockquote.firstChild) {
                parent.insertBefore(blockquote.firstChild, blockquote);
            }

            blockquote.remove();
        } else {
            document.execCommand('formatBlock', false, 'blockquote');
        }

        this.activeEditable?.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: 'formatBlock',
            data: null
        }));

        this.updateActiveStates();
    }

    #emojiDropdown() {
        const wrapper = document.createElement('span');
        wrapper.className = 'vhd-toolbar-dropdown';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'vhd-toolbar-button';
        trigger.textContent = '😀';
        trigger.title = this.t.toolbar.emoji;
        trigger.setAttribute('aria-label', this.t.toolbar.emoji);
        trigger.setAttribute('aria-haspopup', 'true');
        trigger.setAttribute('aria-expanded', 'false');

        const menu = document.createElement('span');
        menu.className = 'vhd-toolbar-menu vhd-emoji-picker';
        menu.hidden = true;

        const tabs = document.createElement('span');
        tabs.className = 'vhd-emoji-tabs';

        const panel = document.createElement('span');
        panel.className = 'vhd-emoji-panel';

        const language = document.documentElement.lang?.toLowerCase().startsWith('fr') ? 'fr' : 'en';

        const renderCategory = category => {
            panel.replaceChildren();

            category.emojis.forEach(emoji => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'vhd-emoji-button';
                button.textContent = emoji;
                button.title = emoji;
                button.setAttribute('aria-label', emoji);

                button.addEventListener('mousedown', event => event.preventDefault());
                button.addEventListener('click', () => {
                    this.#insertEmoji(emoji);
                    menu.hidden = true;
                    trigger.setAttribute('aria-expanded', 'false');
                });

                panel.append(button);
            });

            tabs.querySelectorAll('.vhd-emoji-tab').forEach(button => {
                button.classList.toggle('is-active', button.dataset.category === category.id);
            });
        };

        emojiCategories.forEach(category => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'vhd-emoji-tab';
            button.dataset.category = category.id;
            button.textContent = category.icon;
            button.title = category.label[language] || category.label.en;
            button.setAttribute('aria-label', category.label[language] || category.label.en);

            button.addEventListener('mousedown', event => event.preventDefault());
            button.addEventListener('click', event => {
                event.stopPropagation();
                renderCategory(category);
            });

            tabs.append(button);
        });

        menu.append(tabs, panel);
        renderCategory(emojiCategories[0]);

        trigger.addEventListener('mousedown', () => this.#saveSelection());
        trigger.addEventListener('click', event => {
            event.stopPropagation();
            const open = menu.hidden;
            this.#closeMenus();
            menu.hidden = !open;
            trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        wrapper.append(trigger, menu);
        return wrapper;
    }

    #saveSelection() {
        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0 || !this.activeEditable) {
            return;
        }

        const range = selection.getRangeAt(0);

        if (this.activeEditable.contains(range.commonAncestorContainer)) {
            this.savedRange = range.cloneRange();
        }
    }

    #restoreSelection() {
        if (
            !(this.activeEditable instanceof HTMLElement)
            || !this.savedRange
            || !this.activeEditable.contains(this.savedRange.commonAncestorContainer)
        ) {
            return false;
        }

        const selection = window.getSelection();

        if (!selection) {
            return false;
        }

        selection.removeAllRanges();
        selection.addRange(this.savedRange.cloneRange());
        return true;
    }

    #getTextSelectionBookmark() {
        if (!(this.activeEditable instanceof HTMLElement)) {
            return null;
        }

        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0) {
            return null;
        }

        const range = selection.getRangeAt(0);

        if (!this.activeEditable.contains(range.commonAncestorContainer)) {
            return null;
        }

        const beforeStart = range.cloneRange();
        beforeStart.selectNodeContents(this.activeEditable);
        beforeStart.setEnd(range.startContainer, range.startOffset);

        const beforeEnd = range.cloneRange();
        beforeEnd.selectNodeContents(this.activeEditable);
        beforeEnd.setEnd(range.endContainer, range.endOffset);

        return {
            start: beforeStart.toString().length,
            end: beforeEnd.toString().length
        };
    }

    #restoreTextSelectionBookmark(bookmark) {
        if (
            !bookmark
            || !(this.activeEditable instanceof HTMLElement)
        ) {
            return false;
        }

        const walker = document.createTreeWalker(
            this.activeEditable,
            NodeFilter.SHOW_TEXT
        );

        const range = document.createRange();
        let node;
        let offset = 0;
        let startSet = false;
        let endSet = false;

        while ((node = walker.nextNode())) {
            const nextOffset = offset + node.textContent.length;

            if (!startSet && bookmark.start <= nextOffset) {
                range.setStart(
                    node,
                    Math.max(0, bookmark.start - offset)
                );
                startSet = true;
            }

            if (!endSet && bookmark.end <= nextOffset) {
                range.setEnd(
                    node,
                    Math.max(0, bookmark.end - offset)
                );
                endSet = true;
                break;
            }

            offset = nextOffset;
        }

        if (!startSet || !endSet) {
            return false;
        }

        const selection = window.getSelection();

        if (!selection) {
            return false;
        }

        selection.removeAllRanges();
        selection.addRange(range);
        this.savedRange = range.cloneRange();

        return true;
    }

    #keepSelection(updateState = true) {
        const selection = window.getSelection();

        if (
            selection
            && selection.rangeCount > 0
            && this.activeEditable instanceof HTMLElement
        ) {
            const range = selection.getRangeAt(0);

            if (this.activeEditable.contains(range.commonAncestorContainer)) {
                this.savedRange = range.cloneRange();
            }
        }

        this.activeEditable?.focus({ preventScroll: true });
        this.#restoreSelection();

        if (updateState) {
            this.updateActiveStates();
        }
    }

    insertAtCursor(content, options = {}) {
        const html = options.html === true;

        if (!(this.activeEditable instanceof HTMLElement)) {
            return false;
        }

        const selection = window.getSelection();
        let range = this.savedRange?.cloneRange() ?? null;

        if (!range || !this.activeEditable.contains(range.commonAncestorContainer)) {
            range = document.createRange();
            range.selectNodeContents(this.activeEditable);
            range.collapse(false);
        }

        range.deleteContents();

        let lastNode;

        if (html) {
            const template = document.createElement('template');
            template.innerHTML = String(content ?? '');
            const fragment = template.content;
            lastNode = fragment.lastChild;
            range.insertNode(fragment);
        } else {
            lastNode = document.createTextNode(String(content ?? ''));
            range.insertNode(lastNode);
        }

        if (lastNode) {
            range.setStartAfter(lastNode);
        }
        range.collapse(true);

        selection.removeAllRanges();
        selection.addRange(range);
        this.savedRange = range.cloneRange();

        this.activeEditable.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: html ? 'insertHTML' : 'insertText',
            data: html ? null : String(content ?? '')
        }));

        this.activeEditable.focus();
        this.updateActiveStates();
        return true;
    }

    #customActionsDropdown() {
        if (!this.customButtons.length) {
            return null;
        }

        const wrapper = document.createElement('span');
        wrapper.className = 'vhd-toolbar-dropdown vhd-custom-actions';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'vhd-toolbar-button vhd-toolbar-dropdown-trigger';
        trigger.innerHTML = `
            <span class="vhd-custom-actions-trigger-main" aria-hidden="true">+</span>
            <span class="vhd-custom-actions-trigger-caret" aria-hidden="true">▾</span>
        `;
        trigger.title = this.t.toolbar.customActions;
        trigger.setAttribute('aria-label', this.t.toolbar.customActions);
        trigger.setAttribute('aria-haspopup', 'true');
        trigger.setAttribute('aria-expanded', 'false');

        const menu = document.createElement('span');
        menu.className = 'vhd-toolbar-menu vhd-custom-actions-menu';
        menu.hidden = true;

        for (const item of this.customButtons) {
            if (!item || !item.label || !item.action) continue;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'vhd-toolbar-menu-item vhd-custom-action-item';

            const icon = document.createElement('span');
            icon.className = 'vhd-custom-action-icon';
            icon.innerHTML = item.icon || '•';

            const label = document.createElement('span');
            label.className = 'vhd-custom-action-label';
            label.textContent = item.label;

            button.append(icon, label);

            button.addEventListener('mousedown', event => {
                event.preventDefault();
                this.#saveSelection();
            });

            button.addEventListener('click', async event => {
                event.stopPropagation();
                menu.hidden = true;
                trigger.setAttribute('aria-expanded', 'false');

                const fn = typeof item.action === 'function'
                    ? item.action
                    : window[item.action];

                if (typeof fn !== 'function') {
                    console.warn(`Vanilla HTML Designer: custom action "${item.action}" was not found.`);
                    return;
                }

                const result = await fn({
                    editor: this.actions.publicApi?.(),
                    editable: this.activeEditable,
                    insert: (content, options = {}) => this.insertAtCursor(content, options)
                });

                if (typeof result === 'string') {
                    this.insertAtCursor(result);
                } else if (result && typeof result === 'object' && 'content' in result) {
                    this.insertAtCursor(result.content, { html: result.html === true });
                }
            });

            menu.append(button);
        }

        if (!menu.children.length) {
            return null;
        }

        trigger.addEventListener('mousedown', event => {
            event.preventDefault();
            this.#saveSelection();
            const open = menu.hidden;
            this.#closeMenus();
            menu.hidden = !open;
            trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        wrapper.append(trigger, menu);
        return wrapper;
    }

    #insertTextAtSavedSelection(text) {
        this.insertAtCursor(text);
    }

    #insertEmoji(emoji) {
        this.#insertTextAtSavedSelection(emoji);
    }

    #specialCharacterDropdown() {
        const wrapper = document.createElement('span');
        wrapper.className = 'vhd-toolbar-dropdown';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'vhd-toolbar-button';
        trigger.textContent = 'Ω';
        trigger.title = this.t.toolbar.specialCharacters;
        trigger.setAttribute('aria-label', this.t.toolbar.specialCharacters);
        trigger.setAttribute('aria-haspopup', 'true');
        trigger.setAttribute('aria-expanded', 'false');

        const menu = document.createElement('span');
        menu.className = 'vhd-toolbar-menu vhd-special-picker';
        menu.hidden = true;

        const tabs = document.createElement('span');
        tabs.className = 'vhd-special-tabs';

        const panel = document.createElement('span');
        panel.className = 'vhd-special-panel';

        const language = document.documentElement.lang?.toLowerCase().startsWith('fr') ? 'fr' : 'en';

        const renderCategory = category => {
            panel.replaceChildren();

            category.characters.forEach(character => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'vhd-special-button';
                button.textContent = character;
                button.title = character;
                button.setAttribute('aria-label', character);

                button.addEventListener('mousedown', event => event.preventDefault());
                button.addEventListener('click', () => {
                    this.#insertTextAtSavedSelection(character);
                    menu.hidden = true;
                    trigger.setAttribute('aria-expanded', 'false');
                });

                panel.append(button);
            });

            tabs.querySelectorAll('.vhd-special-tab').forEach(button => {
                button.classList.toggle('is-active', button.dataset.category === category.id);
            });
        };

        specialCharacterCategories.forEach(category => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'vhd-special-tab';
            button.dataset.category = category.id;
            button.textContent = category.icon;
            button.title = category.label[language] || category.label.en;
            button.setAttribute('aria-label', category.label[language] || category.label.en);

            button.addEventListener('mousedown', event => event.preventDefault());
            button.addEventListener('click', event => {
                event.stopPropagation();
                renderCategory(category);
            });

            tabs.append(button);
        });

        menu.append(tabs, panel);
        renderCategory(specialCharacterCategories[0]);

        trigger.addEventListener('mousedown', () => this.#saveSelection());
        trigger.addEventListener('click', event => {
            event.stopPropagation();
            const open = menu.hidden;
            this.#closeMenus();
            menu.hidden = !open;
            trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        wrapper.append(trigger, menu);
        return wrapper;
    }

    #showAboutDialog() {
        if (!this.aboutDialog) {
            this.aboutDialog = document.createElement('dialog');
            this.aboutDialog.className = 'vhd-about-dialog';

            const content = document.createElement('div');
            content.className = 'vhd-about-content';

            const logo = document.createElement('div');
            logo.className = 'vhd-about-logo';
            logo.innerHTML = brandLogoIcon();

            const title = document.createElement('h2');
            title.textContent = 'Vanilla HTML Designer';

            const version = document.createElement('p');
            version.className = 'vhd-about-version';
            version.textContent = `Version ${VERSION}`;

            const description = document.createElement('p');
            description.innerHTML = `
                Éditeur visuel HTML léger<br>
                100 % Vanilla JavaScript<br>
                Sans framework<br>
                <a href="https://github.com/crainios/Vanilla-HTML-Designer"
                   target="_blank"
                   rel="noopener noreferrer">GitHub</a>
            `;

            const credits = document.createElement('p');
            credits.innerHTML = `
                Idée de F. Milhiet<br>
                Programmation ChatGPT
            `;

            const license = document.createElement('p');
            license.textContent = 'Licence : AGPL-3.0';

            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'vhd-secondary-button';
            close.textContent = 'Fermer';
            close.addEventListener('click', () => this.aboutDialog.close());

            content.append(
                logo,
                title,
                version,
                description,
                credits,
                license,
                close
            );

            this.aboutDialog.append(content);
            document.body.append(this.aboutDialog);

            this.aboutDialog.addEventListener('click', event => {
                if (event.target === this.aboutDialog) {
                    this.aboutDialog.close();
                }
            });
        }

        this.aboutDialog.showModal();
    }

    #build() {
        const fontFamily = document.createElement('select');
        fontFamily.className = 'vhd-toolbar-select vhd-font-family-select';
        fontFamily.title = this.t.toolbar.fontFamily;
        fontFamily.setAttribute('aria-label', this.t.toolbar.fontFamily);
        fontFamily.innerHTML = `
            <option value="system-ui">System UI</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="Verdana, sans-serif">Verdana</option>
            <option value="Tahoma, sans-serif">Tahoma</option>
            <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="serif">Serif</option>
            <option value="sans-serif">Sans-serif</option>
            <option value="monospace">Monospace</option>
        `;

        const normalizeFamily = value => String(value)
            .replaceAll('"', '')
            .replaceAll("'", '')
            .replace(/\s*,\s*/g, ',')
            .trim()
            .toLowerCase();

        const firstFamily = value =>
            normalizeFamily(value).split(',')[0];

        const defaultFirstFamily = firstFamily(this.defaultFontFamily);

        let defaultOption = Array.from(fontFamily.options).find(option =>
            firstFamily(option.value) === defaultFirstFamily
        );

        if (defaultOption) {
            defaultOption.value = this.defaultFontFamily;
        } else {
            defaultOption = document.createElement('option');
            defaultOption.value = this.defaultFontFamily;
            defaultOption.textContent = String(this.defaultFontFamily)
                .split(',')[0]
                .replaceAll('"', '')
                .replaceAll("'", '')
                .trim();

            fontFamily.prepend(defaultOption);
        }

        this.fontFamilySelect = fontFamily;
        this.defaultFontOptionValue = defaultOption.value;

        fontFamily.value = this.defaultFontOptionValue;

        fontFamily.addEventListener('mousedown', event => {
            this.#saveSelection();
            event.stopPropagation();
        });

        fontFamily.addEventListener('change', () => {
            const selectedFont = fontFamily.value;

            if (!selectedFont) {
                return;
            }

            if (this.#runExternalFormattingCommand('fontName', selectedFont)) {
                this.fontFamilySelect.value = selectedFont;
                return;
            }

            if (!this.#restoreSelection()) {
                return;
            }

            const selection = window.getSelection();

            if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                return;
            }

            /*
             * Ask the browser to generate CSS styles rather than legacy
             * <font face> markup. This also avoids replacing nodes immediately
             * after the command, which could invalidate the active Range.
             */
            document.execCommand('styleWithCSS', false, true);
            document.execCommand('fontName', false, selectedFont);

            this.activeEditable?.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                inputType: 'formatFontName',
                data: null
            }));

            /*
             * Keep the exact same text selected. Do not recalculate the toolbar
             * before restoring the requested select value: selectionchange can
             * otherwise make the previous font appear selected again.
             */
            this.#keepSelection(false);
            this.fontFamilySelect.value = selectedFont;

            requestAnimationFrame(() => {
                this.fontFamilySelect.value = selectedFont;
            });
        });

        const fontSize = document.createElement('select');
        fontSize.className = 'vhd-toolbar-select vhd-font-size-select';
        fontSize.title = this.t.toolbar.fontSize;
        fontSize.setAttribute('aria-label', this.t.toolbar.fontSize);
        fontSize.innerHTML = `
            <option value="8">8 pt</option>
            <option value="9">9 pt</option>
            <option value="10">10 pt</option>
            <option value="11">11 pt</option>
            <option value="12" selected>12 pt</option>
            <option value="14">14 pt</option>
            <option value="16">16 pt</option>
            <option value="18">18 pt</option>
            <option value="20">20 pt</option>
            <option value="24">24 pt</option>
            <option value="28">28 pt</option>
            <option value="36">36 pt</option>
            <option value="48">48 pt</option>
        `;
        this.fontSizeSelect = fontSize;
        fontSize.value = '12';

        fontSize.addEventListener('mousedown', event => {
            this.#saveSelection();
            event.stopPropagation();
        });

        fontSize.addEventListener('change', () => {
            const selectedSize = fontSize.value;

            if (!selectedSize) {
                return;
            }

            if (this.#runExternalFormattingCommand('fontSizePt', selectedSize)) {
                this.fontSizeSelect.value = selectedSize;
                return;
            }

            if (!this.#restoreSelection()) {
                return;
            }

            const selection = window.getSelection();

            if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                return;
            }

            const bookmark = this.#getTextSelectionBookmark();

            document.execCommand('fontSize', false, '7');

            this.activeEditable?.querySelectorAll('font[size="7"]').forEach(element => {
                const span = document.createElement('span');
                span.style.fontSize = `${selectedSize}pt`;

                while (element.firstChild) {
                    span.append(element.firstChild);
                }

                element.replaceWith(span);
            });

            this.activeEditable?.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                inputType: 'formatFontSize',
                data: null
            }));

            /*
             * Replacing the temporary <font> elements invalidates the browser
             * Range. Rebuild it from text offsets so the same text remains
             * selected and another size can be tested immediately.
             */
            this.#restoreTextSelectionBookmark(bookmark);
            this.activeEditable?.focus({ preventScroll: true });
            this.#restoreTextSelectionBookmark(bookmark);

            /*
             * Keep the requested size visible in the toolbar. A
             * selectionchange event may run while the DOM is being rewritten.
             */
            this.fontSizeSelect.value = selectedSize;

            requestAnimationFrame(() => {
                this.fontSizeSelect.value = selectedSize;
            });
        });

        const format = document.createElement('select');
        format.className = 'vhd-toolbar-select';
        format.innerHTML = `
            <option value="p" selected>${this.t.toolbar.paragraph}</option>
            <option value="h1">${this.t.toolbar.heading1}</option>
            <option value="h2">${this.t.toolbar.heading2}</option>
            <option value="h3">${this.t.toolbar.heading3}</option>
            <option value="h4">${this.t.toolbar.heading4}</option>
            <option value="h5">${this.t.toolbar.heading5}</option>
            <option value="h6">${this.t.toolbar.heading6}</option>
        `;
        this.formatSelect = format;
        format.value = 'p';

        format.addEventListener('mousedown', event => {
            this.#saveSelection();
            event.stopPropagation();
        });

        format.addEventListener('change', () => {
            /*
             * Keep the user's selected format before restoring the text
             * selection. Restoring it can fire selectionchange, which in turn
             * refreshes the toolbar and would otherwise reset this select to
             * the current heading level.
             */
            const nextTag = format.value;

            this.#restoreSelection();

            const currentTag = this.activeEditable?.tagName?.toLowerCase();
            const isHeadingBlock = /^h[1-6]$/.test(currentTag || '');

            if (isHeadingBlock && /^h[1-6]$/.test(nextTag)) {
                this.activeEditable.dispatchEvent(new CustomEvent('vhd:heading-level', {
                    bubbles: true,
                    detail: {
                        level: Number(nextTag.slice(1))
                    }
                }));

                format.value = nextTag;

                requestAnimationFrame(() => {
                    format.value = nextTag;
                });

                return;
            }

            document.execCommand('formatBlock', false, nextTag);
            this.#keepSelection();

            format.value = nextTag;

            requestAnimationFrame(() => {
                format.value = nextTag;
            });
        });

        const colorControl = document.createElement('label');
        colorControl.className = 'vhd-toolbar-color-control';
        colorControl.title = this.t.toolbar.color;
        colorControl.setAttribute('aria-label', this.t.toolbar.color);
        colorControl.innerHTML = textColorIcon();

        const color = document.createElement('input');
        color.type = 'color';
        color.className = 'vhd-toolbar-color-input';
        color.setAttribute('aria-label', this.t.toolbar.color);
        color.addEventListener('mousedown', () => this.#saveSelection());
        color.addEventListener('input', () => {
            if (this.#runExternalFormattingCommand('foreColor', color.value)) {
                return;
            }

            if (!this.#restoreSelection()) {
                return;
            }

            document.execCommand('foreColor', false, color.value);
            this.#keepSelection();
        });
        colorControl.append(color);

        const backgroundColorControl = document.createElement('label');
        backgroundColorControl.className = 'vhd-toolbar-color-control';
        backgroundColorControl.title = this.t.toolbar.backgroundColor;
        backgroundColorControl.setAttribute('aria-label', this.t.toolbar.backgroundColor);
        backgroundColorControl.innerHTML = backgroundColorIcon();

        const backgroundColor = document.createElement('input');
        backgroundColor.type = 'color';
        backgroundColor.className = 'vhd-toolbar-color-input';
        backgroundColor.setAttribute('aria-label', this.t.toolbar.backgroundColor);
        backgroundColor.addEventListener('mousedown', () => this.#saveSelection());
        backgroundColor.addEventListener('input', () => {
            if (
                this.#runExternalFormattingCommand(
                    'hiliteColor',
                    backgroundColor.value
                )
            ) {
                return;
            }

            if (!this.#restoreSelection()) {
                return;
            }

            document.execCommand('hiliteColor', false, backgroundColor.value);
            this.#keepSelection();
        });
        backgroundColorControl.append(backgroundColor);

        const additionalFormatting = this.#additionalFormattingDropdown(
            colorControl,
            backgroundColorControl
        );

        const lineHeight = this.#lineHeightDropdown();

        const lists = this.#dropdown(
            this.t.toolbar.lists,
            listIcon(false),
            [
                {
                    label: this.t.toolbar.unorderedDisc,
                    icon: listStyleIcon('disc'),
                    action: () => this.#applyList(false, 'disc')
                },
                {
                    label: this.t.toolbar.unorderedSquare,
                    icon: listStyleIcon('square'),
                    action: () => this.#applyList(false, 'square')
                },
                {
                    label: this.t.toolbar.unorderedCircle,
                    icon: listStyleIcon('circle'),
                    action: () => this.#applyList(false, 'circle')
                },
                {
                    label: this.t.toolbar.orderedDecimal,
                    icon: listStyleIcon('decimal'),
                    action: () => this.#applyList(true, 'decimal')
                },
                {
                    label: this.t.toolbar.orderedLowerAlpha,
                    icon: listStyleIcon('lower-alpha'),
                    action: () => this.#applyList(true, 'lower-alpha')
                },
                {
                    label: this.t.toolbar.orderedUpperAlpha,
                    icon: listStyleIcon('upper-alpha'),
                    action: () => this.#applyList(true, 'upper-alpha')
                },
                {
                    label: this.t.toolbar.orderedLowerRoman,
                    icon: listStyleIcon('lower-roman'),
                    action: () => this.#applyList(true, 'lower-roman')
                },
                {
                    label: this.t.toolbar.orderedUpperRoman,
                    icon: listStyleIcon('upper-roman'),
                    action: () => this.#applyList(true, 'upper-roman')
                },
                {
                    label: this.t.toolbar.clearList,
                    icon: listStyleIcon('none'),
                    action: () => this.#clearListFormatting()
                }
            ],
            'list'
        );

        const alignment = this.#dropdown(
            this.t.toolbar.alignment,
            alignmentIcon('left'),
            [
                {
                    label: this.t.toolbar.alignLeft,
                    icon: alignmentIcon('left'),
                    action: () => this.#applyAlignment('left')
                },
                {
                    label: this.t.toolbar.alignCenter,
                    icon: alignmentIcon('center'),
                    action: () => this.#applyAlignment('center')
                },
                {
                    label: this.t.toolbar.alignRight,
                    icon: alignmentIcon('right'),
                    action: () => this.#applyAlignment('right')
                },
                {
                    label: this.t.toolbar.justify,
                    icon: alignmentIcon('justify'),
                    action: () => this.#applyAlignment('justify')
                },
                ...(
                    this.disabledToolbarButtons.has('outdent')
                        ? []
                        : [{
                            label: this.t.toolbar.outdent,
                            icon: indentIcon('outdent'),
                            action: () => this.#applyIndent('outdent')
                        }]
                ),
                ...(
                    this.disabledToolbarButtons.has('indent')
                        ? []
                        : [{
                            label: this.t.toolbar.indent,
                            icon: indentIcon('indent'),
                            action: () => this.#applyIndent('indent')
                        }]
                )
            ],
            'alignment'
        );

        const undoButton = this.#actionButton(
            this.t.actions.undo,
            () => this.actions.undo?.(),
            historyIcon('undo')
        );

        const redoButton = this.#actionButton(
            this.t.actions.redo,
            () => this.actions.redo?.(),
            historyIcon('redo')
        );

        const clearFormattingButton = this.#actionButton(
            this.t.actions.clearFormatting,
            () => this.#clearFormatting(),
            clearFormattingIcon()
        );

        this.quoteButton = this.#actionButton(
            this.t.toolbar.quote,
            () => this.#toggleQuote(),
            '❝'
        );

        const customActions = this.#customActionsDropdown();

        const versionBadge = document.createElement('button');
        versionBadge.type = 'button';
        versionBadge.className = 'vhd-version-badge';
        versionBadge.title = 'À propos de Vanilla HTML Designer';
        versionBadge.setAttribute('aria-label', 'À propos de Vanilla HTML Designer');
        versionBadge.innerHTML = brandLogoIcon();
        versionBadge.addEventListener('click', () => this.#showAboutDialog());

        this.element.append(
            // History / reset
            this.#toolbarItem('undo', undoButton),
            this.#toolbarItem('redo', redoButton),
            this.#toolbarItem('clearFormatting', clearFormattingButton),
            this.#toolbarItem(
                'searchReplace',
                this.#actionButton(
                    this.t.toolbar.searchReplace,
                    () => this.actions.searchReplace?.(),
                    searchReplaceIcon()
                )
            ),
            this.#separator(),

            // Character formatting
            this.#toolbarItem('bold', this.#button(this.t.toolbar.bold, 'bold', null, '<strong>B</strong>')),
            this.#toolbarItem('italic', this.#button(this.t.toolbar.italic, 'italic', null, '<em>I</em>')),
            this.#toolbarItem('underline', this.#button(this.t.toolbar.underline, 'underline', null, '<u>U</u>')),
            this.#toolbarItem('moreFormatting', additionalFormatting),
            this.#toolbarItem('fontFamily', fontFamily),
            this.#toolbarItem('fontSize', fontSize),
            this.#separator(),

            // Insertion
            this.#toolbarItem(
                'link',
                this.linkButton = this.#button(this.t.toolbar.link, 'createLink', null, '🔗')
            ),
            this.#toolbarItem(
                'inlineImage',
                this.#actionButton(
                    this.t.toolbar.inlineImage,
                    () => this.actions.insertInlineImage?.(this.activeEditable),
                    inlineImageIcon()
                )
            ),
            this.#toolbarItem(
                'video',
                this.#actionButton(
                    this.t.toolbar.video,
                    () => this.actions.insertVideo?.(this.activeEditable),
                    videoIcon()
                )
            ),
            this.#toolbarItem(
                'code',
                this.#actionButton(
                    this.t.toolbar.insertCode,
                    () => this.actions.insertCode?.(this.activeEditable),
                    insertCodeIcon()
                )
            ),
            this.#toolbarItem('emoji', this.#emojiDropdown()),
            this.#toolbarItem('specialCharacters', this.#specialCharacterDropdown()),
            this.#separator(),

            // Paragraph formatting
            this.#toolbarItem('paragraph', format),
            this.#toolbarItem('lineHeight', lineHeight),
            this.#toolbarItem('lists', lists),
            this.#toolbarItem('quote', this.quoteButton),
            this.#toolbarItem('alignment', alignment),
            this.#separator(),

            // Host application extensions
            ...(customActions
                ? [
                    this.#toolbarItem('customActions', customActions),
                    this.#separator()
                ]
                : []),

            // Output / preview
            this.#toolbarItem(
                'exportJson',
                this.#actionButton(
                    this.t.actions.exportJson,
                    () => this.actions.exportJson?.(),
                    codeIcon('json')
                )
            ),
            this.#toolbarItem(
                'exportHtml',
                this.#actionButton(
                    this.t.actions.exportHtml,
                    () => this.actions.exportHtml?.(),
                    codeIcon('html')
                )
            ),
            this.#toolbarItem(
                'preview',
                this.#actionButton(
                    this.t.actions.preview,
                    () => this.actions.preview?.(),
                    previewIcon()
                )
            ),
            this.#toolbarItem(
                'fullscreen',
                this.#actionButton(
                    this.t.actions.fullscreen,
                    () => this.actions.fullscreen?.(),
                    fullscreenIcon()
                )
            ),

            // Version / identity — intentionally never disableable
            versionBadge
        );

        this.#cleanupToolbarSeparators();
    }


    updateActiveStates() {
        if (!(this.activeEditable instanceof HTMLElement)) {
            return;
        }

        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0) {
            return;
        }

        let node = selection.anchorNode;

        if (!node) {
            return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
        }

        if (!(node instanceof HTMLElement)) {
            return;
        }

        if (node !== this.activeEditable && !this.activeEditable.contains(node)) {
            return;
        }

        const ancestors = [];
        let current = node;

        while (current instanceof HTMLElement) {
            ancestors.push(current);

            if (current === this.activeEditable) {
                break;
            }

            current = current.parentElement;
        }

        const hasTag = (...tags) => ancestors.some(element =>
            tags.includes(element.tagName.toLowerCase())
        );

        const hasComputedStyle = predicate => ancestors.some(element =>
            predicate(window.getComputedStyle(element))
        );

        const states = {
            bold:
                hasTag('strong', 'b')
                || hasComputedStyle(style => {
                    const numericWeight = Number.parseInt(style.fontWeight, 10);
                    return style.fontWeight === 'bold'
                        || (!Number.isNaN(numericWeight) && numericWeight >= 600);
                }),

            italic:
                hasTag('em', 'i')
                || hasComputedStyle(style =>
                    style.fontStyle === 'italic' || style.fontStyle === 'oblique'
                ),

            underline:
                hasTag('u')
                || hasComputedStyle(style =>
                    style.textDecorationLine.includes('underline')
                ),

            strikeThrough:
                hasTag('s', 'strike', 'del')
                || hasComputedStyle(style =>
                    style.textDecorationLine.includes('line-through')
                ),

            superscript:
                hasTag('sup')
                || hasComputedStyle(style =>
                    style.verticalAlign === 'super'
                ),

            subscript:
                hasTag('sub')
                || hasComputedStyle(style =>
                    style.verticalAlign === 'sub'
                )
        };

        for (const [command, button] of this.commandButtons.entries()) {
            const active = Boolean(states[command]);
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
        }

        if (this.fontFamilySelect) {
            const normalizeFamily = value => String(value)
                .replaceAll('"', '')
                .replaceAll("'", '')
                .replace(/\s*,\s*/g, ',')
                .trim()
                .toLowerCase();

            const explicitFontElement = ancestors.find(element =>
                element !== this.activeEditable
                && (
                    element.style?.fontFamily
                    || (
                        element.tagName.toLowerCase() === 'font'
                        && element.getAttribute('face')
                    )
                )
            );

            if (!explicitFontElement) {
                this.fontFamilySelect.value = this.defaultFontOptionValue;
            } else {
                const explicitFamily = normalizeFamily(
                    explicitFontElement.style?.fontFamily
                    || explicitFontElement.getAttribute('face')
                    || ''
                );
                const explicitFirstFamily = explicitFamily.split(',')[0];
                const options = Array.from(this.fontFamilySelect.options);

                let match = options.find(option =>
                    normalizeFamily(option.value) === explicitFamily
                );

                if (!match) {
                    match = options.find(option =>
                        normalizeFamily(option.value).split(',')[0] === explicitFirstFamily
                    );
                }

                this.fontFamilySelect.value = match?.value
                    || this.defaultFontOptionValue;
            }
        }

        if (this.fontSizeSelect) {
            const styledElement = ancestors.find(element => element.style?.fontSize);
            const computedPixels = styledElement
                ? Number.parseFloat(window.getComputedStyle(styledElement).fontSize)
                : Number.parseFloat(window.getComputedStyle(node).fontSize);

            const computedPoints = computedPixels * 0.75;

            const availableSizes = Array.from(this.fontSizeSelect.options)
                .map(option => option.value)
                .filter(Boolean);

            const matchedSize = availableSizes.find(value =>
                Math.abs(Number(value) - computedPoints) < 0.25
            );

            this.fontSizeSelect.value = matchedSize || '12';
        }

        if (this.formatSelect) {
            const formatElement = ancestors.find(element => {
                const tag = element.tagName.toLowerCase();
                return ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag);
            });

            this.formatSelect.value = formatElement
                ? formatElement.tagName.toLowerCase()
                : 'p';
        }

        const link = ancestors.find(element =>
            element.tagName.toLowerCase() === 'a'
        );

        if (this.linkButton) {
            const active = Boolean(link);
            this.linkButton.classList.toggle('is-active', active);
            this.linkButton.setAttribute('aria-pressed', active ? 'true' : 'false');
        }

        const quote = ancestors.find(element =>
            element.tagName.toLowerCase() === 'blockquote'
        );

        if (this.quoteButton) {
            const active = Boolean(quote);
            this.quoteButton.classList.toggle('is-active', active);
            this.quoteButton.setAttribute('aria-pressed', active ? 'true' : 'false');
        }

        const list = ancestors.find(element => {
            const tag = element.tagName.toLowerCase();
            return tag === 'ul' || tag === 'ol';
        });

        if (this.listTrigger) {
            this.listTrigger.classList.toggle('is-active', Boolean(list));

            if (list) {
                this.listTrigger.dataset.listType = list.tagName.toLowerCase();
                this.listTrigger.dataset.listStyle = window.getComputedStyle(list).listStyleType;
            } else {
                delete this.listTrigger.dataset.listType;
                delete this.listTrigger.dataset.listStyle;
            }
        }

        if (this.alignmentTrigger) {
            const block = ancestors.find(element => {
                const display = window.getComputedStyle(element).display;
                return ['block', 'list-item', 'table-cell', 'flex', 'grid'].includes(display);
            }) || this.activeEditable;

            const alignment = window.getComputedStyle(block).textAlign;

            this.alignmentTrigger.classList.toggle(
                'is-active',
                ['center', 'right', 'justify'].includes(alignment)
            );

            this.alignmentTrigger.dataset.alignment = alignment;
        }
    }

    setActiveEditable(element) {
        this.activeEditable = element;
        this.updateActiveStates();
    }

    show() {
        this.element.hidden = false;
        this.updateActiveStates();
    }

    hide() {
        this.#closeMenus();
    }
}
