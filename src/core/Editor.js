import Grid from '../layout/Grid.js';
import BlockFactory from '../blocks/BlockFactory.js';
import Serializer from './Serializer.js';
import History from './History.js';
import TextToolbar from '../toolbar/TextToolbar.js';
import HtmlImporter from './HtmlImporter.js';

function deepMerge(base, override) {
    const result = structuredClone(base);

    for (const [key, value] of Object.entries(override ?? {})) {
        if (
            value
            && typeof value === 'object'
            && !Array.isArray(value)
            && result[key]
            && typeof result[key] === 'object'
        ) {
            result[key] = deepMerge(result[key], value);
        } else {
            result[key] = value;
        }
    }

    return result;
}

export default class Editor {
    #emit(event, detail = {}) {
        this.options?.emitEvent?.(event, detail);
    }

    #populateRowWithDefaultText(row) {
        row.columns.forEach(column => {
            if (!column.blocks.length) {
                column.blocks.push(BlockFactory.create('text'));
            }
        });

        return row;
    }

    #createDefaultProject() {
        const row = this.#populateRowWithDefaultText(Grid.createPreset('one'));

        return {
            version: 1,
            rows: [row]
        };
    }

    constructor(root, options, fallbackTranslations) {
        this.root = root;
        this.options = {
            ...options,
            defaultFontFamily: options.defaultFontFamily || 'system-ui'
        };
        this.disabledContentBlocks = new Set(
            Array.isArray(options.disabledContentBlocks)
                ? options.disabledContentBlocks.map(value => String(value))
                : []
        );
        this.disabledSections = new Set(
            Array.isArray(options.disabledSections)
                ? options.disabledSections.map(value => String(value))
                : []
        );
        this.root.style.setProperty('--vhd-default-font-family', this.options.defaultFontFamily);
        this.t = deepMerge(fallbackTranslations, this.options.translations ?? {});
        this.project = this.#normalizeLegacyColumnBackgrounds(
            HtmlImporter.fromHtml(this.options.html)
                || this.#createDefaultProject()
        );
        this.history = new History();
        this.statusMessage = '';
        this.statusType = 'info';
        this.isFullscreen = false;
        this.previousBodyOverflow = '';
        this.blockDrag = null;
        this.blockDragScrollFrame = null;
        this.blockDragScrollDirection = 0;
        this.blockDragScrollSpeed = 0;
        this.rowDrag = null;
        this.rowDragScrollFrame = null;
        this.rowDragScrollDirection = 0;
        this.rowDragScrollSpeed = 0;
        this.selectedTableCell = null;
        this.tableSelection = null;
        this.isFormattingTableSelection = false;
        this.tableCellDrag = null;
        this.tableColumnResize = null;
        this.fullscreenKeyHandler = event => {
            if (event.key === 'Escape' && this.isFullscreen) {
                event.preventDefault();
                this.toggleFullscreen(false);
            }
        };

        this.selectionMenuPointerDown = false;

        this.selectionPointerUpHandler = event => {
            if (
                this.selectionMenu instanceof HTMLElement
                && this.selectionMenu.contains(event.target)
            ) {
                return;
            }

            requestAnimationFrame(() => {
                const selection = window.getSelection();

                if (
                    !selection
                    || selection.rangeCount === 0
                    || selection.isCollapsed
                ) {
                    this.#hideSelectionMenu();
                    return;
                }

                const range = selection.getRangeAt(0);
                const common = range.commonAncestorContainer;
                const commonElement = common.nodeType === Node.ELEMENT_NODE
                    ? common
                    : common.parentElement;
                const editable = commonElement?.closest?.('.vhd-editable-text');

                if (
                    !(editable instanceof HTMLElement)
                    || !this.root.contains(editable)
                ) {
                    this.#hideSelectionMenu();
                    return;
                }

                this.#showSelectionMenu(editable);
            });
        };

        document.addEventListener(
            'pointerup',
            this.selectionPointerUpHandler
        );

        this.textToolbar = new TextToolbar(this.t, {
            defaultFontFamily: this.options.defaultFontFamily,
            customButtons: this.options.customButtons ?? [],
            disabledToolbarButtons: this.options.disabledToolbarButtons ?? [],
            publicApi: () => this.options.publicApi ?? null,
            undo: () => this.undo(),
            redo: () => this.redo(),
            exportJson: () => this.#showOutput(JSON.stringify(this.getData(), null, 2)),
            exportHtml: () => this.#showOutput(this.getHtml()),
            preview: () => this.#showPreview(),
            fullscreen: () => this.toggleFullscreen(),
            searchReplace: () => this.#showSearchReplaceDialog(),
            formatSelection: (command, value) =>
                this.#formatContextualSelection(command, value),
            insertInlineImage: editable => this.#insertInlineImage(editable),
            insertVideo: editable => this.#insertVideo(editable),
            insertCode: editable => this.#insertInlineCode(editable)
        });

        this.#buildShell();
        this.render();
    }

    registerToolbarButton(definition, context = {}) {
        return this.textToolbar.registerPluginButton(definition, context);
    }

    refreshBlockRegistry() {
        this.render();
        return BlockFactory.registered;
    }

    setStatus(message = '', type = 'info') {
        const allowedTypes = new Set(['info', 'success', 'error']);

        this.statusMessage = String(message ?? '');
        this.statusType = allowedTypes.has(type) ? type : 'info';
        this.#updateStatusMessage();

        return {
            message: this.statusMessage,
            type: this.statusType
        };
    }

    toggleFullscreen(force = null) {
        const nextState = typeof force === 'boolean'
            ? force
            : !this.isFullscreen;

        if (nextState === this.isFullscreen) {
            return this.isFullscreen;
        }

        this.isFullscreen = nextState;
        this.root.classList.toggle('vhd-fullscreen', this.isFullscreen);

        if (this.isFullscreen) {
            this.previousBodyOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            document.addEventListener('keydown', this.fullscreenKeyHandler, true);
        } else {
            document.body.style.overflow = this.previousBodyOverflow;
            document.removeEventListener('keydown', this.fullscreenKeyHandler, true);
        }

        const button = this.root.querySelector('[data-vhd-toolbar-key="fullscreen"]');

        if (button) {
            button.classList.toggle('is-active', this.isFullscreen);
            button.setAttribute('aria-pressed', this.isFullscreen ? 'true' : 'false');
            button.title = this.isFullscreen
                ? this.t.actions.exitFullscreen
                : this.t.actions.fullscreen;
            button.setAttribute(
                'aria-label',
                this.isFullscreen
                    ? this.t.actions.exitFullscreen
                    : this.t.actions.fullscreen
            );
        }

        return this.isFullscreen;
    }

    insertAtCursor(content, options = {}) {
        return this.textToolbar.insertAtCursor(content, options);
    }

    async openImageGallery(context = {}) {
        return this.#openImageGallery(context);
    }

    insertImage(image) {
        if (!image?.src) {
            return false;
        }

        const selected = {
            src: String(image.src),
            alt: String(image.alt ?? '')
        };

        const pending = this.pendingImageTarget;
        this.pendingImageTarget = null;

        if (pending?.type === 'block' && pending.block) {
            this.#remember();
            pending.block.src = selected.src;
            pending.block.alt = selected.alt;
            this.#closeImageGallery();
            this.render();
            return true;
        }

        const editable = pending?.editable || this.textToolbar.activeEditable;

        if (!(editable instanceof HTMLElement) || editable.contentEditable !== 'true') {
            this.#closeImageGallery();
            return false;
        }

        const imageElement = document.createElement('img');
        imageElement.src = selected.src;
        imageElement.alt = selected.alt;
        imageElement.className = 'vhd-inline-image';
        imageElement.dataset.align = 'left';
        imageElement.dataset.size = '33';
        imageElement.dataset.spacing = '12';
        imageElement.dataset.borderRadius = '0';
        imageElement.style.width = '33%';
        this.#applyInlineImageStyles(imageElement);

        let range = pending?.range?.cloneRange() ?? null;

        if (!range || !editable.contains(range.commonAncestorContainer)) {
            range = document.createRange();
            range.selectNodeContents(editable);
            range.collapse(false);
        }

        range.deleteContents();
        range.insertNode(imageElement);

        const selection = window.getSelection();
        const caret = document.createRange();
        caret.setStartAfter(imageElement);
        caret.collapse(true);
        selection.removeAllRanges();
        selection.addRange(caret);

        editable.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: 'insertImage',
            data: null
        }));

        this.#closeImageGallery();
        editable.focus();
        this.#selectInlineImage(imageElement);
        return true;
    }

    closeImageGallery() {
        this.pendingImageTarget = null;
        this.#closeImageGallery();
    }

    #rangeToPlainText(range) {
        if (!(range instanceof Range)) {
            return '';
        }

        const fragment = range.cloneContents();
        const container = document.createElement('div');
        container.append(fragment);

        const blockTags = new Set([
            'ADDRESS',
            'ARTICLE',
            'ASIDE',
            'BLOCKQUOTE',
            'DIV',
            'DL',
            'DT',
            'DD',
            'FIGCAPTION',
            'FIGURE',
            'FOOTER',
            'HEADER',
            'H1',
            'H2',
            'H3',
            'H4',
            'H5',
            'H6',
            'LI',
            'MAIN',
            'NAV',
            'OL',
            'P',
            'PRE',
            'SECTION',
            'UL'
        ]);

        const collect = node => {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.nodeValue || '';
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                return '';
            }

            if (node.tagName === 'BR') {
                return '\n';
            }

            let text = '';

            for (const child of node.childNodes) {
                text += collect(child);
            }

            if (
                blockTags.has(node.tagName)
                && text
                && !text.endsWith('\n')
            ) {
                text += '\n';
            }

            return text;
        };

        return collect(container)
            .replace(/\r\n?/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\n$/, '');
    }

    #selectionCodeBlock(editable) {
        if (!(editable instanceof HTMLElement)) {
            return null;
        }

        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0) {
            return null;
        }

        const range = selection.getRangeAt(0);
        const nodes = [
            range.startContainer,
            range.endContainer,
            selection.anchorNode,
            selection.focusNode
        ];

        for (const node of nodes) {
            const element = node?.nodeType === Node.ELEMENT_NODE
                ? node
                : node?.parentElement;
            const pre = element?.closest?.('pre.vhd-code');

            if (
                pre instanceof HTMLPreElement
                && editable.contains(pre)
            ) {
                return pre;
            }
        }

        return null;
    }

    #codeToText(editable, pre) {
        if (
            !(editable instanceof HTMLElement)
            || !(pre instanceof HTMLPreElement)
            || !editable.contains(pre)
        ) {
            return false;
        }

        const text = (pre.textContent || '')
            .replaceAll('\r\n', '\n')
            .replaceAll('\r', '\n');

        this.#remember();

        const paragraph = document.createElement('p');
        const lines = text.split('\n');

        lines.forEach((line, index) => {
            if (index > 0) {
                paragraph.append(document.createElement('br'));
            }

            if (line) {
                paragraph.append(document.createTextNode(line));
            }
        });

        if (!paragraph.childNodes.length) {
            paragraph.append(document.createElement('br'));
        }

        pre.replaceWith(paragraph);

        const range = document.createRange();
        range.selectNodeContents(paragraph);
        range.collapse(false);

        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        editable.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: 'formatBlock',
            data: 'p'
        }));

        editable.focus();
        this.textToolbar.setActiveEditable(editable);

        return true;
    }

    #insertInlineCode(editable) {
        if (
            !(editable instanceof HTMLElement)
            || editable.contentEditable !== 'true'
            || !editable.classList.contains('vhd-editable-text')
        ) {
            return false;
        }

        const currentCode = this.#selectionCodeBlock(editable);

        if (currentCode) {
            return this.#codeToText(editable, currentCode);
        }

        const selection = window.getSelection();
        let range = null;

        if (
            selection
            && selection.rangeCount > 0
            && editable.contains(
                selection.getRangeAt(0).commonAncestorContainer
            )
        ) {
            range = selection.getRangeAt(0).cloneRange();
        }

        if (!range) {
            range = document.createRange();
            range.selectNodeContents(editable);
            range.collapse(false);
        }

        const selectedText = range.collapsed
            ? ''
            : this.#rangeToPlainText(range);

        this.#remember();
        range.deleteContents();

        const pre = document.createElement('pre');
        pre.className = 'vhd-code';

        const code = document.createElement('code');
        code.textContent = selectedText;

        if (!selectedText) {
            code.append(document.createElement('br'));
        }

        pre.append(code);
        range.insertNode(pre);

        /*
         * Keep a normal paragraph immediately after a code region. This makes
         * it possible to continue writing without having to create another
         * VHD content block.
         */
        let paragraph = pre.nextElementSibling;

        if (
            !(paragraph instanceof HTMLElement)
            || paragraph.tagName !== 'P'
        ) {
            paragraph = document.createElement('p');
            paragraph.append(document.createElement('br'));
            pre.after(paragraph);
        }

        const caret = document.createRange();

        if (selectedText) {
            caret.selectNodeContents(code);
            caret.collapse(false);
        } else {
            caret.selectNodeContents(code);
            caret.collapse(true);
        }

        selection?.removeAllRanges();
        selection?.addRange(caret);

        editable.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: 'insertCode',
            data: selectedText || null
        }));

        editable.focus();
        this.textToolbar.setActiveEditable(editable);

        return true;
    }

    #insertTextAtRange(range, text) {
        const node = document.createTextNode(text);
        range.deleteContents();
        range.insertNode(node);

        const selection = window.getSelection();
        const caret = document.createRange();
        caret.setStartAfter(node);
        caret.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(caret);
    }

    #moveCaretAfterCode(pre, editable) {
        let paragraph = pre.nextElementSibling;

        if (
            !(paragraph instanceof HTMLElement)
            || paragraph.tagName !== 'P'
        ) {
            paragraph = document.createElement('p');
            paragraph.append(document.createElement('br'));
            pre.after(paragraph);
        }

        const range = document.createRange();
        range.selectNodeContents(paragraph);
        range.collapse(true);

        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        editable.focus();
    }

    #getSearchableElements() {
        const items = [];

        this.canvas.querySelectorAll('.vhd-block').forEach(wrapper => {
            const rowIndex = Number(wrapper.dataset.rowIndex);
            const columnIndex = Number(wrapper.dataset.columnIndex);
            const blockIndex = Number(wrapper.dataset.blockIndex);
            const block = this.project?.rows?.[rowIndex]?.columns?.[columnIndex]?.blocks?.[blockIndex];

            if (!block) {
                return;
            }

            if (block.type === 'heading' || block.type === 'text') {
                const element = wrapper.querySelector('[contenteditable="true"]');

                if (element) {
                    items.push({
                        block,
                        wrapper,
                        element,
                        kind: 'html'
                    });
                }

                return;
            }

        });

        return items;
    }

    #findTextMatches(query, caseSensitive = false) {
        const needle = String(query ?? '');

        if (!needle) {
            return [];
        }

        const searchedNeedle = caseSensitive
            ? needle
            : needle.toLocaleLowerCase();

        const matches = [];

        for (const item of this.#getSearchableElements()) {
            const text = item.kind === 'code'
                ? item.element.value
                : item.element.textContent || '';

            const searchedText = caseSensitive
                ? text
                : text.toLocaleLowerCase();

            let offset = 0;

            while (offset <= searchedText.length - searchedNeedle.length) {
                const index = searchedText.indexOf(searchedNeedle, offset);

                if (index === -1) {
                    break;
                }

                matches.push({
                    ...item,
                    start: index,
                    end: index + needle.length
                });

                offset = index + Math.max(1, needle.length);
            }
        }

        return matches;
    }

    #rangeFromTextOffsets(element, start, end) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT
        );

        let position = 0;
        let startNode = null;
        let startOffset = 0;
        let endNode = null;
        let endOffset = 0;
        let node;

        while ((node = walker.nextNode())) {
            const nextPosition = position + node.nodeValue.length;

            if (!startNode && start >= position && start <= nextPosition) {
                startNode = node;
                startOffset = Math.min(node.nodeValue.length, start - position);
            }

            if (end >= position && end <= nextPosition) {
                endNode = node;
                endOffset = Math.min(node.nodeValue.length, end - position);
                break;
            }

            position = nextPosition;
        }

        if (!startNode || !endNode) {
            return null;
        }

        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);

        return range;
    }

    #selectSearchMatch(match) {
        if (!match) {
            return;
        }

        match.wrapper.scrollIntoView({
            block: 'center',
            behavior: 'smooth'
        });

        const range = this.#rangeFromTextOffsets(
            match.element,
            match.start,
            match.end
        );

        if (!range) {
            return;
        }

        match.element.focus();

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        this.textToolbar.setActiveEditable(match.element);
    }

    #replaceSearchMatch(match, replacement) {
        if (!match) {
            return false;
        }

        const range = this.#rangeFromTextOffsets(
            match.element,
            match.start,
            match.end
        );

        if (!range) {
            return false;
        }

        range.deleteContents();
        range.insertNode(document.createTextNode(replacement));
        match.element.normalize();

        match.element.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: 'insertReplacementText',
            data: replacement
        }));

        return true;
    }

    #showSearchReplaceDialog() {
        if (!this.searchReplaceDialog) {
            this.searchReplaceDialog = document.createElement('dialog');
            this.searchReplaceDialog.className = 'vhd-search-dialog';

            const header = document.createElement('div');
            header.className = 'vhd-search-dialog-header';

            const title = document.createElement('strong');
            title.textContent = this.t.search.title;

            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'vhd-secondary-button';
            close.textContent = '×';
            close.title = this.t.search.close;
            close.setAttribute('aria-label', this.t.search.close);
            close.addEventListener('click', () => this.searchReplaceDialog.close());

            header.append(title, close);

            const searchField = document.createElement('label');
            searchField.className = 'vhd-search-field';

            const searchLabel = document.createElement('span');
            searchLabel.textContent = this.t.search.find;

            this.searchInput = document.createElement('input');
            this.searchInput.type = 'text';
            this.searchInput.autocomplete = 'off';

            searchField.append(searchLabel, this.searchInput);

            const replaceField = document.createElement('label');
            replaceField.className = 'vhd-search-field';

            const replaceLabel = document.createElement('span');
            replaceLabel.textContent = this.t.search.replaceWith;

            this.replaceInput = document.createElement('input');
            this.replaceInput.type = 'text';
            this.replaceInput.autocomplete = 'off';

            replaceField.append(replaceLabel, this.replaceInput);

            const options = document.createElement('div');
            options.className = 'vhd-search-options';

            const caseLabel = document.createElement('label');
            caseLabel.className = 'vhd-search-checkbox';

            this.searchCaseSensitive = document.createElement('input');
            this.searchCaseSensitive.type = 'checkbox';

            const caseText = document.createElement('span');
            caseText.textContent = this.t.search.caseSensitive;

            caseLabel.append(this.searchCaseSensitive, caseText);
            options.append(caseLabel);

            this.searchStatus = document.createElement('div');
            this.searchStatus.className = 'vhd-search-status';
            this.searchStatus.setAttribute('aria-live', 'polite');

            const actions = document.createElement('div');
            actions.className = 'vhd-search-actions';

            const previous = document.createElement('button');
            previous.type = 'button';
            previous.className = 'vhd-secondary-button';
            previous.textContent = this.t.search.previous;

            const next = document.createElement('button');
            next.type = 'button';
            next.className = 'vhd-secondary-button';
            next.textContent = this.t.search.next;

            const replace = document.createElement('button');
            replace.type = 'button';
            replace.className = 'vhd-secondary-button';
            replace.textContent = this.t.search.replace;

            const replaceAll = document.createElement('button');
            replaceAll.type = 'button';
            replaceAll.className = 'vhd-action-button';
            replaceAll.textContent = this.t.search.replaceAll;

            actions.append(previous, next, replace, replaceAll);

            const refresh = (select = true) => {
                this.searchMatches = this.#findTextMatches(
                    this.searchInput.value,
                    this.searchCaseSensitive.checked
                );

                if (!this.searchMatches.length) {
                    this.searchMatchIndex = -1;
                    this.searchStatus.textContent = this.searchInput.value
                        ? this.t.search.noResults
                        : this.t.search.enterSearch;
                    return;
                }

                if (
                    !Number.isInteger(this.searchMatchIndex)
                    || this.searchMatchIndex < 0
                    || this.searchMatchIndex >= this.searchMatches.length
                ) {
                    this.searchMatchIndex = 0;
                }

                this.searchStatus.textContent = this.t.search.resultCount
                    .replace('%current%', String(this.searchMatchIndex + 1))
                    .replace('%total%', String(this.searchMatches.length));

                if (select) {
                    this.#selectSearchMatch(
                        this.searchMatches[this.searchMatchIndex]
                    );
                }
            };

            const move = direction => {
                refresh(false);

                if (!this.searchMatches.length) {
                    return;
                }

                this.searchMatchIndex =
                    (
                        this.searchMatchIndex
                        + direction
                        + this.searchMatches.length
                    )
                    % this.searchMatches.length;

                this.searchStatus.textContent = this.t.search.resultCount
                    .replace('%current%', String(this.searchMatchIndex + 1))
                    .replace('%total%', String(this.searchMatches.length));

                this.#selectSearchMatch(
                    this.searchMatches[this.searchMatchIndex]
                );
            };

            previous.addEventListener('click', () => move(-1));
            next.addEventListener('click', () => move(1));

            replace.addEventListener('click', () => {
                refresh(false);

                const match = this.searchMatches[this.searchMatchIndex];

                if (!match) {
                    return;
                }

                this.#remember();

                if (this.#replaceSearchMatch(match, this.replaceInput.value)) {
                    refresh(false);

                    if (this.searchMatches.length) {
                        this.searchMatchIndex = Math.min(
                            this.searchMatchIndex,
                            this.searchMatches.length - 1
                        );

                        this.searchStatus.textContent = this.t.search.resultCount
                            .replace('%current%', String(this.searchMatchIndex + 1))
                            .replace('%total%', String(this.searchMatches.length));

                        this.#selectSearchMatch(
                            this.searchMatches[this.searchMatchIndex]
                        );
                    } else {
                        this.searchStatus.textContent = this.t.search.noResults;
                    }
                }
            });

            replaceAll.addEventListener('click', () => {
                refresh(false);

                if (!this.searchMatches.length) {
                    return;
                }

                this.#remember();

                const matches = [...this.searchMatches].reverse();
                let replaced = 0;

                for (const match of matches) {
                    if (this.#replaceSearchMatch(match, this.replaceInput.value)) {
                        replaced += 1;
                    }
                }

                this.searchMatchIndex = -1;
                this.searchMatches = [];

                this.searchStatus.textContent = this.t.search.replacedCount
                    .replace('%count%', String(replaced));

                this.#updateDocumentStatistics();
            });

            this.searchInput.addEventListener('input', () => {
                this.searchMatchIndex = 0;
                refresh();
            });

            this.searchCaseSensitive.addEventListener('change', () => {
                this.searchMatchIndex = 0;
                refresh();
            });

            this.searchInput.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    move(event.shiftKey ? -1 : 1);
                }
            });

            this.searchReplaceDialog.append(
                header,
                searchField,
                replaceField,
                options,
                this.searchStatus,
                actions
            );

            this.searchReplaceDialog.addEventListener('click', event => {
                if (event.target !== this.searchReplaceDialog) {
                    return;
                }

                const rect = this.searchReplaceDialog.getBoundingClientRect();
                const outside =
                    event.clientX < rect.left
                    || event.clientX > rect.right
                    || event.clientY < rect.top
                    || event.clientY > rect.bottom;

                if (outside) {
                    this.searchReplaceDialog.close();
                }
            });

            document.body.append(this.searchReplaceDialog);
        }

        this.searchMatchIndex = 0;
        this.searchMatches = this.#findTextMatches(
            this.searchInput.value,
            this.searchCaseSensitive.checked
        );

        if (this.searchMatches.length) {
            this.searchStatus.textContent = this.t.search.resultCount
                .replace('%current%', '1')
                .replace('%total%', String(this.searchMatches.length));
        } else {
            this.searchStatus.textContent = this.searchInput.value
                ? this.t.search.noResults
                : this.t.search.enterSearch;
        }

        this.searchReplaceDialog.showModal();

        requestAnimationFrame(() => {
            this.searchInput.focus();
            this.searchInput.select();
        });
    }

    #showOutput(content) {
        if (!this.outputDialog) {
            this.outputDialog = document.createElement('dialog');
            this.outputDialog.className = 'vhd-output-dialog';

            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'vhd-secondary-button';
            close.textContent = '×';
            close.title = this.t.editor.remove;
            close.addEventListener('click', () => this.outputDialog.close());

            this.outputPre = document.createElement('pre');
            this.outputPre.className = 'vhd-output-pre';

            this.outputDialog.append(close, this.outputPre);
            document.body.append(this.outputDialog);
        }

        this.outputPre.textContent = content;
        this.outputDialog.showModal();
    }

    #ensureCodePreviewAssets() {
        const contentCssUrl = '/lib/Vanilla-HTML-Designer/src/vhd-content.css';
        const cssUrl = '/lib/Vanilla-HTML-Designer/src/vhd-code.css';
        const jsUrl = '/lib/Vanilla-HTML-Designer/src/vhd-code.js';

        if (!document.querySelector('link[data-vhd-preview-content-css]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = contentCssUrl;
            link.dataset.vhdPreviewContentCss = '';
            document.head.append(link);
        }

        if (!document.querySelector('link[data-vhd-preview-code-css]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssUrl;
            link.dataset.vhdPreviewCodeCss = '';
            document.head.append(link);
        }

        if (!document.querySelector('script[data-vhd-preview-code-js]')) {
            const script = document.createElement('script');
            script.src = jsUrl;
            script.defer = true;
            script.dataset.vhdPreviewCodeJs = '';
            document.head.append(script);
        }
    }

    #showPreview() {
        this.#ensureCodePreviewAssets();

        if (!this.previewDialog) {
            this.previewDialog = document.createElement('dialog');
            this.previewDialog.className = 'vhd-preview-dialog';

            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'vhd-secondary-button';
            close.textContent = '×';
            close.title = this.t.editor.remove;
            close.addEventListener('click', () => this.previewDialog.close());

            this.previewContent = document.createElement('div');
            this.previewContent.className = 'vhd-preview-content';

            this.previewDialog.append(close, this.previewContent);

            this.previewDialog.addEventListener('click', event => {
                if (event.target !== this.previewDialog) {
                    return;
                }

                const rect = this.previewDialog.getBoundingClientRect();
                const clickedOutside =
                    event.clientX < rect.left ||
                    event.clientX > rect.right ||
                    event.clientY < rect.top ||
                    event.clientY > rect.bottom;

                if (clickedOutside) {
                    this.previewDialog.close();
                }
            });

            document.body.append(this.previewDialog);
        }

        this.previewContent.innerHTML = this.getHtml();

        if (window.VanillaHtmlCode?.enhance) {
            window.VanillaHtmlCode.enhance(this.previewContent);
        }

        this.previewDialog.showModal();
    }

    #buildShell() {
        this.root.classList.add('vhd');

        if (this.options.stickyToolbar !== false) {
            this.root.classList.add('vhd-sticky-toolbar');
            this.root.style.setProperty(
                '--vhd-toolbar-sticky-offset',
                `${Math.max(0, Number(this.options.stickyToolbarOffset) || 0)}px`
            );
        } else {
            this.root.classList.remove('vhd-sticky-toolbar');
            this.root.style.removeProperty('--vhd-toolbar-sticky-offset');
        }

        this.topbar = document.createElement('div');
        this.topbar.className = 'vhd-topbar';

        this.canvas = document.createElement('div');
        this.canvas.className = 'vhd-canvas';

        this.propertiesPanel = document.createElement('aside');
        this.propertiesPanel.className = 'vhd-properties';

        this.workspace = document.createElement('div');
        this.workspace.className = 'vhd-workspace';
        this.workspace.append(this.canvas, this.propertiesPanel);

        this.root.replaceChildren(this.textToolbar.element, this.workspace);
        this.#resetPropertiesPanel();
    }

    #textFromHtml(html = '') {
        const template = document.createElement('template');
        template.innerHTML = String(html ?? '');
        return template.content.textContent || '';
    }

    #getDocumentStatistics() {
        let words = 0;
        let characters = 0;

        const countText = value => {
            const text = String(value ?? '');
            characters += text.length;

            const matches = text.match(/[\p{L}\p{N}_]+(?:['’.-][\p{L}\p{N}_]+)*/gu);
            words += matches?.length ?? 0;
        };

        for (const row of this.project?.rows ?? []) {
            for (const column of row.columns ?? []) {
                for (const block of column.blocks ?? []) {
                    if (block.type === 'heading' || block.type === 'text') {
                        countText(this.#textFromHtml(block.content));
                    } else if (block.type === 'table') {
                        for (const tableRow of block.rows ?? []) {
                            for (const cell of tableRow ?? []) {
                                countText(this.#textFromHtml(cell?.content ?? ''));
                            }
                        }
                    }
                }
            }
        }

        return { words, characters };
    }

    #createStatusMessage() {
        const status = document.createElement('div');
        status.className = `vhd-status vhd-status-${this.statusType || 'info'}`;
        status.dataset.vhdStatus = 'true';

        if (!this.statusMessage) {
            status.hidden = true;
            return status;
        }

        status.textContent = this.statusMessage;
        return status;
    }

    #updateStatusMessage() {
        const current = this.propertiesPanel?.querySelector('[data-vhd-status="true"]');

        if (!current) {
            return;
        }

        current.className = `vhd-status vhd-status-${this.statusType || 'info'}`;
        current.textContent = this.statusMessage || '';
        current.hidden = !this.statusMessage;
    }

    #createDocumentStatistics() {
        const stats = document.createElement('section');
        stats.className = 'vhd-document-stats';

        const title = document.createElement('div');
        title.className = 'vhd-document-stats-title';
        title.textContent = this.t.properties.documentStatistics;

        const words = document.createElement('div');
        words.className = 'vhd-document-stat';

        const wordsLabel = document.createElement('span');
        wordsLabel.textContent = this.t.properties.wordCount;

        const wordsValue = document.createElement('strong');
        wordsValue.dataset.vhdStat = 'words';

        words.append(wordsLabel, wordsValue);

        const characters = document.createElement('div');
        characters.className = 'vhd-document-stat';

        const charactersLabel = document.createElement('span');
        charactersLabel.textContent = this.t.properties.characterCount;

        const charactersValue = document.createElement('strong');
        charactersValue.dataset.vhdStat = 'characters';

        characters.append(charactersLabel, charactersValue);
        stats.append(title, words, characters);

        return stats;
    }

    #updateDocumentStatistics() {
        const stats = this.#getDocumentStatistics();

        const words = this.propertiesPanel?.querySelector('[data-vhd-stat="words"]');
        const characters = this.propertiesPanel?.querySelector('[data-vhd-stat="characters"]');

        if (words) {
            words.textContent = stats.words.toLocaleString();
        }

        if (characters) {
            characters.textContent = stats.characters.toLocaleString();
        }
    }

    #resetPropertiesPanel() {
        const title = document.createElement('h3');
        title.textContent = this.t.properties.title;

        const empty = document.createElement('p');
        empty.className = 'vhd-properties-empty';
        empty.textContent = this.t.properties.none;

        this.propertiesPanel.replaceChildren(
            this.#createDocumentStatistics(),
            this.#createStatusMessage(),
            title,
            empty
        );

        this.#updateDocumentStatistics();
        this.#updateStatusMessage();
    }

    #actionButton(label, callback) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'vhd-action-button';
        button.textContent = label;
        button.addEventListener('click', callback);
        return button;
    }

    #propertyField(label, type, value, onInput, options = null) {
        const field = document.createElement('label');
        field.className = 'vhd-property-field';

        const caption = document.createElement('span');
        caption.textContent = label;

        let input;
        if (type === 'select') {
            input = document.createElement('select');
            for (const [optionValue, optionLabel] of options) {
                const option = document.createElement('option');
                option.value = optionValue;
                option.textContent = optionLabel;
                input.append(option);
            }
        } else {
            input = document.createElement('input');
            input.type = type;

            if (type === 'number') {
                input.min = String(options?.min ?? 0);
                input.step = String(options?.step ?? 1);

                if (options?.max !== undefined) {
                    input.max = String(options.max);
                }
            }
        }

        if (type === 'checkbox') {
            field.classList.add('vhd-property-field-checkbox');
            input.checked = Boolean(value);
            input.addEventListener(
                'change',
                () => onInput(input.checked, input)
            );
        } else {
            input.value = value;
            input.addEventListener(
                'input',
                () => onInput(input.value, input)
            );
        }

        field.append(caption, input);
        return field;
    }

    #propertyAction(label, onClick) {
        const field = document.createElement('div');
        field.className = 'vhd-property-action';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'vhd-secondary-button';
        button.textContent = label;
        button.addEventListener('click', onClick);

        field.append(button);
        return field;
    }

    #getPluginPropertyValue(block, key) {
        if (!key) {
            return undefined;
        }

        if (key.startsWith('properties.')) {
            const propertyKey = key.slice('properties.'.length);
            return block.properties?.[propertyKey];
        }

        return block[key];
    }

    #setPluginPropertyValue(block, key, value) {
        if (!key) {
            return;
        }

        if (key.startsWith('properties.')) {
            const propertyKey = key.slice('properties.'.length);
            block.properties ??= {};
            block.properties[propertyKey] = value;
            return;
        }

        block[key] = value;
    }

    #normalizePluginPropertyValue(schema, rawValue) {
        const type = String(schema.type || 'text');

        if (type === 'number') {
            const number = Number(rawValue);

            if (!Number.isFinite(number)) {
                return Number(schema.default ?? 0);
            }

            return number;
        }

        if (type === 'checkbox') {
            return Boolean(rawValue);
        }

        return String(rawValue ?? '');
    }

    #pluginPropertyField(block, schema) {
        const key = String(schema?.key ?? '').trim();
        const label = String(schema?.label ?? key).trim();
        const type = String(schema?.type ?? 'text').trim();

        if (!key || !label) {
            return null;
        }

        const supported = new Set([
            'text',
            'textarea',
            'url',
            'number',
            'color',
            'select',
            'checkbox'
        ]);

        if (!supported.has(type)) {
            console.warn(
                `Vanilla HTML Designer: unsupported plugin property type "${type}" for "${key}".`
            );
            return null;
        }

        const field = document.createElement('label');
        field.className = 'vhd-property-field vhd-plugin-property-field';
        field.dataset.vhdPluginProperty = key;

        const caption = document.createElement('span');
        caption.textContent = label;
        field.append(caption);

        const currentValue = this.#getPluginPropertyValue(
            block,
            key
        );

        const commit = value => {
            const normalized = this.#normalizePluginPropertyValue(
                schema,
                value
            );

            this.#remember();
            this.#setPluginPropertyValue(
                block,
                key,
                normalized
            );

            this.#emit('change', {
                source: 'plugin:property',
                blockId: block.id,
                type: block.type,
                property: key,
                value: structuredClone(normalized)
            });

            if (schema.render !== false) {
                this.render();
            }
        };

        let control = null;

        if (type === 'select') {
            control = document.createElement('select');

            const options = Array.isArray(schema.options)
                ? schema.options
                : [];

            for (const option of options) {
                const item = document.createElement('option');

                if (Array.isArray(option)) {
                    item.value = String(option[0] ?? '');
                    item.textContent = String(option[1] ?? option[0] ?? '');
                } else if (option && typeof option === 'object') {
                    item.value = String(option.value ?? '');
                    item.textContent = String(option.label ?? option.value ?? '');
                } else {
                    item.value = String(option ?? '');
                    item.textContent = String(option ?? '');
                }

                control.append(item);
            }

            control.value = String(
                currentValue
                ?? schema.default
                ?? control.options[0]?.value
                ?? ''
            );

            control.addEventListener('change', () => {
                commit(control.value);
            });
        } else if (type === 'checkbox') {
            const wrapper = document.createElement('span');
            wrapper.className = 'vhd-plugin-property-checkbox';

            control = document.createElement('input');
            control.type = 'checkbox';
            control.checked = Boolean(
                currentValue
                ?? schema.default
                ?? false
            );

            control.addEventListener('change', () => {
                commit(control.checked);
            });

            wrapper.append(control);
            field.append(wrapper);
            return field;
        } else if (type === 'textarea') {
            control = document.createElement('textarea');
            control.rows = Math.max(
                2,
                Number(schema.rows ?? 4)
            );
            control.value = String(
                currentValue
                ?? schema.default
                ?? ''
            );

            const eventName = schema.live === true
                ? 'input'
                : 'change';

            control.addEventListener(eventName, () => {
                commit(control.value);
            });
        } else {
            control = document.createElement('input');
            control.type = type === 'url'
                ? 'url'
                : type;

            if (type === 'url') {
                control.inputMode = 'url';
                control.autocomplete = 'url';
            }

            if (type === 'number') {
                if (schema.min != null) {
                    control.min = String(schema.min);
                }
                if (schema.max != null) {
                    control.max = String(schema.max);
                }
                if (schema.step != null) {
                    control.step = String(schema.step);
                }
            }

            control.value = String(
                currentValue
                ?? schema.default
                ?? ''
            );

            const eventName = (
                type === 'color'
                || schema.live === true
            )
                ? 'input'
                : 'change';

            control.addEventListener(eventName, () => {
                commit(control.value);
            });
        }

        if (schema.placeholder && 'placeholder' in control) {
            control.placeholder = String(schema.placeholder);
        }

        field.append(control);
        return field;
    }

    #appendPluginPropertySchema(panel, block, schemaItems) {
        if (!Array.isArray(schemaItems)) {
            return;
        }

        let currentGroup = null;

        for (const item of schemaItems) {
            if (!item || typeof item !== 'object') {
                continue;
            }

            if (
                item.type === 'group'
                || item.type === 'section'
            ) {
                const title = document.createElement('h4');
                title.className = 'vhd-property-subtitle vhd-plugin-property-group';
                title.textContent = String(
                    item.label
                    ?? item.title
                    ?? ''
                ).trim();

                if (title.textContent) {
                    panel.append(title);
                }

                if (Array.isArray(item.fields)) {
                    this.#appendPluginPropertySchema(
                        panel,
                        block,
                        item.fields
                    );
                }

                currentGroup = item;
                continue;
            }

            const field = this.#pluginPropertyField(
                block,
                item
            );

            if (field) {
                if (
                    currentGroup?.description
                    && !panel.querySelector(
                        `[data-vhd-plugin-group-description="${CSS.escape(String(currentGroup.label ?? currentGroup.title ?? ''))}"]`
                    )
                ) {
                    const description = document.createElement('p');
                    description.className = 'vhd-plugin-property-group-description';
                    description.dataset.vhdPluginGroupDescription =
                        String(
                            currentGroup.label
                            ?? currentGroup.title
                            ?? ''
                        );
                    description.textContent =
                        String(currentGroup.description);

                    panel.append(description);
                }

                panel.append(field);
            }
        }
    }

    #selectProperties(kind, target, element) {
        this.root.querySelectorAll('.vhd-selected').forEach(item => item.classList.remove('vhd-selected'));
        element?.classList.add('vhd-selected');

        if (kind === 'block') {
            this.#emit('block:select', {
                block: structuredClone(target)
            });
        }

        const panel = this.propertiesPanel;
        panel.replaceChildren(
            this.#createDocumentStatistics(),
            this.#createStatusMessage()
        );
        this.#updateDocumentStatistics();
        this.#updateStatusMessage();

        const title = document.createElement('h3');
        if (kind === 'row') {
            const count = target.columns?.length || 1;
            title.textContent = count === 1
                ? this.t.properties.zoneOneColumn
                : this.t.properties.zoneColumns.replace('%s', count);
        } else if (kind === 'column') {
            title.textContent = this.t.properties.column;
        } else {
            title.textContent = BlockFactory.getLabel(
                target.type,
                this.t.blocks
            );
        }
        panel.append(title);

        target.properties ??= {};

        if (kind === 'block') {
            const definition = BlockFactory.get(target.type);

            if (
                definition
                && !definition.native
                && Array.isArray(definition.properties)
                && definition.properties.length
            ) {
                this.#appendPluginPropertySchema(
                    panel,
                    target,
                    definition.properties
                );
            }
        }

        const rerenderStyle = callback => value => {
            callback(value);
            this.#rememberPropertyChange();
        };

        if (kind === 'row') {
            panel.append(
                this.#propertyField(this.t.properties.background, 'color', target.properties.backgroundColor || '#ffffff', value => {
                    target.properties.backgroundColor = value; element.style.backgroundColor = value;
                }),
                this.#propertyField(this.t.properties.paddingTop, 'number', target.properties.paddingTop ?? 0, value => {
                    target.properties.paddingTop = Number(value); element.style.paddingTop = `${value}px`;
                }),
                this.#propertyField(this.t.properties.paddingBottom, 'number', target.properties.paddingBottom ?? 0, value => {
                    target.properties.paddingBottom = Number(value); element.style.paddingBottom = `${value}px`;
                })
            );
            return;
        }

        if (kind === 'column') {
            panel.append(
                this.#propertyField(this.t.properties.background, 'color', target.properties.backgroundColor || '#fafbfc', value => {
                    target.properties.backgroundColor = value; element.style.backgroundColor = value;
                }),
                this.#propertyField(this.t.properties.padding, 'number', target.properties.padding ?? 10, value => {
                    target.properties.padding = Number(value); element.style.padding = `${value}px`;
                })
            );
            return;
        }

        if (target.type === 'image') {
            const updateImagePreview = () => {
                const preview = element.querySelector('.vhd-image-editor');

                if (!preview) {
                    return;
                }

                this.#renderResizableImage(preview, target, element);
            };

            const sourceField = this.#propertyField(
                this.t.editor.imageUrl,
                'text',
                target.src || '',
                value => {
                    target.src = value.trim();
                    updateImagePreview();
                }
            );

            const sourceInput = sourceField.querySelector('input');
            sourceInput.inputMode = 'url';
            sourceInput.autocomplete = 'url';

            const fields = [
                sourceField
            ];

            if (this.options.imageGalleryUrl || typeof this.options.onImageSelect === 'function') {
                fields.push(
                    this.#propertyAction(this.t.editor.chooseImage, async () => {
                        if (this.options.imageGalleryUrl) {
                            await this.#openImageGallery({
                                type: 'block',
                                block: target
                            });
                            return;
                        }

                        const selected = await this.options.onImageSelect();

                        if (!selected?.src) {
                            return;
                        }

                        target.src = String(selected.src);
                        target.alt = String(selected.alt ?? target.alt ?? '');
                        updateImagePreview();

                        sourceInput.value = target.src;

                        const altInput = panel.querySelector('[data-vhd-property="image-alt"]');
                        if (altInput) {
                            altInput.value = target.alt;
                        }
                    })
                );
            }

            const altField = this.#propertyField(
                this.t.editor.imageAlt,
                'text',
                target.alt || '',
                value => {
                    target.alt = value;
                    const img = element.querySelector('.vhd-image-editor img');
                    if (img) img.alt = value;
                }
            );
            altField.querySelector('input').dataset.vhdProperty = 'image-alt';
            fields.push(altField);

            fields.push(
                (() => {
                    const field = this.#propertyField(
                        this.t.properties.width,
                        'number',
                        target.properties.width ?? 100,
                        value => {
                            target.properties.width = Math.min(100, Math.max(5, Number(value)));
                            const frame = element.querySelector('.vhd-image-resize-frame');

                            if (frame) {
                                frame.style.width = `${target.properties.width}%`;
                            }
                        },
                        { min: 5, max: 100, step: 1 }
                    );

                    field.querySelector('input').dataset.vhdProperty = 'image-width';
                    return field;
                })(),
                this.#propertyField(this.t.properties.align, 'select', target.properties.align || 'center', value => {
                    target.properties.align = value;
                    updateImagePreview();
                }, [['left',this.t.properties.left],['center',this.t.properties.center],['right',this.t.properties.right]]),
                this.#propertyField(this.t.properties.borderRadius, 'number', target.properties.borderRadius ?? 4, value => {
                    target.properties.borderRadius = Number(value);
                    const img = element.querySelector('img');
                    if (img) img.style.borderRadius = `${value}px`;
                })
            );

            panel.append(...fields);
        } else if (target.type === 'button') {
            const link = element.querySelector('a');

            panel.append(
                this.#propertyField(
                    this.t.editor.buttonText,
                    'text',
                    target.text || '',
                    value => {
                        target.text = value;
                        if (link) link.textContent = value || 'Button';
                    }
                ),
                this.#propertyField(
                    this.t.editor.buttonUrl,
                    'text',
                    target.url || '',
                    value => {
                        target.url = value.trim();
                        if (link) link.href = target.url || '#';
                    }
                ),
                this.#propertyField(
                    this.t.properties.linkTarget,
                    'select',
                    target.properties.target === '_blank' ? '_blank' : '_self',
                    value => {
                        target.properties.target = value === '_blank' ? '_blank' : '_self';

                        if (link) {
                            link.target = target.properties.target;

                            if (target.properties.target === '_blank') {
                                link.rel = 'noopener noreferrer';
                            } else {
                                link.removeAttribute('rel');
                            }
                        }
                    },
                    [
                        ['_self', this.t.properties.linkSameWindow],
                        ['_blank', this.t.properties.linkNewWindow]
                    ]
                ),
                this.#propertyField(this.t.properties.buttonBackground,'color',target.properties.backgroundColor||'#2563eb',value=>{
                    target.properties.backgroundColor=value;
                    if (link) link.style.backgroundColor=value;
                }),
                this.#propertyField(this.t.properties.buttonColor,'color',target.properties.color||'#ffffff',value=>{
                    target.properties.color=value;
                    if (link) link.style.color=value;
                }),
                this.#propertyField(this.t.properties.borderRadius,'number',target.properties.borderRadius??5,value=>{
                    target.properties.borderRadius=Number(value);
                    if (link) link.style.borderRadius=`${value}px`;
                }),
                this.#propertyField(this.t.properties.paddingHorizontal,'number',target.properties.paddingHorizontal??16,value=>{
                    target.properties.paddingHorizontal=Number(value);
                    if (link) {
                        link.style.paddingLeft=`${value}px`;
                        link.style.paddingRight=`${value}px`;
                    }
                }),
                this.#propertyField(this.t.properties.paddingVertical,'number',target.properties.paddingVertical??10,value=>{
                    target.properties.paddingVertical=Number(value);
                    if (link) {
                        link.style.paddingTop=`${value}px`;
                        link.style.paddingBottom=`${value}px`;
                    }
                }),
                this.#propertyField(
                    this.t.properties.align,
                    'select',
                    target.properties.align || 'left',
                    value => {
                        target.properties.align = value;
                        const editorPreview = element.querySelector('.vhd-button-editor');
                        if (editorPreview) editorPreview.style.textAlign = value;
                    },
                    [
                        ['left', this.t.properties.left],
                        ['center', this.t.properties.center],
                        ['right', this.t.properties.right]
                    ]
                )
            );
        } else if (target.type === 'table') {
            target.rows ??= [];
            target.properties ??= {};
            target.properties.header ??= true;
            target.properties.borderColor ??= '#d8dde5';
            target.properties.borderWidth ??= 1;
            target.properties.cellPadding ??= 8;
            target.properties.headerBackground ??= '#f3f4f6';

            const rerenderTable = () => {
                const preview = element.querySelector('.vhd-table-editor');

                if (preview) {
                    this.#renderTable(preview, target);
                }
            };

            panel.append(
                this.#propertyField(
                    this.t.properties.tableHeader,
                    'select',
                    target.properties.header ? 'yes' : 'no',
                    value => {
                        target.properties.header = value === 'yes';
                        rerenderTable();
                    },
                    [
                        ['yes', this.t.properties.yes],
                        ['no', this.t.properties.no]
                    ]
                ),
                this.#propertyField(
                    this.t.properties.tableBorderColor,
                    'color',
                    target.properties.borderColor,
                    value => {
                        target.properties.borderColor = value;
                        rerenderTable();
                    }
                ),
                this.#propertyField(
                    this.t.properties.tableBorderWidth,
                    'number',
                    target.properties.borderWidth,
                    value => {
                        target.properties.borderWidth = Math.max(0, Number(value));
                        rerenderTable();
                    },
                    { min: 0, max: 10, step: 1 }
                ),
                this.#propertyField(
                    this.t.properties.tableCellPadding,
                    'number',
                    target.properties.cellPadding,
                    value => {
                        target.properties.cellPadding = Math.max(0, Number(value));
                        rerenderTable();
                    },
                    { min: 0, max: 50, step: 1 }
                ),
                this.#propertyField(
                    this.t.properties.tableHeaderBackground,
                    'color',
                    target.properties.headerBackground,
                    value => {
                        target.properties.headerBackground = value;
                        rerenderTable();
                    }
                )
            );

            /*
             * Cell borders are contextual: the current table selection is only
             * an editor interaction. Each selected cell receives its own
             * independent properties.
             */
            const selectedCells = this.#getSelectedTableCells(target);

            if (selectedCells.length) {
                const activeCell =
                    target.rows?.[this.selectedTableCell?.rowIndex]
                        ?.[this.selectedTableCell?.columnIndex]
                    || selectedCells[0].cell;

                activeCell.properties ??= {};

                const preview = element.querySelector('.vhd-table-editor');

                const cellLayoutTitle = document.createElement('div');
                cellLayoutTitle.className = 'vhd-property-subtitle';
                cellLayoutTitle.textContent =
                    this.t.properties.tableCellLayout;

                panel.append(
                    cellLayoutTitle,
                    this.#propertyField(
                        this.t.properties.tableCellPaddingOverride,
                        'number',
                        activeCell.properties.padding
                            ?? target.properties.cellPadding
                            ?? 8,
                        value => {
                            if (preview) {
                                this.#applyTableCellStyle(
                                    preview,
                                    target,
                                    'padding',
                                    Math.max(0, Number(value))
                                );
                            }
                        },
                        { min: 0, max: 50, step: 1 }
                    ),
                    this.#propertyField(
                        this.t.properties.tableCellVerticalAlign,
                        'select',
                        activeCell.properties.verticalAlign || 'top',
                        value => {
                            if (preview) {
                                this.#applyTableCellStyle(
                                    preview,
                                    target,
                                    'verticalAlign',
                                    value
                                );
                            }
                        },
                        [
                            ['top', this.t.properties.tableVerticalTop],
                            ['middle', this.t.properties.tableVerticalMiddle],
                            ['bottom', this.t.properties.tableVerticalBottom]
                        ]
                    )
                );

                const cellBorderTitle = document.createElement('div');
                cellBorderTitle.className = 'vhd-property-subtitle';
                cellBorderTitle.textContent =
                    this.t.properties.tableCellBorders;

                panel.append(
                    cellBorderTitle,
                    this.#propertyField(
                        this.t.properties.tableCellBorderWidth,
                        'number',
                        activeCell.properties.borderWidth
                            ?? target.properties.borderWidth
                            ?? 1,
                        value => {
                            if (preview) {
                                this.#applyTableCellStyle(
                                    preview,
                                    target,
                                    'borderWidth',
                                    Math.max(0, Number(value))
                                );
                            }
                        },
                        { min: 0, max: 10, step: 1 }
                    ),
                    this.#propertyField(
                        this.t.properties.tableCellBorderStyle,
                        'select',
                        activeCell.properties.borderStyle || 'solid',
                        value => {
                            if (preview) {
                                this.#applyTableCellStyle(
                                    preview,
                                    target,
                                    'borderStyle',
                                    value
                                );
                            }
                        },
                        [
                            ['solid', this.t.properties.borderSolid],
                            ['dashed', this.t.properties.borderDashed],
                            ['dotted', this.t.properties.borderDotted],
                            ['none', this.t.properties.borderNone]
                        ]
                    ),
                    this.#propertyField(
                        this.t.properties.tableCellBorderColor,
                        'color',
                        activeCell.properties.borderColor
                            || target.properties.borderColor
                            || '#d8dde5',
                        value => {
                            if (preview) {
                                this.#applyTableCellStyle(
                                    preview,
                                    target,
                                    'borderColor',
                                    value
                                );
                            }
                        }
                    )
                );

                const borderSidesTitle =
                    document.createElement('div');
                borderSidesTitle.className =
                    'vhd-property-caption';
                borderSidesTitle.textContent =
                    this.t.properties.tableCellBorderSides;

                const borderSides = document.createElement('div');
                borderSides.className = 'vhd-table-border-sides';

                const borderSideFields = [
                    [
                        this.t.properties.paddingTop,
                        'borderTopEnabled'
                    ],
                    [
                        this.t.properties.paddingRight,
                        'borderRightEnabled'
                    ],
                    [
                        this.t.properties.paddingBottom,
                        'borderBottomEnabled'
                    ],
                    [
                        this.t.properties.paddingLeft,
                        'borderLeftEnabled'
                    ]
                ];

                borderSideFields.forEach(([label, property]) => {
                    borderSides.append(
                        this.#propertyField(
                            label,
                            'checkbox',
                            activeCell.properties[property] !== false,
                            value => {
                                if (preview) {
                                    this.#applyTableCellStyle(
                                        preview,
                                        target,
                                        property,
                                        Boolean(value)
                                    );
                                }
                            }
                        )
                    );
                });

                panel.append(borderSidesTitle, borderSides);
            }
        } else if (target.type === 'divider') {
            target.properties ??= {
                color: '#9ca3af',
                width: 1,
                style: 'solid'
            };

            panel.append(
                this.#propertyField(this.t.properties.dividerColor,'color',target.properties.color||'#9ca3af',value=>{target.properties.color=value;element.querySelector('hr').style.borderTopColor=value;}),
                this.#propertyField(this.t.properties.dividerWidth,'number',target.properties.width??1,value=>{target.properties.width=Number(value);element.querySelector('hr').style.borderTopWidth=`${value}px`;}),
                this.#propertyField(this.t.properties.dividerStyle,'select',target.properties.style||'solid',value=>{target.properties.style=value;element.querySelector('hr').style.borderTopStyle=value;},[['solid','Solid'],['dashed','Dashed'],['dotted','Dotted']])
            );
        } else if (target.type === 'spacer') {
            panel.append(
                this.#propertyField(
                    this.t.properties.height,
                    'number',
                    target.height ?? 32,
                    value => {
                        target.height = Math.max(0, Number(value));
                        const preview = element.querySelector('.vhd-spacer-preview');
                        if (preview) {
                            preview.style.height = `${target.height}px`;
                            preview.title = `${target.height}px`;
                        }
                    },
                    { min: 0, max: 500, step: 1 }
                )
            );
        }
    }

    #rememberPropertyChange() {
        // Property changes are immediately reflected in the project model.
    }

    #remember() {
        this.history.push(this.project);
    }

    #syncHistoryButtons() {
        // Toolbar action buttons remain available; History methods are no-ops
        // when there is nothing to undo or redo.
    }

    addRow(preset) {
        if (this.disabledSections.has(preset)) {
            return false;
        }

        this.#remember();
        this.project.rows.push(
            this.#populateRowWithDefaultText(Grid.createPreset(preset))
        );
        this.render();
        return true;
    }

    addBlock(rowIndex, columnIndex, type, insertIndex = null) {
        if (
            this.disabledContentBlocks.has(type)
            || !BlockFactory.types.includes(type)
        ) {
            return false;
        }

        const blocks = this.project
            .rows[rowIndex]
            .columns[columnIndex]
            .blocks;

        const index = Number.isInteger(insertIndex)
            ? Math.max(0, Math.min(insertIndex, blocks.length))
            : blocks.length;

        this.#remember();
        const block = BlockFactory.create(type);
        blocks.splice(index, 0, block);

        this.#emit('block:add', {
            block: structuredClone(block),
            rowIndex,
            columnIndex,
            blockIndex: index
        });
        this.#emit('change', { source: 'block:add' });
        this.render();
        return true;
    }

    removeRow(rowIndex) {
        this.#remember();
        this.project.rows.splice(rowIndex, 1);
        this.render();
    }

    moveRow(rowIndex, direction) {
        const target = rowIndex + direction;

        if (target < 0 || target >= this.project.rows.length) {
            return;
        }

        this.#remember();
        [this.project.rows[rowIndex], this.project.rows[target]] = [
            this.project.rows[target],
            this.project.rows[rowIndex]
        ];
        this.render();
    }

    #startRowDrag(event, rowIndex) {
        if (event.button !== 0 || this.rowDrag || this.blockDrag) {
            return;
        }

        const sourceElement = event.currentTarget.closest('.vhd-row-editor');

        if (!sourceElement) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const indicator = document.createElement('div');
        indicator.className = 'vhd-row-drop-indicator';

        const ghost = document.createElement('div');
        ghost.className = 'vhd-row-drag-ghost';
        ghost.textContent = this.t.editor.draggingRow;
        ghost.style.left = `${event.clientX + 12}px`;
        ghost.style.top = `${event.clientY + 12}px`;
        document.body.append(ghost);

        sourceElement.classList.add('vhd-row-drag-source');
        document.body.classList.add('vhd-row-dragging');

        const drag = {
            rowIndex,
            sourceElement,
            indicator,
            ghost,
            targetIndex: null,
            pointerId: event.pointerId,
            moved: false,
            startX: event.clientX,
            startY: event.clientY,
            clientX: event.clientX,
            clientY: event.clientY
        };

        this.rowDrag = drag;

        const onMove = moveEvent => {
            if (!this.rowDrag || moveEvent.pointerId !== drag.pointerId) {
                return;
            }

            const distance = Math.hypot(
                moveEvent.clientX - drag.startX,
                moveEvent.clientY - drag.startY
            );

            if (!drag.moved && distance < 4) {
                return;
            }

            drag.moved = true;
            this.#moveRowDrag(moveEvent);
        };

        const onEnd = endEvent => {
            if (endEvent.pointerId !== drag.pointerId) {
                return;
            }

            document.removeEventListener('pointermove', onMove, true);
            document.removeEventListener('pointerup', onEnd, true);
            document.removeEventListener('pointercancel', onEnd, true);

            this.#finishRowDrag(endEvent);
        };

        document.addEventListener('pointermove', onMove, true);
        document.addEventListener('pointerup', onEnd, true);
        document.addEventListener('pointercancel', onEnd, true);
    }

    #moveRowDrag(event) {
        const drag = this.rowDrag;

        if (!drag) {
            return;
        }

        event.preventDefault();

        drag.clientX = event.clientX;
        drag.clientY = event.clientY;

        this.#updateRowDragAutoScroll(event.clientY);

        drag.ghost.style.left = `${event.clientX + 12}px`;
        drag.ghost.style.top = `${event.clientY + 12}px`;

        this.#updateRowDragTarget(event.clientX, event.clientY);
    }

    #updateRowDragTarget(clientX, clientY) {
        const drag = this.rowDrag;

        if (!drag) {
            return;
        }

        const content = this.canvas.querySelector(':scope > .vhd-content');

        if (!content) {
            return;
        }

        const rows = Array.from(
            content.querySelectorAll(':scope > .vhd-row-editor')
        ).filter(element => element !== drag.sourceElement);

        let targetIndex = rows.length;
        let beforeElement = null;

        for (let index = 0; index < rows.length; index += 1) {
            const rect = rows[index].getBoundingClientRect();

            if (clientY < rect.top + rect.height / 2) {
                targetIndex = index;
                beforeElement = rows[index];
                break;
            }
        }

        /*
         * Keep the marker inside the content area even when the pointer is over
         * a row chooser or the whitespace between two zones.
         */
        if (beforeElement) {
            content.insertBefore(drag.indicator, beforeElement);
        } else {
            content.append(drag.indicator);
        }

        drag.targetIndex = targetIndex;
    }

    #updateRowDragAutoScroll(clientY) {
        const edge = 90;
        const viewportHeight = window.innerHeight;

        let direction = 0;
        let speed = 0;

        if (clientY < edge) {
            direction = -1;
            speed = Math.max(
                8,
                Math.round(((edge - clientY) / edge) * 44)
            );
        } else if (clientY > viewportHeight - edge) {
            direction = 1;
            speed = Math.max(
                8,
                Math.round(
                    ((clientY - (viewportHeight - edge)) / edge) * 44
                )
            );
        }

        if (!direction) {
            this.#stopRowDragAutoScroll();
            return;
        }

        this.rowDragScrollDirection = direction;
        this.rowDragScrollSpeed = Math.min(44, speed);

        if (this.rowDragScrollFrame) {
            return;
        }

        const tick = () => {
            if (
                !this.rowDrag
                || !this.rowDragScrollDirection
                || !this.rowDragScrollSpeed
            ) {
                this.rowDragScrollFrame = null;
                return;
            }

            const scrollContainer = this.root.classList.contains('vhd-fullscreen')
                ? this.canvas
                : document.scrollingElement;

            if (scrollContainer) {
                scrollContainer.scrollTop +=
                    this.rowDragScrollDirection * this.rowDragScrollSpeed;
            }

            if (
                this.rowDrag
                && Number.isFinite(this.rowDrag.clientX)
                && Number.isFinite(this.rowDrag.clientY)
            ) {
                this.#updateRowDragTarget(
                    this.rowDrag.clientX,
                    this.rowDrag.clientY
                );
            }

            this.rowDragScrollFrame = requestAnimationFrame(tick);
        };

        this.rowDragScrollFrame = requestAnimationFrame(tick);
    }

    #stopRowDragAutoScroll() {
        this.rowDragScrollDirection = 0;
        this.rowDragScrollSpeed = 0;

        if (this.rowDragScrollFrame) {
            cancelAnimationFrame(this.rowDragScrollFrame);
            this.rowDragScrollFrame = null;
        }
    }

    #finishRowDrag(event) {
        const drag = this.rowDrag;

        if (!drag) {
            return;
        }

        this.#stopRowDragAutoScroll();

        drag.ghost.remove();
        drag.indicator.remove();
        drag.sourceElement.classList.remove('vhd-row-drag-source');
        document.body.classList.remove('vhd-row-dragging');

        const targetIndex = drag.targetIndex;
        const moved = drag.moved;
        this.rowDrag = null;

        if (
            !moved
            || event.type === 'pointercancel'
            || !Number.isInteger(targetIndex)
        ) {
            return;
        }

        /*
         * targetIndex is calculated from the visible row list with the source
         * row already excluded, so it directly matches the array after splice.
         */
        if (targetIndex === drag.rowIndex) {
            return;
        }

        this.#remember();

        const [row] = this.project.rows.splice(drag.rowIndex, 1);

        if (!row) {
            return;
        }

        const insertionIndex = Math.max(
            0,
            Math.min(this.project.rows.length, targetIndex)
        );

        this.project.rows.splice(insertionIndex, 0, row);
        this.render();
    }

    removeBlock(rowIndex, columnIndex, blockIndex) {
        this.#remember();
        const [block] = this.project.rows[rowIndex]
            .columns[columnIndex]
            .blocks.splice(blockIndex, 1);

        this.#emit('block:remove', {
            block: block ? structuredClone(block) : null,
            rowIndex,
            columnIndex,
            blockIndex
        });
        this.#emit('change', { source: 'block:remove' });
        this.render();
    }

    moveBlock(rowIndex, columnIndex, blockIndex, direction) {
        const blocks = this.project.rows[rowIndex].columns[columnIndex].blocks;
        const target = blockIndex + direction;

        if (target < 0 || target >= blocks.length) {
            return;
        }

        this.#remember();
        [blocks[blockIndex], blocks[target]] = [blocks[target], blocks[blockIndex]];
        this.render();
    }

    #startBlockDrag(event, rowIndex, columnIndex, blockIndex) {
        if (event.button !== 0 || this.blockDrag) {
            return;
        }

        const sourceElement = event.currentTarget.closest('.vhd-block');

        if (!sourceElement) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const indicator = document.createElement('div');
        indicator.className = 'vhd-block-drop-indicator';

        const ghost = document.createElement('div');
        ghost.className = 'vhd-block-drag-ghost';
        ghost.textContent = this.t.editor.draggingBlock;
        ghost.style.left = `${event.clientX + 12}px`;
        ghost.style.top = `${event.clientY + 12}px`;
        document.body.append(ghost);

        sourceElement.classList.add('vhd-block-drag-source');
        document.body.classList.add('vhd-block-dragging');

        const drag = {
            rowIndex,
            columnIndex,
            blockIndex,
            sourceElement,
            indicator,
            ghost,
            target: null,
            pointerId: event.pointerId,
            moved: false,
            startX: event.clientX,
            startY: event.clientY,
            clientX: event.clientX,
            clientY: event.clientY
        };

        this.blockDrag = drag;

        const onMove = moveEvent => {
            if (!this.blockDrag || moveEvent.pointerId !== drag.pointerId) {
                return;
            }

            const distance = Math.hypot(
                moveEvent.clientX - drag.startX,
                moveEvent.clientY - drag.startY
            );

            if (!drag.moved && distance < 4) {
                return;
            }

            drag.moved = true;
            this.#moveBlockDrag(moveEvent);
        };

        const onEnd = endEvent => {
            if (endEvent.pointerId !== drag.pointerId) {
                return;
            }

            document.removeEventListener('pointermove', onMove, true);
            document.removeEventListener('pointerup', onEnd, true);
            document.removeEventListener('pointercancel', onEnd, true);

            this.#finishBlockDrag(endEvent);
        };

        document.addEventListener('pointermove', onMove, true);
        document.addEventListener('pointerup', onEnd, true);
        document.addEventListener('pointercancel', onEnd, true);
    }

    #moveBlockDrag(event) {
        const drag = this.blockDrag;

        if (!drag) {
            return;
        }

        event.preventDefault();

        drag.clientX = event.clientX;
        drag.clientY = event.clientY;

        this.#updateBlockDragAutoScroll(event.clientY);

        drag.ghost.style.left = `${event.clientX + 12}px`;
        drag.ghost.style.top = `${event.clientY + 12}px`;

        this.#updateBlockDragTarget(event.clientX, event.clientY);
    }

    #updateBlockDragTarget(clientX, clientY) {
        const drag = this.blockDrag;

        if (!drag) {
            return;
        }

        const hit = document.elementFromPoint(clientX, clientY);
        const columnElement = hit?.closest?.('.vhd-column');

        if (!columnElement || !this.canvas.contains(columnElement)) {
            drag.indicator.remove();
            drag.target = null;
            return;
        }

        const targetRowIndex = Number(columnElement.dataset.rowIndex);
        const targetColumnIndex = Number(columnElement.dataset.columnIndex);

        if (
            !Number.isInteger(targetRowIndex)
            || !Number.isInteger(targetColumnIndex)
        ) {
            drag.indicator.remove();
            drag.target = null;
            return;
        }

        const blocks = Array.from(
            columnElement.children
        ).filter(element =>
            element.classList?.contains('vhd-block')
            && element !== drag.sourceElement
        );

        let targetIndex = blocks.length;
        let beforeElement = columnElement.querySelector('.vhd-block-add');

        for (let index = 0; index < blocks.length; index += 1) {
            const rect = blocks[index].getBoundingClientRect();

            if (clientY < rect.top + rect.height / 2) {
                targetIndex = index;
                beforeElement = blocks[index];
                break;
            }
        }

        if (beforeElement) {
            columnElement.insertBefore(drag.indicator, beforeElement);
        } else {
            columnElement.append(drag.indicator);
        }

        drag.target = {
            rowIndex: targetRowIndex,
            columnIndex: targetColumnIndex,
            blockIndex: targetIndex
        };
    }

    #updateBlockDragAutoScroll(clientY) {
        const edge = 90;
        const viewportHeight = window.innerHeight;

        let direction = 0;
        let speed = 0;

        if (clientY < edge) {
            direction = -1;
            speed = Math.max(
                8,
                Math.round(((edge - clientY) / edge) * 44)
            );
        } else if (clientY > viewportHeight - edge) {
            direction = 1;
            speed = Math.max(
                8,
                Math.round(
                    ((clientY - (viewportHeight - edge)) / edge) * 44
                )
            );
        }

        if (!direction) {
            this.#stopBlockDragAutoScroll();
            return;
        }

        this.blockDragScrollDirection = direction;
        this.blockDragScrollSpeed = Math.min(44, speed);

        if (this.blockDragScrollFrame) {
            return;
        }

        const tick = () => {
            if (
                !this.blockDrag
                || !this.blockDragScrollDirection
                || !this.blockDragScrollSpeed
            ) {
                this.blockDragScrollFrame = null;
                return;
            }

            const scrollContainer = this.root.classList.contains('vhd-fullscreen')
                ? this.canvas
                : document.scrollingElement;

            if (scrollContainer) {
                scrollContainer.scrollTop +=
                    this.blockDragScrollDirection * this.blockDragScrollSpeed;
            }

            if (
                this.blockDrag
                && Number.isFinite(this.blockDrag.clientX)
                && Number.isFinite(this.blockDrag.clientY)
            ) {
                this.#updateBlockDragTarget(
                    this.blockDrag.clientX,
                    this.blockDrag.clientY
                );
            }

            this.blockDragScrollFrame = requestAnimationFrame(tick);
        };

        this.blockDragScrollFrame = requestAnimationFrame(tick);
    }

    #stopBlockDragAutoScroll() {
        this.blockDragScrollDirection = 0;
        this.blockDragScrollSpeed = 0;

        if (this.blockDragScrollFrame) {
            cancelAnimationFrame(this.blockDragScrollFrame);
            this.blockDragScrollFrame = null;
        }
    }

    #finishBlockDrag(event) {
        const drag = this.blockDrag;

        if (!drag) {
            return;
        }

        this.#stopBlockDragAutoScroll();

        drag.ghost.remove();
        drag.indicator.remove();
        drag.sourceElement.classList.remove('vhd-block-drag-source');
        document.body.classList.remove('vhd-block-dragging');

        const target = drag.target;
        const moved = drag.moved;
        this.blockDrag = null;

        if (
            !moved
            || event.type === 'pointercancel'
            || !target
        ) {
            return;
        }

        const sourceColumn =
            this.project.rows?.[drag.rowIndex]?.columns?.[drag.columnIndex];

        const targetColumn =
            this.project.rows?.[target.rowIndex]?.columns?.[target.columnIndex];

        if (!sourceColumn || !targetColumn) {
            return;
        }

        let targetIndex = target.blockIndex;

        /*
         * target.blockIndex is calculated from a DOM block list that already
         * excludes the dragged source element. It therefore already matches
         * the array index after sourceColumn.blocks.splice(..., 1).
         *
         * Do not decrement it again when moving downward in the same column.
         */
        if (
            drag.rowIndex === target.rowIndex
            && drag.columnIndex === target.columnIndex
            && targetIndex === drag.blockIndex
        ) {
            return;
        }

        this.#remember();

        const [block] = sourceColumn.blocks.splice(drag.blockIndex, 1);

        if (!block) {
            return;
        }

        targetIndex = Math.max(
            0,
            Math.min(targetColumn.blocks.length, targetIndex)
        );

        targetColumn.blocks.splice(targetIndex, 0, block);
        this.render();
    }

    #blockControlInsertMenu(rowIndex, columnIndex, insertIndex) {
        const wrapper = document.createElement('div');
        wrapper.className = 'vhd-block-control-insert';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'vhd-mini-button vhd-block-control-insert-trigger';
        trigger.textContent = '+';
        trigger.title = this.t.editor.addBlock;
        trigger.setAttribute('aria-label', this.t.editor.addBlock);
        trigger.setAttribute('aria-haspopup', 'true');
        trigger.setAttribute('aria-expanded', 'false');

        const menu = document.createElement('div');
        menu.className = 'vhd-block-add-menu vhd-block-control-insert-menu';
        menu.hidden = true;
        menu.setAttribute('role', 'menu');

        const availableTypes = BlockFactory.types.filter(
            type => !this.disabledContentBlocks.has(type)
        );

        for (const type of availableTypes) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'vhd-block-add-item';
            button.setAttribute('role', 'menuitem');
            button.dataset.vhdContentBlock = type;

            const definition = BlockFactory.get(type);
            const label = BlockFactory.getLabel(
                type,
                this.t.blocks
            );

            if (definition?.icon) {
                const icon = document.createElement('span');
                icon.className = 'vhd-block-add-item-icon';
                icon.innerHTML = definition.icon;

                const text = document.createElement('span');
                text.textContent = label;

                button.append(icon, text);
            } else {
                button.textContent = label;
            }

            button.addEventListener('click', event => {
                event.stopPropagation();
                menu.hidden = true;
                trigger.setAttribute('aria-expanded', 'false');

                this.addBlock(
                    rowIndex,
                    columnIndex,
                    type,
                    insertIndex
                );
            });

            menu.append(button);
        }

        if (!availableTypes.length) {
            wrapper.hidden = true;
            return wrapper;
        }

        trigger.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();

            const willOpen = menu.hidden;

            this.root.querySelectorAll('.vhd-block-add-menu').forEach(other => {
                if (other !== menu) {
                    other.hidden = true;
                }
            });

            this.root.querySelectorAll('.vhd-add-trigger, .vhd-block-control-insert-trigger')
                .forEach(other => {
                    if (other !== trigger) {
                        other.setAttribute('aria-expanded', 'false');
                    }
                });

            menu.hidden = !willOpen;
            trigger.setAttribute(
                'aria-expanded',
                willOpen ? 'true' : 'false'
            );
        });

        wrapper.addEventListener('click', event => {
            event.stopPropagation();
        });

        wrapper.append(trigger, menu);
        return wrapper;
    }

    #blockControls(rowIndex, columnIndex, blockIndex) {
        const controls = document.createElement('div');
        controls.className = 'vhd-block-controls';

        const insertAbove = this.#blockControlInsertMenu(
            rowIndex,
            columnIndex,
            blockIndex
        );

        const drag = this.#miniButton('⋮⋮', this.t.editor.dragBlock, () => {});
        drag.classList.add('vhd-block-drag-handle');
        drag.setAttribute('aria-label', this.t.editor.dragBlock);

        drag.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
        });

        drag.addEventListener('pointerdown', event => {
            this.#startBlockDrag(
                event,
                rowIndex,
                columnIndex,
                blockIndex
            );
        });

        const remove = this.#miniButton('×', this.t.editor.remove, () => {
            this.removeBlock(rowIndex, columnIndex, blockIndex);
        });

        controls.append(insertAbove, drag, remove);
        return controls;
    }

    #miniButton(text, title, callback) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'vhd-mini-button';
        button.textContent = text;
        button.title = title;
        button.addEventListener('click', callback);
        return button;
    }

    async #resolveImageGalleryUrl() {
        const source = this.options.imageGalleryUrl;

        if (typeof source === 'function') {
            return await source({
                editor: this.options.publicApi ?? null
            });
        }

        return source;
    }

    async #openImageGallery(context = {}) {
        const url = await this.#resolveImageGalleryUrl();

        if (!url) {
            return false;
        }

        this.pendingImageTarget = context;

        if (!this.imageGalleryDialog) {
            this.imageGalleryDialog = document.createElement('dialog');
            this.imageGalleryDialog.className = 'vhd-image-gallery-dialog';

            const header = document.createElement('div');
            header.className = 'vhd-image-gallery-header';

            const title = document.createElement('strong');
            title.textContent = this.t.editor.imageGalleryTitle;

            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'vhd-image-gallery-close';
            close.textContent = '×';
            close.title = this.t.editor.closeImageGallery;
            close.setAttribute('aria-label', this.t.editor.closeImageGallery);
            close.addEventListener('click', () => this.closeImageGallery());

            this.imageGalleryFrame = document.createElement('iframe');
            this.imageGalleryFrame.className = 'vhd-image-gallery-frame';
            this.imageGalleryFrame.title = this.t.editor.imageGalleryTitle;

            header.append(title, close);
            this.imageGalleryDialog.append(header, this.imageGalleryFrame);
            document.body.append(this.imageGalleryDialog);

            this.imageGalleryDialog.addEventListener('cancel', event => {
                event.preventDefault();
                this.closeImageGallery();
            });
        }

        this.imageGalleryFrame.src = String(url);

        if (!this.imageGalleryDialog.open) {
            this.imageGalleryDialog.showModal();
        }

        return true;
    }

    #closeImageGallery() {
        if (!this.imageGalleryDialog) {
            return;
        }

        if (this.imageGalleryDialog.open) {
            this.imageGalleryDialog.close();
        }

        if (this.imageGalleryFrame) {
            this.imageGalleryFrame.src = 'about:blank';
        }
    }

    #normalizeVideoUrl(value) {
        let url;

        try {
            url = new URL(value.trim());
        } catch {
            return { type: 'video', url: value.trim() };
        }

        const host = url.hostname.toLowerCase().replace(/^www\./, '');

        if (host === 'youtu.be') {
            const id = url.pathname.split('/').filter(Boolean)[0];

            if (id) {
                return {
                    type: 'embed',
                    url: `https://www.youtube.com/embed/${encodeURIComponent(id)}`
                };
            }
        }

        if (
            host === 'youtube.com'
            || host === 'm.youtube.com'
            || host === 'music.youtube.com'
            || host === 'youtube-nocookie.com'
        ) {
            const parts = url.pathname.split('/').filter(Boolean);
            let id = null;

            if (url.pathname === '/watch') {
                id = url.searchParams.get('v');
            } else if (['shorts', 'embed', 'live'].includes(parts[0])) {
                id = parts[1] || null;
            }

            if (id) {
                return {
                    type: 'embed',
                    url: `https://www.youtube.com/embed/${encodeURIComponent(id)}`
                };
            }
        }

        if (host === 'vimeo.com' || host === 'player.vimeo.com') {
            const parts = url.pathname.split('/').filter(Boolean);
            const id = host === 'player.vimeo.com' && parts[0] === 'video'
                ? parts[1]
                : parts.find(part => /^\d+$/.test(part));

            if (id) {
                return {
                    type: 'embed',
                    url: `https://player.vimeo.com/video/${encodeURIComponent(id)}`
                };
            }
        }

        if (host === 'dailymotion.com' || host === 'dai.ly') {
            const parts = url.pathname.split('/').filter(Boolean);
            let id = null;

            if (host === 'dai.ly') {
                id = parts[0] || null;
            } else if (parts[0] === 'video') {
                id = parts[1]?.split('_')[0] || null;
            } else if (parts[0] === 'embed' && parts[1] === 'video') {
                id = parts[2] || null;
            }

            if (id) {
                return {
                    type: 'embed',
                    url: `https://www.dailymotion.com/embed/video/${encodeURIComponent(id)}`
                };
            }
        }

        return { type: 'video', url: url.href };
    }

    #insertVideo(editable) {
        if (!(editable instanceof HTMLElement) || editable.contentEditable !== 'true') {
            return;
        }

        const value = window.prompt(this.t.editor.videoUrl);

        if (!value?.trim()) {
            return;
        }

        const source = this.#normalizeVideoUrl(value);
        let media;

        if (source.type === 'embed') {
            media = document.createElement('iframe');
            media.src = source.url;
            media.className = 'vhd-inline-video vhd-inline-video-embed';
            media.title = 'Video';
            media.loading = 'lazy';
            media.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
            media.allowFullscreen = true;
        } else {
            media = document.createElement('video');
            media.src = source.url;
            media.controls = true;
            media.className = 'vhd-inline-video';
        }

        media.style.maxWidth = '100%';
        media.style.width = '100%';

        const selection = window.getSelection();
        let range = null;

        if (selection?.rangeCount) {
            const candidate = selection.getRangeAt(0);

            if (editable.contains(candidate.commonAncestorContainer)) {
                range = candidate.cloneRange();
            }
        }

        if (!range) {
            range = document.createRange();
            range.selectNodeContents(editable);
            range.collapse(false);
        }

        range.deleteContents();
        range.insertNode(media);

        editable.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: 'insertVideo',
            data: source.url
        }));
    }

    async #insertInlineImage(editable) {
        if (!(editable instanceof HTMLElement) || editable.contentEditable !== 'true') {
            return;
        }

        const selection = window.getSelection();
        let range = null;

        if (selection?.rangeCount) {
            const candidate = selection.getRangeAt(0);

            if (editable.contains(candidate.commonAncestorContainer)) {
                range = candidate.cloneRange();
            }
        }

        if (this.options.imageGalleryUrl) {
            await this.#openImageGallery({
                type: 'inline',
                editable,
                range
            });
            return;
        }

        let selected = null;

        if (typeof this.options.onImageSelect === 'function') {
            selected = await this.options.onImageSelect();
        } else {
            const src = window.prompt(this.t.editor.inlineImageUrl);

            if (src?.trim()) {
                selected = { src: src.trim(), alt: '' };
            }
        }

        if (!selected?.src) {
            return;
        }

        this.pendingImageTarget = {
            type: 'inline',
            editable,
            range
        };

        this.insertImage(selected);
    }

    #showInlineLinkProperties(link) {
        const panel = this.propertiesPanel;
        panel.replaceChildren();

        const title = document.createElement('h3');
        title.textContent = this.t.properties.linkProperties;
        panel.append(title);

        const editable = link.closest('[contenteditable="true"]');

        const sync = () => {
            editable?.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                inputType: 'formatLink',
                data: null
            }));

            this.textToolbar.updateActiveStates();
        };

        panel.append(
            this.#propertyField(
                this.t.properties.linkUrl,
                'url',
                link.getAttribute('href') || '',
                value => {
                    link.setAttribute('href', value.trim());
                    sync();
                }
            ),
            this.#propertyField(
                this.t.properties.linkTarget,
                'select',
                link.getAttribute('target') === '_blank' ? '_blank' : '_self',
                value => {
                    if (value === '_blank') {
                        link.setAttribute('target', '_blank');
                        link.setAttribute('rel', 'noopener noreferrer');
                    } else {
                        link.removeAttribute('target');
                        link.removeAttribute('rel');
                    }

                    sync();
                },
                [
                    ['_self', this.t.properties.linkSameWindow],
                    ['_blank', this.t.properties.linkNewWindow]
                ]
            )
        );

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'vhd-secondary-button vhd-remove-link-button';
        remove.textContent = this.t.properties.removeLink;

        remove.addEventListener('click', () => {
            const parent = link.parentNode;

            while (link.firstChild) {
                parent.insertBefore(link.firstChild, link);
            }

            link.remove();

            editable?.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                inputType: 'formatRemove',
                data: null
            }));

            panel.innerHTML = `<h3>${this.t.properties.title}</h3><p class="vhd-properties-empty">${this.t.properties.none}</p>`;
            editable?.focus();
            this.textToolbar.updateActiveStates();
        });

        panel.append(remove);
    }

    #selectInlineLink(link) {
        this.#removeInlineImageResizeOverlay();
        this.root.querySelectorAll('.vhd-inline-image.is-selected').forEach(item => item.classList.remove('is-selected'));
        this.root.querySelectorAll('.vhd-selected').forEach(item => item.classList.remove('vhd-selected'));

        this.#showInlineLinkProperties(link);
    }

    #applyInlineImageStyles(image) {
        const align = ['left', 'center', 'right'].includes(image.dataset.align)
            ? image.dataset.align
            : 'left';
        const size = Math.min(
            100,
            Math.max(1, Number(image.dataset.size || 33))
        );
        const spacing = Math.max(
            0,
            Number(image.dataset.spacing || 0)
        );
        const borderRadius = Math.max(
            0,
            Number(image.dataset.borderRadius || 0)
        );

        image.dataset.align = align;
        image.dataset.size = String(size);
        image.dataset.spacing = String(spacing);
        image.dataset.borderRadius = String(borderRadius);
        image.style.width = `${size}%`;
        image.style.maxWidth = '100%';
        image.style.height = 'auto';
        image.style.borderRadius = `${borderRadius}px`;

        /*
         * Inline images can live directly inside a contenteditable table
         * cell. Apply a complete alignment state every time instead of only
         * changing a subset of float/display/margin declarations. This avoids
         * stale styles from a previous alignment winning inside <td>/<th>.
         */
        image.style.removeProperty('float');
        image.style.display = 'block';
        image.style.clear = 'none';

        if (align === 'right') {
            image.style.marginTop = `${spacing}px`;
            image.style.marginRight = '0';
            image.style.marginBottom = `${spacing}px`;
            image.style.marginLeft = 'auto';
        } else if (align === 'center') {
            image.style.marginTop = `${spacing}px`;
            image.style.marginRight = 'auto';
            image.style.marginBottom = `${spacing}px`;
            image.style.marginLeft = 'auto';
        } else {
            image.style.marginTop = `${spacing}px`;
            image.style.marginRight = 'auto';
            image.style.marginBottom = `${spacing}px`;
            image.style.marginLeft = '0';
        }
    }

    #syncInlineImage(image) {
        const editable = image.closest('[contenteditable="true"]');

        if (!(editable instanceof HTMLElement)) {
            return;
        }

        /*
         * #editable() normally persists through the synthetic input event.
         * Table cells also keep an explicit logical-cell model, so update its
         * content immediately to avoid any browser differences around input
         * events generated from <td>/<th contenteditable>.
         */
        const tablePreview = editable.closest('.vhd-table-editor');

        if (tablePreview) {
            const block = this.tableSelection?.block
                || this.selectedTableCell?.block;
            const rowIndex = Number(editable.dataset.rowIndex);
            const columnIndex = Number(editable.dataset.columnIndex);
            const cell = block?.rows?.[rowIndex]?.[columnIndex];

            if (cell) {
                cell.content = editable.innerHTML;
            }
        }

        editable.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: 'formatImage',
            data: null
        }));
    }

    #removeInlineImageResizeOverlay() {
        if (this.inlineImageResizeOverlayCleanup) {
            this.inlineImageResizeOverlayCleanup();
            this.inlineImageResizeOverlayCleanup = null;
        }

        this.inlineImageResizeOverlay?.remove();
        this.inlineImageResizeOverlay = null;
    }

    #showInlineImageResizeOverlay(image) {
        this.#removeInlineImageResizeOverlay();

        const editable = image.closest('[contenteditable="true"]');

        if (!(editable instanceof HTMLElement)) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'vhd-inline-image-resize-overlay';
        overlay.setAttribute('aria-hidden', 'true');

        const updateGeometry = () => {
            if (!image.isConnected) {
                this.#removeInlineImageResizeOverlay();
                return;
            }

            if (!overlay.isConnected) {
                return;
            }

            const imageRect = image.getBoundingClientRect();

            /*
             * The overlay is fixed to the viewport and attached to <body>.
             * This avoids every offset/overflow/stacking-context ambiguity
             * introduced by table cells, horizontal scrolling and nested VHD
             * layout containers.
             */
            overlay.style.left = `${imageRect.left}px`;
            overlay.style.top = `${imageRect.top}px`;
            overlay.style.width = `${imageRect.width}px`;
            overlay.style.height = `${imageRect.height}px`;
        };

        const createHandle = side => {
            const handle = document.createElement('span');
            handle.className =
                `vhd-inline-image-resize-handle vhd-inline-image-resize-handle-${side}`;
            handle.dataset.side = side;

            handle.addEventListener('pointerdown', event => {
                if (event.button !== 0) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                const startX = event.clientX;
                const startWidth = image.getBoundingClientRect().width;
                const containerWidth =
                    editable.getBoundingClientRect().width || 1;
                const direction = side === 'left' ? -1 : 1;

                overlay.classList.add('is-resizing');
                handle.setPointerCapture?.(event.pointerId);

                const onMove = moveEvent => {
                    moveEvent.preventDefault();

                    const delta =
                        (moveEvent.clientX - startX) * direction;
                    const widthPx = Math.max(
                        20,
                        Math.min(
                            containerWidth,
                            startWidth + delta
                        )
                    );
                    const percent = Math.min(
                        100,
                        Math.max(
                            1,
                            widthPx / containerWidth * 100
                        )
                    );

                    image.dataset.size =
                        String(Math.round(percent * 10) / 10);

                    this.#applyInlineImageStyles(image);
                    updateGeometry();
                };

                const onEnd = endEvent => {
                    handle.releasePointerCapture?.(endEvent.pointerId);
                    handle.removeEventListener(
                        'pointermove',
                        onMove
                    );
                    handle.removeEventListener(
                        'pointerup',
                        onEnd
                    );
                    handle.removeEventListener(
                        'pointercancel',
                        onEnd
                    );

                    overlay.classList.remove('is-resizing');

                    this.#syncInlineImage(image);
                    this.#showInlineImageProperties(image);
                    updateGeometry();
                };

                handle.addEventListener('pointermove', onMove);
                handle.addEventListener('pointerup', onEnd);
                handle.addEventListener('pointercancel', onEnd);
            });

            return handle;
        };

        overlay.append(
            createHandle('left'),
            createHandle('right')
        );

        document.body.append(overlay);
        this.inlineImageResizeOverlay = overlay;

        const onViewportChange = () => updateGeometry();
        const tableScroll = image.closest('.vhd-table-scroll');

        /*
         * Capture page/ancestor scrolling as well as table horizontal
         * scrolling. The overlay must remain glued to the image until it is
         * deselected.
         */
        window.addEventListener(
            'resize',
            onViewportChange,
            { passive: true }
        );
        document.addEventListener(
            'scroll',
            onViewportChange,
            { passive: true, capture: true }
        );

        if (tableScroll) {
            tableScroll.addEventListener(
                'scroll',
                onViewportChange,
                { passive: true }
            );
        }

        /*
         * The resize frame is outside the editable content. If the image is
         * deleted, the frame must therefore be removed explicitly.
         */
        const removalObserver = typeof MutationObserver === 'function'
            ? new MutationObserver(() => {
                if (!image.isConnected) {
                    this.#removeInlineImageResizeOverlay();
                }
            })
            : null;

        removalObserver?.observe(this.root, {
            subtree: true,
            childList: true
        });

        this.inlineImageResizeOverlayCleanup = () => {
            window.removeEventListener(
                'resize',
                onViewportChange
            );
            document.removeEventListener(
                'scroll',
                onViewportChange,
                true
            );

            if (tableScroll) {
                tableScroll.removeEventListener(
                    'scroll',
                    onViewportChange
                );
            }

            removalObserver?.disconnect();
        };

        requestAnimationFrame(updateGeometry);
    }

    #showInlineImageProperties(image) {
        const panel = this.propertiesPanel;
        panel.replaceChildren();

        const title = document.createElement('h3');
        title.textContent = this.t.properties.inlineImage;
        panel.append(title);

        const currentSize = Math.min(100, Math.max(1, Number(image.dataset.size || 33)));
        const currentSpacing = Math.max(0, Number(image.dataset.spacing || 0));
        const currentBorderRadius = Math.max(0, Number(image.dataset.borderRadius || 0));

        panel.append(
            this.#propertyField(
                this.t.properties.alt,
                'text',
                image.getAttribute('alt') || '',
                value => {
                    image.alt = value;
                    this.#syncInlineImage(image);
                }
            ),
            this.#propertyField(
                this.t.properties.align,
                'select',
                image.dataset.align || 'left',
                value => {
                    image.dataset.align = value;
                    this.#applyInlineImageStyles(image);
                    this.#syncInlineImage(image);
                    this.#showInlineImageResizeOverlay(image);
                },
                [
                    ['left', this.t.properties.left],
                    ['center', this.t.properties.center],
                    ['right', this.t.properties.right]
                ]
            ),
            this.#propertyField(
                this.t.properties.width,
                'number',
                currentSize,
                (value, input) => {
                    const size = Math.min(100, Math.max(1, Number(value) || 1));
                    input.max = '100';
                    input.min = '1';
                    image.dataset.size = String(size);
                    this.#applyInlineImageStyles(image);
                    this.#syncInlineImage(image);
                }
            ),
            this.#propertyField(
                this.t.properties.borderRadius,
                'number',
                currentBorderRadius,
                (value, input) => {
                    const borderRadius = Math.max(0, Number(value) || 0);
                    input.min = '0';
                    image.dataset.borderRadius = String(borderRadius);
                    this.#applyInlineImageStyles(image);
                    this.#syncInlineImage(image);
                }
            ),
            this.#propertyField(
                this.t.properties.spacing,
                'number',
                currentSpacing,
                (value, input) => {
                    const spacing = Math.max(0, Number(value) || 0);
                    input.min = '0';
                    image.dataset.spacing = String(spacing);
                    this.#applyInlineImageStyles(image);
                    this.#syncInlineImage(image);
                }
            )
        );
    }

    #selectInlineImage(image) {
        this.root.querySelectorAll('.vhd-inline-image.is-selected').forEach(item => item.classList.remove('is-selected'));
        this.root.querySelectorAll('.vhd-selected').forEach(item => item.classList.remove('vhd-selected'));

        image.classList.add('is-selected');

        if (!image.dataset.align) {
            image.dataset.align = image.style.float === 'right' ? 'right' : 'left';
        }

        if (!image.dataset.size) {
            image.dataset.size = String(Number.parseFloat(image.style.width) || 33);
        }

        if (!image.dataset.spacing) {
            const computed = window.getComputedStyle(image);
            image.dataset.spacing = String(
                Math.max(
                    Number.parseFloat(computed.marginTop) || 0,
                    Number.parseFloat(computed.marginRight) || 0,
                    Number.parseFloat(computed.marginBottom) || 0,
                    Number.parseFloat(computed.marginLeft) || 0
                )
            );
        }

        if (!image.dataset.borderRadius) {
            image.dataset.borderRadius = String(
                Math.max(
                    0,
                    Number.parseFloat(image.style.borderRadius)
                    || Number.parseFloat(window.getComputedStyle(image).borderRadius)
                    || 0
                )
            );
        }

        this.#applyInlineImageStyles(image);
        this.#showInlineImageResizeOverlay(image);
        this.#showInlineImageProperties(image);
    }

    #showInlineImageControls(image) {
        this.inlineImageControls?.remove();

        const controls = document.createElement('div');
        controls.className = 'vhd-inline-image-controls';

        const alignment = document.createElement('select');
        alignment.title = this.t.editor.inlineImageAlign;
        alignment.innerHTML = `
            <option value="left">${this.t.editor.inlineImageLeft}</option>
            <option value="center">${this.t.editor.inlineImageCenter}</option>
            <option value="right">${this.t.editor.inlineImageRight}</option>
        `;
        alignment.value = image.dataset.align || 'left';

        const size = document.createElement('select');
        size.title = this.t.editor.inlineImageSize;
        size.innerHTML = [25, 33, 50, 75, 100].map(value => `<option value="${value}">${value} %</option>`).join('');
        size.value = image.dataset.size || '33';

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'vhd-inline-image-remove';
        remove.textContent = '×';
        remove.title = this.t.editor.inlineImageRemove;

        const sync = () => {
            const editable = image.closest('[contenteditable="true"]');
            editable?.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatImage', data: null }));
        };

        alignment.addEventListener('change', () => {
            image.dataset.align = alignment.value;
            if (alignment.value === 'left') {
                image.style.float = 'left'; image.style.display = ''; image.style.margin = '0 12px 8px 0';
            } else if (alignment.value === 'right') {
                image.style.float = 'right'; image.style.display = ''; image.style.margin = '0 0 8px 12px';
            } else {
                image.style.float = 'none'; image.style.display = 'block'; image.style.margin = '0 auto 8px';
            }
            sync();
        });

        size.addEventListener('change', () => {
            image.dataset.size = size.value;
            image.style.width = `${size.value}%`;
            image.style.height = 'auto';
            sync();
        });

        remove.addEventListener('click', () => {
            const editable = image.closest('[contenteditable="true"]');
            image.remove();
            controls.remove();
            this.inlineImageControls = null;
            editable?.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContent', data: null }));
        });

        controls.append(alignment, size, remove);
        this.root.append(controls);
        this.inlineImageControls = controls;
    }

    #pastePlainText(event, element) {
        event.preventDefault();

        const text = event.clipboardData?.getData('text/plain') ?? '';

        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0) {
            return;
        }

        const range = selection.getRangeAt(0);

        if (!element.contains(range.commonAncestorContainer)) {
            return;
        }

        range.deleteContents();

        const fragment = document.createDocumentFragment();
        const lines = text.replace(/\r\n?/g, '\n').split('\n');

        lines.forEach((line, index) => {
            if (index > 0) {
                fragment.append(document.createElement('br'));
            }

            fragment.append(document.createTextNode(line));
        });

        const lastNode = fragment.lastChild;
        range.insertNode(fragment);

        if (lastNode) {
            const caret = document.createRange();

            if (lastNode.nodeType === Node.TEXT_NODE) {
                caret.setStart(lastNode, lastNode.textContent.length);
            } else {
                caret.setStartAfter(lastNode);
            }

            caret.collapse(true);
            selection.removeAllRanges();
            selection.addRange(caret);
        }

        element.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: 'insertFromPaste',
            data: text
        }));
    }

    #hideSelectionMenu() {
        if (this.selectionMenu instanceof HTMLElement) {
            this.selectionMenu.hidden = true;
        }

        this.selectionMenuRange = null;
        this.selectionMenuEditable = null;
    }

    #restoreSelectionMenuRange() {
        if (
            !(this.selectionMenuRange instanceof Range)
            || !(this.selectionMenuEditable instanceof HTMLElement)
        ) {
            return false;
        }

        const selection = window.getSelection();

        if (!selection) {
            return false;
        }

        selection.removeAllRanges();
        selection.addRange(this.selectionMenuRange.cloneRange());
        this.selectionMenuEditable.focus();
        this.textToolbar.setActiveEditable(this.selectionMenuEditable);

        return true;
    }

    #runSelectionMenuAction(action) {
        const editable = this.selectionMenuEditable;

        if (!(editable instanceof HTMLElement)) {
            this.#hideSelectionMenu();
            return;
        }

        const restore = () => this.#restoreSelectionMenuRange();

        if (action === 'bold') {
            if (!restore()) {
                return;
            }

            this.#remember();
            document.execCommand('bold', false, null);
            editable.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                inputType: 'formatBold',
                data: null
            }));
            this.#hideSelectionMenu();
            return;
        }

        if (action === 'h2') {
            if (!restore()) {
                return;
            }

            this.#remember();
            document.execCommand('formatBlock', false, 'h2');
            editable.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                inputType: 'formatBlock',
                data: 'h2'
            }));
            this.#hideSelectionMenu();
            return;
        }

        if (action === 'code') {
            if (!restore()) {
                return;
            }

            this.#insertInlineCode(editable);
            this.#hideSelectionMenu();
            return;
        }

        if (action === 'link') {
            const url = window.prompt('URL');

            if (!url || !restore()) {
                this.#hideSelectionMenu();
                return;
            }

            this.#remember();
            document.execCommand('createLink', false, url);
            editable.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                inputType: 'createLink',
                data: url
            }));
            this.#hideSelectionMenu();
        }
    }

    #ensureSelectionMenu() {
        if (this.selectionMenu instanceof HTMLElement) {
            return this.selectionMenu;
        }

        const menu = document.createElement('div');
        menu.className = 'vhd-selection-menu';
        menu.hidden = true;
        menu.setAttribute('role', 'toolbar');
        menu.setAttribute('aria-label', 'Actions sur la sélection');

        const items = [
            ['h2', 'H2', 'Titre H2'],
            ['bold', 'B', this.t.toolbar.bold],
            ['code', '</>', this.t.toolbar.insertCode],
            ['link', '🔗', this.t.toolbar.link]
        ];

        items.forEach(([action, label, title]) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `vhd-selection-menu-button vhd-selection-menu-${action}`;
            button.dataset.action = action;
            button.textContent = label;
            button.title = title;
            button.setAttribute('aria-label', title);

            button.addEventListener('mousedown', event => {
                event.preventDefault();
                event.stopPropagation();
                this.#runSelectionMenuAction(action);
            });

            menu.append(button);
        });

        menu.addEventListener('pointerdown', event => {
            event.stopPropagation();
        });

        menu.addEventListener('pointerup', event => {
            event.stopPropagation();
        });

        document.body.append(menu);
        this.selectionMenu = menu;

        return menu;
    }

    #showSelectionMenu(editable) {
        if (
            !(editable instanceof HTMLElement)
            || !editable.classList.contains('vhd-editable-text')
        ) {
            this.#hideSelectionMenu();
            return;
        }

        const selection = window.getSelection();

        if (
            !selection
            || selection.rangeCount === 0
            || selection.isCollapsed
        ) {
            this.#hideSelectionMenu();
            return;
        }

        const range = selection.getRangeAt(0);

        if (
            !editable.contains(range.commonAncestorContainer)
            && range.commonAncestorContainer !== editable
        ) {
            this.#hideSelectionMenu();
            return;
        }

        const text = this.#rangeToPlainText(range);

        if (!text.trim()) {
            this.#hideSelectionMenu();
            return;
        }

        const rect = range.getBoundingClientRect();

        if (!rect.width && !rect.height) {
            this.#hideSelectionMenu();
            return;
        }

        const menu = this.#ensureSelectionMenu();

        this.selectionMenuRange = range.cloneRange();
        this.selectionMenuEditable = editable;

        menu.hidden = false;

        const menuRect = menu.getBoundingClientRect();
        const gap = 8;
        const viewportPadding = 8;

        let left = rect.left + (rect.width / 2) - (menuRect.width / 2);
        left = Math.max(
            viewportPadding,
            Math.min(left, window.innerWidth - menuRect.width - viewportPadding)
        );

        let top = rect.top - menuRect.height - gap;

        if (top < viewportPadding) {
            top = rect.bottom + gap;
        }

        menu.style.left = `${Math.round(left)}px`;
        menu.style.top = `${Math.round(top)}px`;
    }

    #editable(element, block, property) {
        element.contentEditable = 'true';
        element.spellcheck = true;
        element.style.fontFamily = this.options.defaultFontFamily;

        const syncTextPlaceholder = () => {
            if (!element.classList.contains('vhd-editable-text')) {
                return;
            }

            const hasVisibleContent = element.textContent.trim() !== ''
                || Boolean(element.querySelector(
                    'img, video, iframe, pre, table, hr'
                ));

            element.classList.toggle('vhd-is-empty', !hasVisibleContent);
        };

        syncTextPlaceholder();

        element.addEventListener('focus', () => {
            this.textToolbar.setActiveEditable(element);
            this.textToolbar.show();
        });

        if (element.classList.contains('vhd-editable-text')) {
            element.addEventListener('pointerdown', event => {
                this.#hideSelectionMenu();

                if (!element.classList.contains('vhd-is-empty')) {
                    return;
                }

                event.preventDefault();
                element.focus();

                const caretTarget = element.firstElementChild || element;
                const range = document.createRange();
                range.selectNodeContents(caretTarget);
                range.collapse(true);

                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            });

            element.addEventListener('keyup', event => {
                if (
                    event.shiftKey
                    || [
                        'ArrowLeft',
                        'ArrowRight',
                        'ArrowUp',
                        'ArrowDown',
                        'Home',
                        'End'
                    ].includes(event.key)
                ) {
                    requestAnimationFrame(() => {
                        this.#showSelectionMenu(element);
                    });
                }
            });
        }

        element.addEventListener('paste', event => {
            this.#pastePlainText(event, element);
        });

        element.addEventListener('keydown', event => {
            const selection = window.getSelection();

            if (!selection || selection.rangeCount === 0) {
                return;
            }

            const range = selection.getRangeAt(0);
            const startElement = range.startContainer.nodeType === Node.ELEMENT_NODE
                ? range.startContainer
                : range.startContainer.parentElement;
            const pre = startElement?.closest?.('pre.vhd-code');

            if (!pre || !element.contains(pre)) {
                return;
            }

            /*
             * Inside code, Tab belongs to the source text instead of browser
             * focus navigation.
             */
            if (event.key === 'Tab') {
                event.preventDefault();
                this.#remember();
                this.#insertTextAtRange(range, '    ');

                element.dispatchEvent(new InputEvent('input', {
                    bubbles: true,
                    inputType: 'insertText',
                    data: '    '
                }));
                return;
            }

            /*
             * Ctrl/Cmd + Enter exits the code area and continues in the
             * paragraph that follows it.
             */
            if (
                event.key === 'Enter'
                && (event.ctrlKey || event.metaKey)
            ) {
                event.preventDefault();
                this.#moveCaretAfterCode(pre, element);
            }
        });

        element.addEventListener('pointerdown', event => {
            const image = event.target.closest?.('.vhd-inline-image');

            if (
                image
                && element.contains(image)
                && event.button === 0
            ) {
                /*
                 * Select inline images on pointer-down as well as click. This
                 * is important inside table cells, whose own pointer gesture
                 * handler also participates in selection.
                 */
                this.#selectInlineImage(image);
            }
        });

        element.addEventListener('click', event => {
            const link = event.target.closest?.('a');

            if (link && element.contains(link)) {
                event.preventDefault();
                event.stopPropagation();
                this.textToolbar.setActiveEditable(element);
                this.#selectInlineLink(link);
                return;
            }

            const image = event.target.closest?.('.vhd-inline-image');

            if (image && element.contains(image)) {
                event.preventDefault();
                event.stopPropagation();
                this.#selectInlineImage(image);
                return;
            }

            this.#removeInlineImageResizeOverlay();
            this.root.querySelectorAll(
                '.vhd-inline-image.is-selected'
            ).forEach(item => item.classList.remove('is-selected'));
        });

        element.addEventListener('vhd:heading-level', event => {
            if (block.type !== 'heading') {
                return;
            }

            const level = Number(event.detail?.level);

            if (!Number.isInteger(level) || level < 1 || level > 6 || level === block.level) {
                return;
            }

            block[property] = element.innerHTML;
            block.level = level;

            const replacement = document.createElement(`h${level}`);
            replacement.innerHTML = block[property] || '';
            this.#editable(replacement, block, property);
            element.replaceWith(replacement);

            replacement.focus();

            const range = document.createRange();
            range.selectNodeContents(replacement);
            range.collapse(false);

            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            this.textToolbar.setActiveEditable(replacement);
        });

        element.addEventListener('input', () => {
            this.#hideSelectionMenu();
            syncTextPlaceholder();
            block[property] = element.innerHTML;
            this.#emit('change', {
                source: 'content',
                blockId: block.id
            });

            const selectedImage = this.root.querySelector(
                '.vhd-inline-image.is-selected'
            );

            if (
                this.inlineImageResizeOverlay
                && !(selectedImage instanceof HTMLImageElement)
            ) {
                this.#removeInlineImageResizeOverlay();
            }

            this.#updateDocumentStatistics();
        });

        element.addEventListener('blur', event => {
            if (
                !(this.selectionMenu instanceof HTMLElement)
                || !this.selectionMenu.contains(event.relatedTarget)
            ) {
                this.#hideSelectionMenu();
            }

            block[property] = element.innerHTML;
            this.#updateDocumentStatistics();
        });
    }

    #setTableSelection(block, rowIndex, columnIndex, extend = false) {
        if (
            !extend
            || !this.tableSelection
            || this.tableSelection.block !== block
        ) {
            this.tableSelection = {
                block,
                anchorRow: rowIndex,
                anchorColumn: columnIndex,
                focusRow: rowIndex,
                focusColumn: columnIndex
            };
        } else {
            this.tableSelection.focusRow = rowIndex;
            this.tableSelection.focusColumn = columnIndex;
        }

        this.selectedTableCell = {
            block,
            rowIndex,
            columnIndex
        };
    }

    #selectTableRange(preview, block, bounds) {
        const rowCount = block.rows?.length ?? 0;
        const columnCount = block.rows?.[0]?.length ?? 0;

        if (!rowCount || !columnCount) {
            return;
        }

        const minRow = Math.max(
            0,
            Math.min(rowCount - 1, Number(bounds.minRow))
        );
        const maxRow = Math.max(
            minRow,
            Math.min(rowCount - 1, Number(bounds.maxRow))
        );
        const minColumn = Math.max(
            0,
            Math.min(columnCount - 1, Number(bounds.minColumn))
        );
        const maxColumn = Math.max(
            minColumn,
            Math.min(columnCount - 1, Number(bounds.maxColumn))
        );

        this.tableSelection = {
            block,
            anchorRow: minRow,
            anchorColumn: minColumn,
            focusRow: maxRow,
            focusColumn: maxColumn
        };

        this.selectedTableCell = {
            block,
            rowIndex: minRow,
            columnIndex: minColumn
        };

        window.getSelection()?.removeAllRanges();
        this.#refreshTableSelection(preview, block);
        this.#selectProperties(
            'block',
            block,
            preview.closest('.vhd-block')
        );
        this.#updateTableToolbar(preview, block);
    }

    #createTableSelectionLayer(preview, block, tableScroll, table) {
        const rowCount = block.rows?.length ?? 0;
        const columnCount = block.rows?.[0]?.length ?? 0;

        if (!rowCount || !columnCount) {
            return null;
        }

        const layer = document.createElement('div');
        layer.className = 'vhd-table-selection-layer';

        const corner = document.createElement('button');
        corner.type = 'button';
        corner.className =
            'vhd-table-selection-handle vhd-table-all-selector';
        corner.title = this.t.properties.tableSelectAll;
        corner.setAttribute(
            'aria-label',
            this.t.properties.tableSelectAll
        );

        corner.addEventListener('pointerdown', event => {
            event.preventDefault();
            event.stopPropagation();
        });

        corner.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();

            this.#selectTableRange(preview, block, {
                minRow: 0,
                maxRow: rowCount - 1,
                minColumn: 0,
                maxColumn: columnCount - 1
            });
        });

        layer.append(corner);

        const columnSelectors = document.createElement('div');
        columnSelectors.className =
            'vhd-table-column-selectors';

        for (
            let columnIndex = 0;
            columnIndex < columnCount;
            columnIndex += 1
        ) {
            const selector = document.createElement('button');
            selector.type = 'button';
            selector.className =
                'vhd-table-selection-handle vhd-table-column-selector';
            selector.dataset.columnIndex = String(columnIndex);
            selector.title = this.t.properties.tableSelectColumn;
            selector.setAttribute(
                'aria-label',
                this.t.properties.tableSelectColumn
            );

            selector.addEventListener('pointerdown', event => {
                event.preventDefault();
                event.stopPropagation();
            });

            selector.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();

                this.#selectTableRange(preview, block, {
                    minRow: 0,
                    maxRow: rowCount - 1,
                    minColumn: columnIndex,
                    maxColumn: columnIndex
                });
            });

            columnSelectors.append(selector);
        }

        layer.append(columnSelectors);

        const rowSelectors = document.createElement('div');
        rowSelectors.className =
            'vhd-table-row-selectors';

        for (
            let rowIndex = 0;
            rowIndex < rowCount;
            rowIndex += 1
        ) {
            const selector = document.createElement('button');
            selector.type = 'button';
            selector.className =
                'vhd-table-selection-handle vhd-table-row-selector';
            selector.dataset.rowIndex = String(rowIndex);
            selector.title = this.t.properties.tableSelectRow;
            selector.setAttribute(
                'aria-label',
                this.t.properties.tableSelectRow
            );

            selector.addEventListener('pointerdown', event => {
                event.preventDefault();
                event.stopPropagation();
            });

            selector.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();

                this.#selectTableRange(preview, block, {
                    minRow: rowIndex,
                    maxRow: rowIndex,
                    minColumn: 0,
                    maxColumn: columnCount - 1
                });
            });

            rowSelectors.append(selector);
        }

        layer.append(rowSelectors);

        const updateGeometry = () => {
            const tableWidth = table.offsetWidth;
            const tableHeight = table.offsetHeight;

            /*
             * The selection layer is attached to the table preview rather
             * than the horizontally scrolling wrapper. This allows its top
             * and left selector margins to remain visible outside the table.
             */
            layer.style.width = `${tableWidth}px`;
            layer.style.height = `${tableHeight}px`;
            layer.style.left =
                `${tableScroll.offsetLeft + table.offsetLeft - tableScroll.scrollLeft}px`;
            layer.style.top =
                `${tableScroll.offsetTop + table.offsetTop}px`;

            const widths = this.#normalizeTableColumnWidths(block);
            let cumulative = 0;

            Array.from(columnSelectors.children)
                .forEach((selector, index) => {
                    const width = widths[index] ?? 0;
                    selector.style.left = `${cumulative}%`;
                    selector.style.width = `${width}%`;
                    cumulative += width;
                });

            /*
             * Use the native table.rows collection. VHD currently builds
             * editor tables by appending <tr> elements directly to <table>,
             * while imported/browser-parsed tables may contain a <tbody>.
             * table.rows handles both structures reliably.
             */
            const rows = Array.from(table.rows ?? []);
            const tableRect = table.getBoundingClientRect();

            /*
             * The row selector layer now lives outside the scrolling wrapper.
             * Use viewport geometry relative to the rendered table itself
             * rather than offsetTop/offsetHeight, whose offset parent can vary
             * between browsers and table layout modes.
             */
            Array.from(rowSelectors.children)
                .forEach((selector, index) => {
                    const row = rows[index];

                    if (!row) {
                        selector.hidden = true;
                        return;
                    }

                    const rowRect = row.getBoundingClientRect();

                    selector.hidden = false;
                    selector.style.top =
                        `${rowRect.top - tableRect.top}px`;
                    selector.style.height =
                        `${Math.max(1, rowRect.height)}px`;
                });

        };

        let geometryFrame = null;

        const scheduleGeometryUpdate = () => {
            if (geometryFrame !== null) {
                cancelAnimationFrame(geometryFrame);
            }

            geometryFrame = requestAnimationFrame(() => {
                geometryFrame = null;

                if (
                    !preview.isConnected
                    || !table.isConnected
                    || !layer.isConnected
                ) {
                    resizeObserver?.disconnect();
                    mutationObserver?.disconnect();
                    return;
                }

                updateGeometry();
            });
        };

        tableScroll.addEventListener(
            'scroll',
            scheduleGeometryUpdate,
            { passive: true }
        );

        /*
         * Row selector geometry depends on the actual rendered row heights.
         * Text wrapping, inline-image resizing, padding/border changes and
         * merged-cell content can all change those heights without causing a
         * window resize or table-scroll event.
         */
        const resizeObserver = typeof ResizeObserver === 'function'
            ? new ResizeObserver(() => {
                scheduleGeometryUpdate();
            })
            : null;

        resizeObserver?.observe(table);

        Array.from(table.rows ?? []).forEach(row => {
            resizeObserver?.observe(row);
        });

        /*
         * Column widths and table structure can also be changed through
         * inline styles or DOM updates while the overall table size remains
         * unchanged. Observe those mutations so row/column selectors stay
         * aligned with the logical grid.
         */
        const mutationObserver = typeof MutationObserver === 'function'
            ? new MutationObserver(() => {
                Array.from(table.rows ?? []).forEach(row => {
                    resizeObserver?.observe(row);
                });

                scheduleGeometryUpdate();
            })
            : null;

        mutationObserver?.observe(table, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: [
                'style',
                'rowspan',
                'colspan'
            ],
            characterData: true
        });

        window.addEventListener(
            'resize',
            scheduleGeometryUpdate,
            { passive: true }
        );

        scheduleGeometryUpdate();

        return layer;
    }

    #focusTableCell(block, rowIndex, columnIndex) {
        requestAnimationFrame(() => {
            const preview = this.canvas.querySelector(
                `.vhd-table-editor[data-block-id="${CSS.escape(block.id)}"]`
            );

            if (!(preview instanceof HTMLElement)) {
                return;
            }

            const cell = preview.querySelector(
                `[data-row-index="${rowIndex}"][data-column-index="${columnIndex}"]`
            );

            if (!(cell instanceof HTMLElement)) {
                return;
            }

            cell.focus();

            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(cell);
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);

            this.#refreshTableSelection(preview, block);
            this.#updateTableToolbar(preview, block);
        });
    }

    #getTableSelectionBounds(block) {
        const selection = this.tableSelection;

        if (!selection || selection.block !== block) {
            const selected = this.selectedTableCell;

            if (!selected || selected.block !== block) {
                return null;
            }

            return {
                minRow: selected.rowIndex,
                maxRow: selected.rowIndex,
                minColumn: selected.columnIndex,
                maxColumn: selected.columnIndex
            };
        }

        return {
            minRow: Math.min(selection.anchorRow, selection.focusRow),
            maxRow: Math.max(selection.anchorRow, selection.focusRow),
            minColumn: Math.min(
                selection.anchorColumn,
                selection.focusColumn
            ),
            maxColumn: Math.max(
                selection.anchorColumn,
                selection.focusColumn
            )
        };
    }

    #getSelectedTableCells(block) {
        const bounds = this.#getTableSelectionBounds(block);

        if (!bounds) {
            return [];
        }

        const cells = [];

        for (
            let rowIndex = bounds.minRow;
            rowIndex <= bounds.maxRow;
            rowIndex += 1
        ) {
            const row = block.rows?.[rowIndex];

            if (!row) {
                continue;
            }

            for (
                let columnIndex = bounds.minColumn;
                columnIndex <= bounds.maxColumn;
                columnIndex += 1
            ) {
                const cell = row[columnIndex];

                if (!cell) {
                    continue;
                }

                cell.properties ??= {};

                cells.push({
                    cell,
                    rowIndex,
                    columnIndex
                });
            }
        }

        return cells;
    }

    #tableHasMergedCells(block) {
        return (block.rows ?? []).some(row =>
            (row ?? []).some(cell => {
                const properties = cell?.properties ?? {};
                return Boolean(
                    properties.mergedInto
                    || Number(properties.rowspan ?? 1) > 1
                    || Number(properties.colspan ?? 1) > 1
                );
            })
        );
    }

    #getTableMergeAnchor(block, rowIndex, columnIndex) {
        const cell = block.rows?.[rowIndex]?.[columnIndex];

        if (!cell) {
            return null;
        }

        const properties = cell.properties ?? {};

        if (properties.mergedInto) {
            const anchorRow = Number(properties.mergedInto.row);
            const anchorColumn = Number(properties.mergedInto.column);
            const anchor = block.rows?.[anchorRow]?.[anchorColumn];

            if (!anchor) {
                return null;
            }

            return {
                cell: anchor,
                rowIndex: anchorRow,
                columnIndex: anchorColumn
            };
        }

        if (
            Number(properties.rowspan ?? 1) > 1
            || Number(properties.colspan ?? 1) > 1
        ) {
            return {
                cell,
                rowIndex,
                columnIndex
            };
        }

        return null;
    }

    #canMergeTableSelection(block) {
        const bounds = this.#getTableSelectionBounds(block);

        if (!bounds) {
            return false;
        }

        const rowSpan = bounds.maxRow - bounds.minRow + 1;
        const colSpan = bounds.maxColumn - bounds.minColumn + 1;

        if (rowSpan <= 1 && colSpan <= 1) {
            return false;
        }

        /*
         * Keep header semantics predictable: a merge must not cross from the
         * header row into body rows.
         */
        if (
            block.properties?.header !== false
            && bounds.minRow === 0
            && bounds.maxRow > 0
        ) {
            return false;
        }

        for (
            let rowIndex = bounds.minRow;
            rowIndex <= bounds.maxRow;
            rowIndex += 1
        ) {
            for (
                let columnIndex = bounds.minColumn;
                columnIndex <= bounds.maxColumn;
                columnIndex += 1
            ) {
                const cell = block.rows?.[rowIndex]?.[columnIndex];
                const properties = cell?.properties ?? {};

                if (
                    !cell
                    || properties.mergedInto
                    || Number(properties.rowspan ?? 1) > 1
                    || Number(properties.colspan ?? 1) > 1
                ) {
                    return false;
                }
            }
        }

        return true;
    }

    #mergeTableSelection(block) {
        if (!this.#canMergeTableSelection(block)) {
            return;
        }

        const bounds = this.#getTableSelectionBounds(block);

        if (!bounds) {
            return;
        }

        this.#remember();

        const anchor =
            block.rows[bounds.minRow][bounds.minColumn];

        /*
         * Keep every selected cell's content visible after the merge.
         * Contents are collected in reading order (left-to-right,
         * top-to-bottom) and separated by a line break.
         *
         * The original content of every logical cell is preserved so an
         * unmerge can restore the initial grid without data loss.
         */
        const mergedContents = [];

        for (
            let rowIndex = bounds.minRow;
            rowIndex <= bounds.maxRow;
            rowIndex += 1
        ) {
            for (
                let columnIndex = bounds.minColumn;
                columnIndex <= bounds.maxColumn;
                columnIndex += 1
            ) {
                const cell = block.rows[rowIndex][columnIndex];
                const content = String(cell?.content ?? '').trim();

                if (content) {
                    mergedContents.push(content);
                }
            }
        }

        anchor.properties ??= {};
        anchor.properties.mergeOriginalContent =
            String(anchor.content ?? '');
        anchor.properties.rowspan =
            bounds.maxRow - bounds.minRow + 1;
        anchor.properties.colspan =
            bounds.maxColumn - bounds.minColumn + 1;
        anchor.content = mergedContents.join('<br>');

        for (
            let rowIndex = bounds.minRow;
            rowIndex <= bounds.maxRow;
            rowIndex += 1
        ) {
            for (
                let columnIndex = bounds.minColumn;
                columnIndex <= bounds.maxColumn;
                columnIndex += 1
            ) {
                if (
                    rowIndex === bounds.minRow
                    && columnIndex === bounds.minColumn
                ) {
                    continue;
                }

                const cell = block.rows[rowIndex][columnIndex];
                cell.properties ??= {};
                delete cell.properties.rowspan;
                delete cell.properties.colspan;
                cell.properties.mergedInto = {
                    row: bounds.minRow,
                    column: bounds.minColumn
                };
            }
        }

        this.tableSelection = {
            block,
            anchorRow: bounds.minRow,
            anchorColumn: bounds.minColumn,
            focusRow: bounds.minRow,
            focusColumn: bounds.minColumn
        };
        this.selectedTableCell = {
            block,
            rowIndex: bounds.minRow,
            columnIndex: bounds.minColumn
        };

        this.render();
    }

    #unmergeTableCell(block) {
        const selected = this.selectedTableCell;

        if (!selected || selected.block !== block) {
            return;
        }

        const merge = this.#getTableMergeAnchor(
            block,
            selected.rowIndex,
            selected.columnIndex
        );

        if (!merge) {
            return;
        }

        const anchor = merge.cell;
        const properties = anchor.properties ?? {};
        const rowSpan = Math.max(
            1,
            Number(properties.rowspan ?? 1)
        );
        const colSpan = Math.max(
            1,
            Number(properties.colspan ?? 1)
        );

        this.#remember();

        const originalAnchorContent =
            properties.mergeOriginalContent;
        const originalAnchorProperties =
            properties.mergeOriginalProperties;

        delete properties.rowspan;
        delete properties.colspan;
        delete properties.mergeOriginalContent;
        delete properties.mergeOriginalProperties;

        if (originalAnchorContent !== undefined) {
            anchor.content = originalAnchorContent;
        }

        if (
            originalAnchorProperties
            && typeof originalAnchorProperties === 'object'
        ) {
            anchor.properties = {
                ...originalAnchorProperties
            };
        }

        for (
            let rowIndex = merge.rowIndex;
            rowIndex < merge.rowIndex + rowSpan;
            rowIndex += 1
        ) {
            for (
                let columnIndex = merge.columnIndex;
                columnIndex < merge.columnIndex + colSpan;
                columnIndex += 1
            ) {
                const cell = block.rows?.[rowIndex]?.[columnIndex];

                if (!cell?.properties?.mergedInto) {
                    continue;
                }

                const mergedInto = cell.properties.mergedInto;

                if (
                    Number(mergedInto.row) === merge.rowIndex
                    && Number(mergedInto.column) === merge.columnIndex
                ) {
                    delete cell.properties.mergedInto;
                }
            }
        }

        this.tableSelection = {
            block,
            anchorRow: merge.rowIndex,
            anchorColumn: merge.columnIndex,
            focusRow: merge.rowIndex,
            focusColumn: merge.columnIndex
        };
        this.selectedTableCell = {
            block,
            rowIndex: merge.rowIndex,
            columnIndex: merge.columnIndex
        };

        this.render();
    }

    #formatContextualSelection(command, value = null) {
        const selectedImage = this.root.querySelector(
            '.vhd-inline-image.is-selected'
        );

        /*
         * An explicitly selected inline image takes precedence over its
         * containing text/table cell. This matches the visual selection the
         * user sees and makes the main alignment menu truly contextual.
         */
        if (
            selectedImage instanceof HTMLImageElement
            && command === 'alignment'
        ) {
            if (!['left', 'center', 'right'].includes(value)) {
                /*
                 * Justification has no meaningful image equivalent. Consume
                 * the command while an image is selected rather than applying
                 * it unexpectedly to the containing cell or paragraph.
                 */
                return true;
            }

            this.#remember();
            selectedImage.dataset.align = value;
            this.#applyInlineImageStyles(selectedImage);
            this.#syncInlineImage(selectedImage);

            /*
             * Alignment changes move the image, so rebuild the fixed resize
             * overlay around its new position and keep Properties in sync.
             */
            this.#showInlineImageResizeOverlay(selectedImage);
            this.#showInlineImageProperties(selectedImage);

            return true;
        }

        return this.#formatTableCellSelection(command, value);
    }

    #formatTableCellSelection(command, value = null) {
        const selection = this.tableSelection;
        const block = selection?.block;

        if (!block) {
            return false;
        }

        const selectedCells = this.#getSelectedTableCells(block);

        const preview = this.canvas.querySelector(
            `.vhd-table-editor[data-block-id="${CSS.escape(block.id)}"]`
        );

        if (!(preview instanceof HTMLElement)) {
            return false;
        }

        /*
         * Horizontal alignment is a property of the table cell itself, not
         * merely of its editable inner HTML. Handle it through the persisted
         * cell model even when only one cell is selected.
         *
         * This also keeps single-cell and multi-cell alignment behavior
         * identical in JSON, Preview and exported HTML.
         */
        if (command === 'alignment' && selectedCells.length >= 1) {
            this.#applyTableCellStyle(
                preview,
                block,
                'textAlign',
                value
            );
            return true;
        }

        /*
         * Other rich-text commands keep their native single-cell behavior.
         * The special multi-cell path is only needed for an actual range.
         */
        if (selectedCells.length <= 1) {
            return false;
        }

        if (command === 'foreColor') {
            this.#applyTableCellStyle(
                preview,
                block,
                'color',
                value
            );
            return true;
        }

        if (command === 'hiliteColor') {
            this.#applyTableCellStyle(
                preview,
                block,
                'backgroundColor',
                value
            );
            return true;
        }

        const supportedInlineCommands = new Set([
            'bold',
            'italic',
            'underline',
            'strikeThrough',
            'superscript',
            'subscript',
            'fontName',
            'fontSizePt'
        ]);

        if (!supportedInlineCommands.has(command)) {
            return false;
        }

        this.#remember();

        const browserSelection = window.getSelection();
        const savedRanges = browserSelection
            ? Array.from(
                { length: browserSelection.rangeCount },
                (_, index) => browserSelection.getRangeAt(index).cloneRange()
            )
            : [];

        /*
         * Preserve the editor-level table selection while execCommand moves
         * the native DOM selection through each individual cell.
         */
        const logicalSelection = this.tableSelection
            ? { ...this.tableSelection }
            : null;
        const logicalSelectedCell = this.selectedTableCell
            ? { ...this.selectedTableCell }
            : null;

        this.isFormattingTableSelection = true;

        try {
            for (const { cell, rowIndex, columnIndex } of selectedCells) {
                const cellElement = preview.querySelector(
                    `[data-row-index="${rowIndex}"][data-column-index="${columnIndex}"]`
                );

                if (!(cellElement instanceof HTMLElement)) {
                    continue;
                }

                const range = document.createRange();
                range.selectNodeContents(cellElement);

                browserSelection?.removeAllRanges();
                browserSelection?.addRange(range);

                document.execCommand('styleWithCSS', false, true);

                if (command === 'fontSizePt') {
                    document.execCommand('fontSize', false, '7');

                    cellElement
                        .querySelectorAll('font[size="7"]')
                        .forEach(element => {
                            const span = document.createElement('span');
                            span.style.fontSize = `${value}pt`;

                            while (element.firstChild) {
                                span.append(element.firstChild);
                            }

                            element.replaceWith(span);
                        });
                } else {
                    document.execCommand(command, false, value);
                }

                cell.content = cellElement.innerHTML;
            }
        } finally {
            this.isFormattingTableSelection = false;

            /*
             * Restore VHD's logical selection explicitly. This is independent
             * from the browser text selection and remains active for the next
             * formatting command.
             */
            this.tableSelection = logicalSelection;
            this.selectedTableCell = logicalSelectedCell;

            browserSelection?.removeAllRanges();

            for (const range of savedRanges) {
                try {
                    browserSelection?.addRange(range);
                } catch {
                    // The previous range can be invalid after DOM formatting.
                }
            }
        }

        this.#updateDocumentStatistics();
        this.#refreshTableSelection(preview, block);
        this.#updateTableToolbar(preview, block);

        return true;
    }

    #applyTableCellStyle(preview, block, property, value) {
        const selectedCells = this.#getSelectedTableCells(block);

        if (!selectedCells.length) {
            return;
        }

        this.#remember();

        const logicalSelection = this.tableSelection
            ? { ...this.tableSelection }
            : null;
        const logicalSelectedCell = this.selectedTableCell
            ? { ...this.selectedTableCell }
            : null;

        for (const { cell } of selectedCells) {
            cell.properties ??= {};
            cell.properties[property] = value;
        }

        this.tableSelection = logicalSelection;
        this.selectedTableCell = logicalSelectedCell;

        const bounds = this.#getTableSelectionBounds(block);

        if (!bounds) {
            return;
        }

        preview.querySelectorAll('th, td').forEach(cellElement => {
            const rowIndex = Number(cellElement.dataset.rowIndex);
            const columnIndex = Number(cellElement.dataset.columnIndex);

            if (
                rowIndex < bounds.minRow
                || rowIndex > bounds.maxRow
                || columnIndex < bounds.minColumn
                || columnIndex > bounds.maxColumn
            ) {
                return;
            }

            const logicalCell =
                block.rows?.[rowIndex]?.[columnIndex];
            const logicalProperties =
                logicalCell?.properties ?? {};

            if (property === 'textAlign') {
                cellElement.style.textAlign = value;
            } else if (property === 'verticalAlign') {
                cellElement.style.verticalAlign = value;
            } else if (property === 'color') {
                cellElement.style.color = value;
            } else if (property === 'backgroundColor') {
                cellElement.style.backgroundColor = value;
            } else if (property === 'borderWidth') {
                cellElement.style.borderWidth = `${value}px`;
            } else if (property === 'borderStyle') {
                cellElement.style.borderStyle = value;
            } else if (property === 'borderColor') {
                cellElement.style.borderColor = value;
            } else if (property === 'padding') {
                cellElement.style.padding = `${value}px`;
            } else if (property === 'borderTopEnabled') {
                cellElement.style.borderTopStyle = value
                    ? logicalProperties.borderStyle
                        || block.properties?.borderStyle
                        || 'solid'
                    : 'hidden';
            } else if (property === 'borderRightEnabled') {
                cellElement.style.borderRightStyle = value
                    ? logicalProperties.borderStyle
                        || block.properties?.borderStyle
                        || 'solid'
                    : 'hidden';
            } else if (property === 'borderBottomEnabled') {
                cellElement.style.borderBottomStyle = value
                    ? logicalProperties.borderStyle
                        || block.properties?.borderStyle
                        || 'solid'
                    : 'hidden';
            } else if (property === 'borderLeftEnabled') {
                cellElement.style.borderLeftStyle = value
                    ? logicalProperties.borderStyle
                        || block.properties?.borderStyle
                        || 'solid'
                    : 'hidden';
            }

            /*
             * A common border style change must not reactivate sides that
             * were explicitly disabled on this cell.
             */
            if (
                property === 'borderStyle'
                || property === 'borderWidth'
                || property === 'borderColor'
            ) {
                if (logicalProperties.borderTopEnabled === false) {
                    cellElement.style.borderTopStyle = 'hidden';
                }
                if (logicalProperties.borderRightEnabled === false) {
                    cellElement.style.borderRightStyle = 'hidden';
                }
                if (logicalProperties.borderBottomEnabled === false) {
                    cellElement.style.borderBottomStyle = 'hidden';
                }
                if (logicalProperties.borderLeftEnabled === false) {
                    cellElement.style.borderLeftStyle = 'hidden';
                }
            }
        });
    }

    #clearSelectedTableCellContents(preview, block) {
        const selectedCells = this.#getSelectedTableCells(block);

        /*
         * A single focused contenteditable cell keeps normal text-editor
         * Delete semantics. This command is specifically for a logical
         * multi-cell selection.
         */
        if (selectedCells.length <= 1) {
            return false;
        }

        this.#remember();

        for (const { cell } of selectedCells) {
            cell.content = '';

            /*
             * A merged anchor stores its pre-merge content separately so that
             * unmerge can restore it. Clearing the selected anchor must clear
             * that restoration value too, otherwise old text would reappear.
             */
            if (
                cell.properties
                && cell.properties.mergeOriginalContent !== undefined
            ) {
                cell.properties.mergeOriginalContent = '';
            }
        }

        const bounds = this.#getTableSelectionBounds(block);

        if (bounds) {
            preview.querySelectorAll('th, td').forEach(cellElement => {
                const rowIndex =
                    Number(cellElement.dataset.rowIndex);
                const columnIndex =
                    Number(cellElement.dataset.columnIndex);

                if (
                    rowIndex < bounds.minRow
                    || rowIndex > bounds.maxRow
                    || columnIndex < bounds.minColumn
                    || columnIndex > bounds.maxColumn
                ) {
                    return;
                }

                const cell =
                    block.rows?.[rowIndex]?.[columnIndex];

                if (!cell?.properties?.mergedInto) {
                    cellElement.innerHTML = '';
                }
            });
        }

        this.#updateDocumentStatistics();
        this.#refreshTableSelection(preview, block);
        this.#updateTableToolbar(preview, block);

        return true;
    }

    #refreshTableSelection(preview, block) {
        const bounds = this.#getTableSelectionBounds(block);

        preview.querySelectorAll('.vhd-table-cell-selected')
            .forEach(item => item.classList.remove('vhd-table-cell-selected'));

        if (!bounds) {
            return;
        }

        preview.querySelectorAll('th, td').forEach(cellElement => {
            const rowIndex = Number(cellElement.dataset.rowIndex);
            const columnIndex = Number(cellElement.dataset.columnIndex);

            if (
                rowIndex >= bounds.minRow
                && rowIndex <= bounds.maxRow
                && columnIndex >= bounds.minColumn
                && columnIndex <= bounds.maxColumn
            ) {
                cellElement.classList.add('vhd-table-cell-selected');
            }
        });
    }

    #getTableLogicalCellFromPoint(preview, block, clientX, clientY) {
        const table = preview.querySelector('table');

        if (!(table instanceof HTMLTableElement)) {
            return null;
        }

        const rowCount = block.rows?.length ?? 0;
        const columnCount = block.rows?.[0]?.length ?? 0;

        if (!rowCount || !columnCount) {
            return null;
        }

        const tableRect = table.getBoundingClientRect();

        if (
            clientX < tableRect.left
            || clientX > tableRect.right
            || clientY < tableRect.top
            || clientY > tableRect.bottom
        ) {
            return null;
        }

        /*
         * Resolve the logical row from the rendered <tr> geometry instead of
         * the DOM cell under the pointer. A rowspan can visually cover several
         * logical rows while only exposing the merge anchor as a DOM cell.
         */
        const renderedRows = Array.from(table.rows ?? []);
        let rowIndex = renderedRows.findIndex(row => {
            const rect = row.getBoundingClientRect();

            return clientY >= rect.top && clientY <= rect.bottom;
        });

        if (rowIndex < 0) {
            /*
             * Border rounding can leave a sub-pixel gap between adjacent row
             * rectangles. Fall back to the nearest rendered row.
             */
            let nearestDistance = Number.POSITIVE_INFINITY;

            renderedRows.forEach((row, index) => {
                const rect = row.getBoundingClientRect();
                const center = rect.top + rect.height / 2;
                const distance = Math.abs(clientY - center);

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    rowIndex = index;
                }
            });
        }

        rowIndex = Math.max(
            0,
            Math.min(rowCount - 1, rowIndex)
        );

        /*
         * Resolve the logical column from VHD's percentage column widths.
         * This is independent from colspan and therefore still identifies
         * every logical column inside a visually merged cell.
         */
        const widths = this.#normalizeTableColumnWidths(block);
        const relativeX = Math.max(
            0,
            Math.min(
                tableRect.width,
                clientX - tableRect.left
            )
        );
        const percentX = tableRect.width > 0
            ? relativeX / tableRect.width * 100
            : 0;

        let cumulative = 0;
        let columnIndex = columnCount - 1;

        for (
            let index = 0;
            index < columnCount;
            index += 1
        ) {
            cumulative += widths[index] ?? 0;

            if (percentX <= cumulative || index === columnCount - 1) {
                columnIndex = index;
                break;
            }
        }

        return {
            rowIndex,
            columnIndex
        };
    }

    #beginTableCellDrag(preview, block, rowIndex, columnIndex, event) {
        if (event.button !== 0 || event.shiftKey) {
            return;
        }

        this.tableCellDrag = {
            preview,
            block,
            anchorRow: rowIndex,
            anchorColumn: columnIndex,
            startX: event.clientX,
            startY: event.clientY,
            pointerId: event.pointerId,
            dragging: false
        };

        const onMove = moveEvent => {
            const drag = this.tableCellDrag;

            if (
                !drag
                || drag.pointerId !== moveEvent.pointerId
            ) {
                return;
            }

            const distance = Math.hypot(
                moveEvent.clientX - drag.startX,
                moveEvent.clientY - drag.startY
            );

            if (!drag.dragging && distance < 6) {
                return;
            }

            const logicalTarget =
                this.#getTableLogicalCellFromPoint(
                    preview,
                    block,
                    moveEvent.clientX,
                    moveEvent.clientY
                );

            if (!logicalTarget) {
                return;
            }

            const crossedCellBoundary =
                logicalTarget.rowIndex !== drag.anchorRow
                || logicalTarget.columnIndex !== drag.anchorColumn;

            /*
             * Remaining inside the starting cell is interpreted as native
             * text selection. Do not prevent the browser gesture and do not
             * clear its Selection.
             */
            if (!drag.dragging && !crossedCellBoundary) {
                return;
            }

            if (!drag.dragging) {
                drag.dragging = true;
                preview.classList.add('vhd-table-selecting-cells');

                /*
                 * The pointer has crossed a logical cell boundary: from this
                 * point the gesture becomes rectangular cell selection.
                 * Clear any native text range that may have been started in
                 * the anchor cell.
                 */
                window.getSelection()?.removeAllRanges();

                this.#setTableSelection(
                    block,
                    drag.anchorRow,
                    drag.anchorColumn,
                    false
                );
            }

            moveEvent.preventDefault();

            this.#setTableSelection(
                block,
                logicalTarget.rowIndex,
                logicalTarget.columnIndex,
                true
            );

            this.#refreshTableSelection(preview, block);
            this.#updateTableToolbar(preview, block);
        };

        const onEnd = endEvent => {
            const drag = this.tableCellDrag;

            if (
                !drag
                || drag.pointerId !== endEvent.pointerId
            ) {
                return;
            }

            document.removeEventListener('pointermove', onMove, true);
            document.removeEventListener('pointerup', onEnd, true);
            document.removeEventListener('pointercancel', onEnd, true);

            preview.classList.remove('vhd-table-selecting-cells');

            if (drag.dragging) {
                endEvent.preventDefault();
                window.getSelection()?.removeAllRanges();

                this.#refreshTableSelection(preview, block);
                this.#updateTableToolbar(preview, block);
            }

            this.tableCellDrag = null;
        };

        document.addEventListener('pointermove', onMove, true);
        document.addEventListener('pointerup', onEnd, true);
        document.addEventListener('pointercancel', onEnd, true);
    }

    #createTableResizeLayer(preview, block, tableScroll, table) {
        const widths = this.#normalizeTableColumnWidths(block);

        if (widths.length <= 1) {
            return null;
        }

        const layer = document.createElement('div');
        layer.className = 'vhd-table-resize-layer';
        layer.setAttribute('aria-hidden', 'true');

        const updateLayerGeometry = () => {
            const width = Math.max(
                table.offsetWidth,
                tableScroll.clientWidth
            );

            layer.style.width = `${width}px`;
            layer.style.height = `${table.offsetHeight}px`;
        };

        const applyWidths = () => {
            const current = this.#normalizeTableColumnWidths(block);
            const cols = Array.from(
                table.querySelectorAll(':scope > colgroup > col')
            );

            current.forEach((width, index) => {
                if (cols[index]) {
                    cols[index].style.width = `${width}%`;
                }
            });

            let cumulative = 0;

            layer.querySelectorAll('.vhd-table-column-resize-handle')
                .forEach((handle, index) => {
                    cumulative += current[index] ?? 0;
                    handle.style.left = `${cumulative}%`;
                });

            this.#applyTableColumnWidths(preview, block);
        };

        for (let index = 0; index < widths.length - 1; index += 1) {
            const handle = document.createElement('span');
            handle.className = 'vhd-table-column-resize-handle';
            handle.dataset.columnIndex = String(index);
            handle.title = this.t.properties.tableResizeColumn;

            const cumulative = widths
                .slice(0, index + 1)
                .reduce((sum, value) => sum + value, 0);

            handle.style.left = `${cumulative}%`;

            handle.addEventListener('pointerdown', event => {
                if (event.button !== 0) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                const current = this.#normalizeTableColumnWidths(block);
                const leftWidth = current[index];
                const rightWidth = current[index + 1];
                const pairTotal = leftWidth + rightWidth;
                const tableWidth = table.getBoundingClientRect().width || 1;

                this.#remember();

                this.tableColumnResize = {
                    block,
                    preview,
                    index,
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    leftWidth,
                    rightWidth,
                    pairTotal,
                    tableWidth
                };

                preview.classList.add('vhd-table-resizing-column');
                handle.classList.add('is-resizing');
                handle.setPointerCapture?.(event.pointerId);

                const onMove = moveEvent => {
                    const resize = this.tableColumnResize;

                    if (
                        !resize
                        || resize.pointerId !== moveEvent.pointerId
                    ) {
                        return;
                    }

                    moveEvent.preventDefault();

                    const deltaPercent =
                        (
                            moveEvent.clientX - resize.startX
                        )
                        / resize.tableWidth
                        * 100;

                    const minWidth = 5;
                    const nextLeft = Math.min(
                        resize.pairTotal - minWidth,
                        Math.max(
                            minWidth,
                            resize.leftWidth + deltaPercent
                        )
                    );
                    const nextRight = resize.pairTotal - nextLeft;

                    const next = this.#normalizeTableColumnWidths(block)
                        .slice();

                    next[index] = nextLeft;
                    next[index + 1] = nextRight;
                    block.properties.columnWidths = next;

                    applyWidths();
                };

                const onEnd = endEvent => {
                    const resize = this.tableColumnResize;

                    if (
                        !resize
                        || resize.pointerId !== endEvent.pointerId
                    ) {
                        return;
                    }

                    handle.releasePointerCapture?.(endEvent.pointerId);
                    handle.removeEventListener('pointermove', onMove);
                    handle.removeEventListener('pointerup', onEnd);
                    handle.removeEventListener('pointercancel', onEnd);

                    preview.classList.remove('vhd-table-resizing-column');
                    handle.classList.remove('is-resizing');
                    this.tableColumnResize = null;

                    applyWidths();
                };

                handle.addEventListener('pointermove', onMove);
                handle.addEventListener('pointerup', onEnd);
                handle.addEventListener('pointercancel', onEnd);
            });

            layer.append(handle);
        }

        requestAnimationFrame(() => {
            updateLayerGeometry();
            applyWidths();
        });

        tableScroll.addEventListener('scroll', updateLayerGeometry, {
            passive: true
        });

        return layer;
    }

    #normalizeTableColumnWidths(block) {
        const columnCount = Math.max(
            1,
            block.rows?.[0]?.length ?? 1
        );

        block.properties ??= {};
        let widths = Array.isArray(block.properties.columnWidths)
            ? block.properties.columnWidths
                .slice(0, columnCount)
                .map(value => Number(value))
            : [];

        if (
            widths.length !== columnCount
            || widths.some(value => !Number.isFinite(value) || value <= 0)
        ) {
            const base = 100 / columnCount;
            widths = Array.from(
                { length: columnCount },
                (_, index) => index === columnCount - 1
                    ? 100 - (base * (columnCount - 1))
                    : base
            );
        }

        const total = widths.reduce((sum, value) => sum + value, 0);

        if (!Number.isFinite(total) || total <= 0) {
            const base = 100 / columnCount;
            widths = Array.from(
                { length: columnCount },
                (_, index) => index === columnCount - 1
                    ? 100 - (base * (columnCount - 1))
                    : base
            );
        } else if (Math.abs(total - 100) > 0.01) {
            widths = widths.map(value => (value / total) * 100);
        }

        block.properties.columnWidths = widths;
        return widths;
    }

    #setTableColumnWidth(block, columnIndex, requestedWidth) {
        const widths = this.#normalizeTableColumnWidths(block);
        const columnCount = widths.length;

        if (columnCount === 1) {
            block.properties.columnWidths = [100];
            return;
        }

        const maxWidth = 95;
        const minWidth = 5;
        const width = Math.min(
            maxWidth,
            Math.max(minWidth, Number(requestedWidth) || minWidth)
        );
        const remaining = 100 - width;
        const otherIndexes = widths
            .map((_, index) => index)
            .filter(index => index !== columnIndex);

        const currentOtherTotal = otherIndexes.reduce(
            (sum, index) => sum + widths[index],
            0
        );

        const next = widths.slice();
        next[columnIndex] = width;

        if (currentOtherTotal > 0) {
            for (const index of otherIndexes) {
                next[index] =
                    remaining * (widths[index] / currentOtherTotal);
            }
        } else {
            const equal = remaining / otherIndexes.length;
            for (const index of otherIndexes) {
                next[index] = equal;
            }
        }

        block.properties.columnWidths = next;
    }

    #resetTableColumnWidths(block) {
        const columnCount = Math.max(
            1,
            block.rows?.[0]?.length ?? 1
        );
        const base = 100 / columnCount;

        block.properties ??= {};
        block.properties.columnWidths = Array.from(
            { length: columnCount },
            (_, index) => index === columnCount - 1
                ? 100 - (base * (columnCount - 1))
                : base
        );
    }

    #getTableMergeDescriptors(block) {
        const merges = [];

        (block.rows ?? []).forEach((row, rowIndex) => {
            (row ?? []).forEach((cell, columnIndex) => {
                const properties = cell?.properties ?? {};
                const rowspan = Math.max(
                    1,
                    Number(properties.rowspan ?? 1)
                );
                const colspan = Math.max(
                    1,
                    Number(properties.colspan ?? 1)
                );

                if (rowspan <= 1 && colspan <= 1) {
                    return;
                }

                merges.push({
                    row: rowIndex,
                    column: columnIndex,
                    rowspan,
                    colspan,
                    content: String(cell.content ?? ''),
                    properties: { ...properties }
                });
            });
        });

        return merges;
    }

    #clearTableMergeMetadata(block) {
        for (const row of block.rows ?? []) {
            for (const cell of row ?? []) {
                if (!cell) {
                    continue;
                }

                cell.properties ??= {};
                delete cell.properties.rowspan;
                delete cell.properties.colspan;
                delete cell.properties.mergedInto;
            }
        }
    }

    #applyTableMergeDescriptor(block, merge) {
        const anchor =
            block.rows?.[merge.row]?.[merge.column];

        if (!anchor) {
            return;
        }

        const rowspan = Math.max(1, Number(merge.rowspan));
        const colspan = Math.max(1, Number(merge.colspan));

        if (rowspan <= 1 && colspan <= 1) {
            return;
        }

        /*
         * If deletion moved the merge anchor, keep the currently visible
         * merged content while preserving the new anchor's underlying content
         * for a later unmerge.
         */
        if (merge.anchorMoved) {
            const originalContent = String(anchor.content ?? '');
            const originalProperties = { ...(anchor.properties ?? {}) };

            anchor.content = merge.content;
            anchor.properties = {
                ...originalProperties,
                ...merge.properties,
                mergeOriginalContent: originalContent,
                mergeOriginalProperties: originalProperties
            };
        } else {
            anchor.content = merge.content;
            anchor.properties = {
                ...(anchor.properties ?? {}),
                ...merge.properties
            };
        }

        delete anchor.properties.mergedInto;
        anchor.properties.rowspan = rowspan;
        anchor.properties.colspan = colspan;

        for (
            let rowIndex = merge.row;
            rowIndex < merge.row + rowspan;
            rowIndex += 1
        ) {
            for (
                let columnIndex = merge.column;
                columnIndex < merge.column + colspan;
                columnIndex += 1
            ) {
                if (
                    rowIndex === merge.row
                    && columnIndex === merge.column
                ) {
                    continue;
                }

                const cell =
                    block.rows?.[rowIndex]?.[columnIndex];

                if (!cell) {
                    continue;
                }

                cell.properties ??= {};
                delete cell.properties.rowspan;
                delete cell.properties.colspan;
                cell.properties.mergedInto = {
                    row: merge.row,
                    column: merge.column
                };
            }
        }
    }

    #cloneTableRowFormatting(block, sourceRowIndex) {
        const sourceRow = block.rows?.[sourceRowIndex];

        if (!sourceRow) {
            const columnCount = Math.max(
                1,
                block.rows?.[0]?.length ?? 1
            );

            return Array.from(
                { length: columnCount },
                () => ({ content: '', properties: {} })
            );
        }

        return sourceRow.map(cell => {
            const sourceProperties = {
                ...(cell?.properties ?? {})
            };

            /*
             * Only visual/content formatting is inherited. Merge topology is
             * structural and must never be copied into a newly created row.
             */
            delete sourceProperties.rowspan;
            delete sourceProperties.colspan;
            delete sourceProperties.mergedInto;
            delete sourceProperties.mergeOriginalContent;
            delete sourceProperties.mergeOriginalProperties;

            return {
                content: '',
                properties: sourceProperties
            };
        });
    }

    #insertTableRow(block, insertionIndex) {
        const columnCount = Math.max(
            1,
            block.rows?.[0]?.length ?? 1
        );
        const merges = this.#getTableMergeDescriptors(block);

        this.#clearTableMergeMetadata(block);

        block.rows.splice(
            insertionIndex,
            0,
            Array.from(
                { length: columnCount },
                () => ({ content: '', properties: {} })
            )
        );

        for (const merge of merges) {
            const mergeStart = merge.row;
            const mergeEndExclusive =
                merge.row + merge.rowspan;

            if (insertionIndex <= mergeStart) {
                /*
                 * The new row is inserted before the merge, so the anchor and
                 * all covered logical coordinates move down by one row.
                 */
                merge.row += 1;
            } else if (
                insertionIndex > mergeStart
                && insertionIndex < mergeEndExclusive
            ) {
                /*
                 * Insertion occurs inside the merged vertical span. The new
                 * logical row becomes part of the merge.
                 */
                merge.rowspan += 1;
            }

            this.#applyTableMergeDescriptor(block, merge);
        }
    }

    #insertTableColumn(block, insertionIndex) {
        const merges = this.#getTableMergeDescriptors(block);

        this.#clearTableMergeMetadata(block);

        for (const row of block.rows ?? []) {
            row.splice(
                insertionIndex,
                0,
                { content: '', properties: {} }
            );
        }

        for (const merge of merges) {
            const mergeStart = merge.column;
            const mergeEndExclusive =
                merge.column + merge.colspan;

            if (insertionIndex <= mergeStart) {
                /*
                 * The new column is before the merge. Move the anchor and all
                 * covered logical coordinates one column to the right.
                 */
                merge.column += 1;
            } else if (
                insertionIndex > mergeStart
                && insertionIndex < mergeEndExclusive
            ) {
                /*
                 * Insertion occurs inside the merged horizontal span. The new
                 * logical column becomes part of the merge.
                 */
                merge.colspan += 1;
            }

            this.#applyTableMergeDescriptor(block, merge);
        }

        this.#resetTableColumnWidths(block);
    }

    #removeTableRow(block, rowIndex) {
        const merges = this.#getTableMergeDescriptors(block);

        this.#clearTableMergeMetadata(block);
        block.rows.splice(rowIndex, 1);

        for (const merge of merges) {
            const endRow = merge.row + merge.rowspan - 1;

            if (rowIndex < merge.row) {
                merge.row -= 1;
            } else if (
                rowIndex >= merge.row
                && rowIndex <= endRow
            ) {
                merge.rowspan -= 1;

                if (rowIndex === merge.row) {
                    merge.anchorMoved = true;
                    /*
                     * The row immediately below the removed anchor now occupies
                     * the same logical row index.
                     */
                }
            }

            if (merge.rowspan <= 0) {
                continue;
            }

            this.#applyTableMergeDescriptor(block, merge);
        }
    }

    #removeTableColumn(block, columnIndex) {
        const merges = this.#getTableMergeDescriptors(block);

        this.#clearTableMergeMetadata(block);

        for (const row of block.rows ?? []) {
            row.splice(columnIndex, 1);
        }

        for (const merge of merges) {
            const endColumn =
                merge.column + merge.colspan - 1;

            if (columnIndex < merge.column) {
                merge.column -= 1;
            } else if (
                columnIndex >= merge.column
                && columnIndex <= endColumn
            ) {
                merge.colspan -= 1;

                if (columnIndex === merge.column) {
                    merge.anchorMoved = true;
                    /*
                     * The cell immediately to the right of the removed anchor
                     * now occupies the same logical column index.
                     */
                }
            }

            if (merge.colspan <= 0) {
                continue;
            }

            this.#applyTableMergeDescriptor(block, merge);
        }

        this.#resetTableColumnWidths(block);
    }

    #tableStructureAction(block, action) {
        const selected = this.selectedTableCell;

        if (!selected || selected.block !== block) {
            return;
        }

        const rowIndex = selected.rowIndex;
        const columnIndex = selected.columnIndex;
        const rowCount = block.rows?.length ?? 0;
        const columnCount = block.rows?.[0]?.length ?? 0;

        if (
            action === 'remove-row'
            && rowCount <= 1
        ) {
            return;
        }

        if (
            action === 'remove-column'
            && columnCount <= 1
        ) {
            return;
        }

        this.#remember();

        if (action === 'row-above' || action === 'row-below') {
            const insertionIndex =
                rowIndex + (action === 'row-below' ? 1 : 0);

            this.#insertTableRow(block, insertionIndex);
        } else if (action === 'remove-row') {
            this.#removeTableRow(block, rowIndex);
        } else if (
            action === 'column-left'
            || action === 'column-right'
        ) {
            const insertionIndex =
                columnIndex + (action === 'column-right' ? 1 : 0);

            this.#insertTableColumn(block, insertionIndex);
        } else if (action === 'remove-column') {
            this.#removeTableColumn(block, columnIndex);
        }

        this.selectedTableCell = null;
        this.tableSelection = null;
        this.render();
    }

    #applyTableColumnWidths(preview, block) {
        const widths = this.#normalizeTableColumnWidths(block);
        const cols = Array.from(
            preview.querySelectorAll('.vhd-table > colgroup > col')
        );

        widths.forEach((width, index) => {
            if (cols[index]) {
                cols[index].style.width = `${width}%`;
            }
        });

        const widthInput = preview.querySelector(
            '.vhd-table-toolbar-width-input'
        );

        const selected = this.selectedTableCell;

        if (
            widthInput
            && selected
            && selected.block === block
        ) {
            widthInput.value = String(
                Math.round(widths[selected.columnIndex] ?? 100)
            );
        }
    }

    #createTableToolbar(preview, block) {
        const toolbar = document.createElement('div');
        toolbar.className = 'vhd-table-toolbar';
        toolbar.hidden = true;
        toolbar.setAttribute('role', 'toolbar');
        toolbar.setAttribute(
            'aria-label',
            this.t.properties.tableContextMenu
        );

        const icon = path => `
            <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                aria-hidden="true"
                focusable="false"
            >
                ${path}
            </svg>
        `;

        const button = (svg, title, action) => {
            const control = document.createElement('button');
            control.type = 'button';
            control.className = 'vhd-table-toolbar-button';
            control.innerHTML = svg;
            control.title = title;
            control.setAttribute('aria-label', title);

            control.addEventListener('pointerdown', event => {
                /*
                 * Keep the current table cell/caret as the active context
                 * while using toolbar controls.
                 */
                event.preventDefault();
                event.stopPropagation();
            });

            control.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                action();
            });

            return control;
        };

        const separator = () => {
            const item = document.createElement('span');
            item.className = 'vhd-table-toolbar-separator';
            item.setAttribute('aria-hidden', 'true');
            return item;
        };

        const rowAbove = button(
            icon(`
                <path d="M4 7h16M4 13h16M4 19h16"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round"/>
                <path d="M12 2v6M9 5h6"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round"/>
            `),
            this.t.properties.tableAddRowAbove,
            () => this.#tableStructureAction(block, 'row-above')
        );
        const rowBelow = button(
            icon(`
                <path d="M4 5h16M4 11h16M4 17h16"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round"/>
                <path d="M12 16v6M9 19h6"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round"/>
            `),
            this.t.properties.tableAddRowBelow,
            () => this.#tableStructureAction(block, 'row-below')
        );
        const removeRow = button(
            icon(`
                <path d="M4 6h16M4 18h16"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round"/>
                <rect x="4" y="9" width="16" height="6" rx="1"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8"/>
                <path d="M8 12h8"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round"/>
            `),
            this.t.properties.tableRemoveCurrentRow,
            () => this.#tableStructureAction(block, 'remove-row')
        );

        const columnLeft = button(
            icon(`
                <path d="M7 4v16M13 4v16M19 4v16"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round"/>
                <path d="M2 12h6M5 9v6"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round"/>
            `),
            this.t.properties.tableAddColumnLeft,
            () => this.#tableStructureAction(block, 'column-left')
        );
        const columnRight = button(
            icon(`
                <path d="M5 4v16M11 4v16M17 4v16"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round"/>
                <path d="M16 12h6M19 9v6"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round"/>
            `),
            this.t.properties.tableAddColumnRight,
            () => this.#tableStructureAction(block, 'column-right')
        );
        const removeColumn = button(
            icon(`
                <path d="M6 4v16M18 4v16"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round"/>
                <rect x="9" y="4" width="6" height="16" rx="1"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8"/>
                <path d="M10.5 12h3"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round"/>
            `),
            this.t.properties.tableRemoveCurrentColumn,
            () => this.#tableStructureAction(block, 'remove-column')
        );

        const equalColumns = button(
            icon(`
                <rect x="3" y="5" width="18" height="14" rx="1"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8"/>
                <path d="M9 5v14M15 5v14"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8"/>
            `),
            this.t.properties.tableEqualColumns,
            () => {
                this.#remember();
                this.#resetTableColumnWidths(block);
                this.#applyTableColumnWidths(preview, block);
            }
        );

        const mergeCells = button(
            icon(`
                <rect x="3" y="4" width="18" height="16" rx="1"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8"/>
                <path d="M12 7v10M7 12h10"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round"/>
            `),
            this.t.properties.tableMergeCells,
            () => this.#mergeTableSelection(block)
        );

        const unmergeCell = button(
            icon(`
                <rect x="3" y="4" width="18" height="16" rx="1"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8"/>
                <path d="M12 4v16M3 12h18"
                    fill="none" stroke="currentColor"
                    stroke-width="1.8"/>
                <path d="M8 8l-2-2M16 16l2 2"
                    fill="none" stroke="currentColor"
                    stroke-width="1.6" stroke-linecap="round"/>
            `),
            this.t.properties.tableUnmergeCell,
            () => this.#unmergeTableCell(block)
        );

        const widthField = document.createElement('label');
        widthField.className = 'vhd-table-toolbar-width';
        widthField.title = this.t.properties.tableColumnWidth;

        const widthLabel = document.createElement('span');
        widthLabel.className = 'vhd-table-toolbar-width-label';
        widthLabel.textContent = this.t.properties.tableColumnWidthShort;

        const widthInput = document.createElement('input');
        widthInput.type = 'number';
        widthInput.className = 'vhd-table-toolbar-width-input';
        widthInput.min = '5';
        widthInput.max = '95';
        widthInput.step = '1';
        widthInput.inputMode = 'numeric';

        const percent = document.createElement('span');
        percent.textContent = '%';

        let widthEditStarted = false;

        const rememberWidthStart = () => {
            if (!widthEditStarted) {
                this.#remember();
                widthEditStarted = true;
            }
        };

        widthInput.addEventListener('pointerdown', event => {
            event.stopPropagation();
            rememberWidthStart();
        });

        widthInput.addEventListener('focus', event => {
            event.stopPropagation();
            rememberWidthStart();
        });

        widthInput.addEventListener('keydown', event => {
            event.stopPropagation();
        });

        /*
         * Important: update the colgroup directly instead of calling render().
         * The toolbar therefore stays open while using the number input arrows.
         */
        widthInput.addEventListener('input', event => {
            event.stopPropagation();

            const selected = this.selectedTableCell;

            if (!selected || selected.block !== block) {
                return;
            }

            rememberWidthStart();

            this.#setTableColumnWidth(
                block,
                selected.columnIndex,
                widthInput.value
            );
            this.#applyTableColumnWidths(preview, block);
        });

        widthInput.addEventListener('change', () => {
            widthEditStarted = false;
        });

        widthInput.addEventListener('blur', () => {
            widthEditStarted = false;
        });

        widthField.append(widthLabel, widthInput, percent);

        toolbar.append(
            rowAbove,
            rowBelow,
            removeRow,
            separator(),
            columnLeft,
            columnRight,
            removeColumn,
            separator(),
            widthField,
            equalColumns,
            separator(),
            mergeCells,
            unmergeCell
        );

        toolbar._vhdControls = {
            rowAbove,
            rowBelow,
            removeRow,
            columnLeft,
            columnRight,
            removeColumn,
            equalColumns,
            widthInput,
            mergeCells,
            unmergeCell
        };

        return toolbar;
    }

    #updateTableToolbar(preview, block) {
        const toolbar = preview.querySelector('.vhd-table-toolbar');

        if (!toolbar) {
            return;
        }

        const selected = this.selectedTableCell;
        const active = Boolean(
            selected
            && selected.block === block
        );

        toolbar.hidden = !active;

        if (!active) {
            return;
        }

        const rowCount = block.rows?.length ?? 0;
        const columnCount = block.rows?.[0]?.length ?? 0;
        const widths = this.#normalizeTableColumnWidths(block);
        const controls = toolbar._vhdControls;
        const selectedCells = this.#getSelectedTableCells(block);
        const multiple = selectedCells.length > 1;
        const bounds = this.#getTableSelectionBounds(block);
        const wholeRowSelection = Boolean(
            bounds
            && bounds.minRow === bounds.maxRow
            && bounds.minColumn === 0
            && bounds.maxColumn === columnCount - 1
        );
        const wholeColumnSelection = Boolean(
            bounds
            && bounds.minColumn === bounds.maxColumn
            && bounds.minRow === 0
            && bounds.maxRow === rowCount - 1
        );
        const selectedMerge = this.#getTableMergeAnchor(
            block,
            selected.rowIndex,
            selected.columnIndex
        );

        if (!controls) {
            return;
        }

        /*
         * A free multi-cell rectangle remains ambiguous for structural
         * operations. A complete row or complete column selection is not:
         * keep the matching add/remove actions available.
         */
        controls.rowAbove.disabled =
            multiple && !wholeRowSelection;
        controls.rowBelow.disabled =
            multiple && !wholeRowSelection;
        controls.removeRow.disabled =
            rowCount <= 1
            || (multiple && !wholeRowSelection);

        controls.columnLeft.disabled =
            multiple && !wholeColumnSelection;
        controls.columnRight.disabled =
            multiple && !wholeColumnSelection;
        controls.removeColumn.disabled =
            columnCount <= 1
            || (multiple && !wholeColumnSelection);

        controls.equalColumns.disabled = multiple;
        controls.widthInput.disabled =
            multiple || columnCount <= 1;
        controls.mergeCells.disabled =
            !this.#canMergeTableSelection(block);
        controls.unmergeCell.disabled = !selectedMerge;
        controls.widthInput.min = columnCount <= 1 ? '100' : '5';
        controls.widthInput.max = columnCount <= 1 ? '100' : '95';

        if (!multiple) {
            controls.widthInput.value = String(
                Math.round(widths[selected.columnIndex] ?? 100)
            );
        }
    }

    #cleanTableCellContent(value) {
        const template = document.createElement('template');
        template.innerHTML = String(value ?? '');

        template.content
            .querySelectorAll('.vhd-table-cell-menu-trigger')
            .forEach(element => element.remove());

        return template.innerHTML;
    }

    #renderTable(preview, block) {
        preview.replaceChildren();

        block.rows ??= [];
        block.properties ??= {};
        const properties = block.properties;
        const hasHeader = properties.header !== false;
        const borderColor = properties.borderColor || '#d8dde5';
        const borderWidth = Math.max(0, Number(properties.borderWidth ?? 1));
        const cellPadding = Math.max(0, Number(properties.cellPadding ?? 8));
        const headerBackground = properties.headerBackground || '#f3f4f6';

        const toolbar = this.#createTableToolbar(preview, block);

        const table = document.createElement('table');
        table.className = 'vhd-table';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.tableLayout = 'fixed';

        const columnWidths = this.#normalizeTableColumnWidths(block);
        const colgroup = document.createElement('colgroup');

        columnWidths.forEach(width => {
            const col = document.createElement('col');
            col.style.width = `${width}%`;
            colgroup.append(col);
        });

        table.append(colgroup);

        block.rows.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');

            row.forEach((cell, columnIndex) => {
                cell ??= { content: '' };
                cell.properties ??= {};

                if (cell.properties.mergedInto) {
                    return;
                }

                const isHeader = hasHeader && rowIndex === 0;
                const td = document.createElement(isHeader ? 'th' : 'td');

                /*
                 * 0.6.67 placed the contextual menu trigger directly inside
                 * the contenteditable cell. That allowed the button to become
                 * part of cell.content and therefore leak into public HTML.
                 * Clean legacy content and keep editor controls as siblings.
                 */
                cell.content = this.#cleanTableCellContent(cell.content);

                const cellBorderWidth = Math.max(
                    0,
                    Number(
                        cell.properties.borderWidth
                        ?? borderWidth
                    )
                );
                const cellBorderStyle = [
                    'solid',
                    'dashed',
                    'dotted',
                    'none'
                ].includes(cell.properties.borderStyle)
                    ? cell.properties.borderStyle
                    : 'solid';
                const cellBorderColor =
                    cell.properties.borderColor
                    || borderColor;

                const cellSpecificPadding = Math.max(
                    0,
                    Number(
                        cell.properties.padding
                        ?? cellPadding
                    )
                );

                td.style.borderWidth = `${cellBorderWidth}px`;
                td.style.borderStyle = cellBorderStyle;
                td.style.borderColor = cellBorderColor;

                /*
                 * `hidden` is intentional here. With border-collapse,
                 * `border-style:none` can still allow the neighbouring
                 * cell's border to win the conflict. `hidden` suppresses
                 * the shared edge reliably.
                 */
                if (cell.properties.borderTopEnabled === false) {
                    td.style.borderTopStyle = 'hidden';
                }
                if (cell.properties.borderRightEnabled === false) {
                    td.style.borderRightStyle = 'hidden';
                }
                if (cell.properties.borderBottomEnabled === false) {
                    td.style.borderBottomStyle = 'hidden';
                }
                if (cell.properties.borderLeftEnabled === false) {
                    td.style.borderLeftStyle = 'hidden';
                }

                td.style.padding = `${cellSpecificPadding}px`;
                td.style.textAlign =
                    cell.properties.textAlign || 'left';
                td.style.verticalAlign =
                    cell.properties.verticalAlign || 'top';
                td.style.color =
                    cell.properties.color || '';
                td.style.backgroundColor =
                    cell.properties.backgroundColor || '';

                if (isHeader) {
                    if (!cell.properties.backgroundColor) {
                        td.style.backgroundColor = headerBackground;
                    }
                    td.scope = 'col';
                }

                td.dataset.rowIndex = String(rowIndex);
                td.dataset.columnIndex = String(columnIndex);

                const rowSpan = Math.max(
                    1,
                    Number(cell.properties.rowspan ?? 1)
                );
                const colSpan = Math.max(
                    1,
                    Number(cell.properties.colspan ?? 1)
                );

                if (rowSpan > 1) {
                    td.rowSpan = rowSpan;
                }

                if (colSpan > 1) {
                    td.colSpan = colSpan;
                }

                td.innerHTML = cell.content || '';
                this.#editable(td, cell, 'content');

                const selectCell = (event, extend = false) => {
                    event?.stopPropagation?.();

                    this.#setTableSelection(
                        block,
                        rowIndex,
                        columnIndex,
                        extend
                    );

                    this.#refreshTableSelection(preview, block);

                    this.#selectProperties(
                        'block',
                        block,
                        preview.closest('.vhd-block')
                    );

                    this.#updateTableToolbar(preview, block);
                };

                /*
                 * Pointer down captures Shift before focus changes. This keeps
                 * the original anchor and creates a rectangular temporary
                 * selection without altering the persisted JSON structure.
                 */
                td.addEventListener('pointerdown', event => {
                    if (event.button !== 0) {
                        return;
                    }

                    selectCell(event, event.shiftKey);

                    if (!event.shiftKey) {
                        /*
                         * Always arm the drag gesture. The drag handler keeps
                         * native text selection while the pointer remains in
                         * the starting logical cell, and only switches to
                         * rectangular cell selection after crossing into a
                         * different logical cell.
                         */
                        this.#beginTableCellDrag(
                            preview,
                            block,
                            rowIndex,
                            columnIndex,
                            event
                        );
                    }
                });

                td.addEventListener('focus', event => {
                    /*
                     * Multi-cell formatting temporarily moves the browser DOM
                     * selection through every selected contenteditable cell.
                     * Those internal focus changes must not collapse the VHD
                     * logical table selection back to one cell.
                     */
                    if (this.isFormattingTableSelection) {
                        return;
                    }

                    const current = this.selectedTableCell;

                    if (
                        !current
                        || current.block !== block
                        || current.rowIndex !== rowIndex
                        || current.columnIndex !== columnIndex
                    ) {
                        selectCell(event, false);
                    }
                });

                td.addEventListener('contextmenu', event => {
                    event.preventDefault();
                    selectCell(event, event.shiftKey);
                });

                /*
                 * Native Tab/Shift+Tab navigation already works between table
                 * cells. Only intercept Tab when the current visible cell
                 * reaches the logical bottom-right corner of the table.
                 */
                td.addEventListener('keydown', event => {
                    if (
                        event.key === 'Delete'
                        && !event.shiftKey
                        && !event.altKey
                        && !event.ctrlKey
                        && !event.metaKey
                    ) {
                        if (
                            this.#clearSelectedTableCellContents(
                                preview,
                                block
                            )
                        ) {
                            event.preventDefault();
                            event.stopPropagation();
                            return;
                        }
                    }

                    if (
                        event.key !== 'Tab'
                        || event.shiftKey
                        || event.altKey
                        || event.ctrlKey
                        || event.metaKey
                    ) {
                        return;
                    }

                    const rowCount = block.rows?.length ?? 0;
                    const columnCount =
                        block.rows?.[0]?.length ?? 0;
                    const reachesLastRow =
                        rowIndex + rowSpan >= rowCount;
                    const reachesLastColumn =
                        columnIndex + colSpan >= columnCount;

                    if (!reachesLastRow || !reachesLastColumn) {
                        return;
                    }

                    event.preventDefault();
                    event.stopPropagation();

                    this.#remember();

                    const inheritedFormatting =
                        this.#cloneTableRowFormatting(
                            block,
                            Math.max(0, rowCount - 1)
                        );

                    this.#insertTableRow(block, rowCount);

                    /*
                     * A row created with Tab should feel like a continuation
                     * of the current table. Reuse the previous row's visual
                     * formatting while starting with empty contents.
                     */
                    block.rows[rowCount] = inheritedFormatting;

                    const nextRowIndex = rowCount;

                    this.tableSelection = {
                        block,
                        anchorRow: nextRowIndex,
                        anchorColumn: 0,
                        focusRow: nextRowIndex,
                        focusColumn: 0
                    };
                    this.selectedTableCell = {
                        block,
                        rowIndex: nextRowIndex,
                        columnIndex: 0
                    };

                    this.render();
                    this.#focusTableCell(
                        block,
                        nextRowIndex,
                        0
                    );
                });

                tr.append(td);
            });

            table.append(tr);
        });

        const tableScroll = document.createElement('div');
        tableScroll.className = 'vhd-table-scroll';
        tableScroll.append(table);

        preview.append(toolbar, tableScroll);

        const selectionLayer = this.#createTableSelectionLayer(
            preview,
            block,
            tableScroll,
            table
        );

        if (selectionLayer) {
            preview.append(selectionLayer);
        }

        const resizeLayer = this.#createTableResizeLayer(
            preview,
            block,
            tableScroll,
            table
        );

        if (resizeLayer) {
            tableScroll.append(resizeLayer);
        }
    }

    #renderResizableImage(preview, block, blockElement) {
        preview.replaceChildren();
        preview.classList.toggle('is-empty', !block.src);

        if (!block.src) {
            return;
        }

        const frame = document.createElement('div');
        frame.className = 'vhd-image-resize-frame';
        frame.style.width = `${Math.min(100, Math.max(1, Number(block.properties?.width ?? 100)))}%`;

        const align = block.properties?.align || 'center';

        if (align === 'left') {
            frame.style.marginLeft = '0';
            frame.style.marginRight = 'auto';
        } else if (align === 'right') {
            frame.style.marginLeft = 'auto';
            frame.style.marginRight = '0';
        } else {
            frame.style.marginLeft = 'auto';
            frame.style.marginRight = 'auto';
        }

        const image = document.createElement('img');
        image.src = block.src;
        image.alt = block.alt || '';
        image.draggable = false;
        image.style.width = '100%';
        image.style.borderRadius = `${block.properties?.borderRadius ?? 4}px`;

        const updateWidthProperty = width => {
            const input = this.propertiesPanel?.querySelector(
                '[data-vhd-property="image-width"]'
            );

            if (input) {
                input.value = String(Math.round(width));
            }
        };

        const createHandle = side => {
            const handle = document.createElement('span');
            handle.className = `vhd-image-resize-handle vhd-image-resize-handle-${side}`;
            handle.dataset.side = side;
            handle.title = this.t.properties.resizeImage;
            handle.setAttribute('aria-hidden', 'true');

            handle.addEventListener('pointerdown', event => {
                if (event.button !== 0) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                this.#remember();

                const startX = event.clientX;
                const startWidth = Number(block.properties?.width ?? 100);
                const containerWidth = preview.clientWidth || 1;
                const direction = side === 'left' ? -1 : 1;

                frame.classList.add('is-resizing');
                handle.setPointerCapture?.(event.pointerId);

                const onMove = moveEvent => {
                    const delta = moveEvent.clientX - startX;
                    const deltaPercent = (delta / containerWidth) * 100 * direction;
                    const width = Math.min(
                        100,
                        Math.max(5, startWidth + deltaPercent)
                    );

                    block.properties.width = Math.round(width);
                    frame.style.width = `${width}%`;
                    updateWidthProperty(width);
                };

                const onEnd = endEvent => {
                    handle.releasePointerCapture?.(endEvent.pointerId);
                    handle.removeEventListener('pointermove', onMove);
                    handle.removeEventListener('pointerup', onEnd);
                    handle.removeEventListener('pointercancel', onEnd);
                    frame.classList.remove('is-resizing');

                    block.properties.width = Math.round(
                        Math.min(100, Math.max(5, Number(block.properties.width)))
                    );
                    frame.style.width = `${block.properties.width}%`;
                    updateWidthProperty(block.properties.width);
                };

                handle.addEventListener('pointermove', onMove);
                handle.addEventListener('pointerup', onEnd);
                handle.addEventListener('pointercancel', onEnd);
            });

            return handle;
        };

        frame.append(
            image,
            createHandle('left'),
            createHandle('right')
        );

        preview.append(frame);
    }

    #renderBlock(block, rowIndex, columnIndex, blockIndex) {
        const wrapper = document.createElement('div');
        wrapper.className = `vhd-block vhd-block-${block.type}`;
        wrapper.dataset.rowIndex = String(rowIndex);
        wrapper.dataset.columnIndex = String(columnIndex);
        wrapper.dataset.blockIndex = String(blockIndex);
        wrapper.append(this.#blockControls(rowIndex, columnIndex, blockIndex));

        const blockDefinition = BlockFactory.get(block.type);

        if (blockDefinition && !blockDefinition.native) {
            const update = (patch = {}, options = {}) => {
                if (!patch || typeof patch !== 'object') {
                    return false;
                }

                this.#remember();
                Object.assign(
                    block,
                    structuredClone(patch),
                    { type: blockDefinition.type }
                );

                this.#emit('change', {
                    source: 'plugin:block',
                    blockId: block.id,
                    type: block.type
                });

                if (options.render !== false) {
                    this.render();
                }

                return true;
            };

            const rendered = blockDefinition.render({
                block: structuredClone(block),
                element: wrapper,
                update,
                render: () => this.render()
            });

            if (rendered instanceof Node) {
                wrapper.append(rendered);
            } else if (typeof rendered === 'string') {
                const container = document.createElement('div');
                container.className = 'vhd-plugin-block-content';
                container.innerHTML = rendered;
                wrapper.append(container);
            } else if (rendered != null) {
                console.warn(
                    `Vanilla HTML Designer: plugin block "${block.type}" render() should return a DOM Node, HTML string or null.`
                );
            }

            wrapper.addEventListener('click', event => {
                event.stopPropagation();
                this.#selectProperties('block', block, wrapper);
            });

            return wrapper;
        }

        if (block.type === 'heading') {
            const heading = document.createElement(`h${block.level || 2}`);
            heading.innerHTML = block.content || '';
            this.#editable(heading, block, 'content');
            wrapper.append(heading);
        }

        if (block.type === 'text') {
            const text = document.createElement('div');
            text.className = 'vhd-editable-text';
            text.dataset.placeholder = this.t.editor.textPlaceholder;
            text.innerHTML = block.content || '';
            this.#editable(text, block, 'content');
            wrapper.append(text);
        }

        if (block.type === 'image') {
            const preview = document.createElement('div');
            preview.className = 'vhd-image-editor';

            this.#renderResizableImage(preview, block, wrapper);
            wrapper.append(preview);
        }

        if (block.type === 'table') {
            const preview = document.createElement('div');
            preview.className = 'vhd-table-editor';
            preview.dataset.blockId = block.id;
            this.#renderTable(preview, block);
            wrapper.append(preview);
        }

        if (block.type === 'button') {
            const editorPreview = document.createElement('div');
            editorPreview.className = 'vhd-button-editor';

            const preview = document.createElement('a');
            preview.className = 'vhd-preview-button';
            preview.href = block.url || '#';
            preview.target = block.properties?.target === '_blank' ? '_blank' : '_self';

            if (preview.target === '_blank') {
                preview.rel = 'noopener noreferrer';
            }

            preview.textContent = block.text || 'Button';
            preview.style.backgroundColor = block.properties?.backgroundColor || '#2563eb';
            preview.style.color = block.properties?.color || '#ffffff';
            preview.style.borderRadius = `${block.properties?.borderRadius ?? 5}px`;
            preview.style.padding = `${block.properties?.paddingVertical ?? 10}px ${block.properties?.paddingHorizontal ?? 16}px`;
            preview.style.display = 'inline-block';
            preview.style.textDecoration = 'none';
            editorPreview.style.textAlign = block.properties?.align || 'left';

            preview.addEventListener('click', event => event.preventDefault());

            editorPreview.append(preview);
            wrapper.append(editorPreview);
        }

        if (block.type === 'divider') {
            const hr = document.createElement('hr');
            hr.style.borderTopColor = block.properties?.color || '#9ca3af';
            hr.style.borderTopWidth = `${block.properties?.width ?? 1}px`;
            hr.style.borderTopStyle = block.properties?.style || 'solid';
            wrapper.append(hr);
        }

        if (block.type === 'spacer') {
            const preview = document.createElement('div');
            preview.className = 'vhd-spacer-preview';
            preview.style.height = `${block.height ?? 32}px`;
            preview.title = `${block.height ?? 32}px`;
            wrapper.append(preview);
        }

        wrapper.addEventListener('click', event => {
            event.stopPropagation();
            this.#selectProperties('block', block, wrapper);
        });

        return wrapper;
    }

    #blockMenu(
        rowIndex,
        columnIndex,
        insertIndex = null,
        placement = 'column'
    ) {
        const wrapper = document.createElement('div');
        wrapper.className = [
            'vhd-block-add',
            'vhd-content-add',
            'vhd-block-insert-point',
            `vhd-block-insert-${placement}`
        ].join(' ');
        wrapper.dataset.insertIndex = String(
            Number.isInteger(insertIndex)
                ? insertIndex
                : ''
        );

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'vhd-add-trigger';
        trigger.textContent = '+';
        trigger.title = this.t.editor.addBlock;
        trigger.setAttribute('aria-label', this.t.editor.addBlock);
        trigger.setAttribute('aria-haspopup', 'true');
        trigger.setAttribute('aria-expanded', 'false');

        const menu = document.createElement('div');
        menu.className = 'vhd-block-add-menu';
        menu.hidden = true;
        menu.setAttribute('role', 'menu');

        const availableTypes = BlockFactory.types.filter(
            type => !this.disabledContentBlocks.has(type)
        );

        for (const type of availableTypes) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'vhd-block-add-item';
            button.setAttribute('role', 'menuitem');
            button.dataset.vhdContentBlock = type;

            const definition = BlockFactory.get(type);
            const label = BlockFactory.getLabel(
                type,
                this.t.blocks
            );

            if (definition?.icon) {
                const icon = document.createElement('span');
                icon.className = 'vhd-block-add-item-icon';
                icon.innerHTML = definition.icon;

                const text = document.createElement('span');
                text.textContent = label;

                button.append(icon, text);
            } else {
                button.textContent = label;
            }

            button.addEventListener('click', () => {
                menu.hidden = true;
                trigger.setAttribute('aria-expanded', 'false');
                this.addBlock(
                    rowIndex,
                    columnIndex,
                    type,
                    insertIndex
                );
            });
            menu.append(button);
        }

        if (!availableTypes.length) {
            wrapper.hidden = true;
            return wrapper;
        }

        trigger.addEventListener('click', event => {
            event.stopPropagation();
            const willOpen = menu.hidden;

            this.root.querySelectorAll('.vhd-block-add-menu').forEach(other => {
                if (other !== menu) {
                    other.hidden = true;
                }
            });

            this.root.querySelectorAll('.vhd-add-trigger').forEach(other => {
                if (other !== trigger) {
                    other.setAttribute('aria-expanded', 'false');
                }
            });

            menu.hidden = !willOpen;
            trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        });

        wrapper.addEventListener('click', event => {
            event.stopPropagation();
        });

        wrapper.append(trigger, menu);
        return wrapper;
    }

    #createRowChooser(insertIndex = null) {
        const chooser = document.createElement('div');
        chooser.className = 'vhd-row-chooser';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'vhd-row-add-trigger';
        trigger.textContent = '+';
        trigger.title = this.t.layout.title;
        trigger.setAttribute('aria-label', this.t.layout.title);
        trigger.setAttribute('aria-haspopup', 'true');
        trigger.setAttribute('aria-expanded', 'false');

        const menu = document.createElement('div');
        menu.className = 'vhd-row-add-menu';
        menu.hidden = true;

        const presets = [
            ['one', [1], this.t.layout.one],
            ['twoEqual', [1, 1], this.t.layout.twoEqual],
            ['twoWideLeft', [2, 1], this.t.layout.twoWideLeft],
            ['twoWideRight', [1, 2], this.t.layout.twoWideRight],
            ['three', [1, 1, 1], this.t.layout.three],
            ['four', [1, 1, 1, 1], this.t.layout.four],
            ['five', [1, 1, 1, 1, 1], this.t.layout.five],
            ['six', [1, 1, 1, 1, 1, 1], this.t.layout.six]
        ].filter(([name]) => !this.disabledSections.has(name));

        if (!presets.length) {
            chooser.hidden = true;
            return chooser;
        }

        for (const [name, widths, title] of presets) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'vhd-row-choice';
            button.title = title;
            button.setAttribute('aria-label', title);

            const preview = document.createElement('span');
            preview.className = 'vhd-layout-preview';

            widths.forEach(width => {
                const cell = document.createElement('span');
                cell.className = 'vhd-layout-preview-cell';
                cell.style.flex = `${width} 1 0`;
                cell.setAttribute('aria-hidden', 'true');
                preview.append(cell);
            });

            button.append(preview);

            button.addEventListener('click', event => {
                event.stopPropagation();
                if (this.disabledSections.has(name)) {
                    return;
                }

                this.#remember();
                const row = this.#populateRowWithDefaultText(Grid.createPreset(name));

                if (insertIndex === null || insertIndex >= this.project.rows.length) {
                    this.project.rows.push(row);
                } else {
                    this.project.rows.splice(insertIndex, 0, row);
                }

                this.render();
            });

            menu.append(button);
        }

        trigger.addEventListener('click', event => {
            event.stopPropagation();
            const open = menu.hidden;
            this.root.querySelectorAll('.vhd-row-add-menu').forEach(other => {
                other.hidden = true;
            });
            menu.hidden = !open;
            trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        chooser.append(trigger, menu);
        return chooser;
    }

    #normalizeLegacyColumnBackgrounds(project) {
        if (!project?.rows) {
            return project;
        }

        for (const row of project.rows) {
            for (const column of row.columns ?? []) {
                column.properties ??= {
                    backgroundColor: '',
                    padding: 10
                };

                /*
                 * Until 0.6.60, #fafbfc was stored automatically as the
                 * default column background even though it was intended only
                 * as an editor aid. Treat that legacy default as transparent.
                 */
                if (
                    !column.properties.backgroundColor
                    || String(column.properties.backgroundColor).toLowerCase() === '#fafbfc'
                ) {
                    column.properties.backgroundColor = '';
                }
            }
        }

        return project;
    }

    render() {
        this.canvas.replaceChildren();

        const content = document.createElement('div');
        content.className = 'vhd-content';

        if (!this.project.rows.length) {
            content.append(this.#createRowChooser(0));
            this.canvas.append(content);
            this.#syncHistoryButtons();
            this.#updateDocumentStatistics();
            return;
        }

        this.project.rows.forEach((row, rowIndex) => {
            const rowElement = document.createElement('section');
            rowElement.className = 'vhd-row-editor';
            rowElement.dataset.rowId = row.id;
            row.properties ??= { backgroundColor: '#ffffff', paddingTop: 0, paddingBottom: 0 };
            rowElement.style.backgroundColor = row.properties.backgroundColor;
            rowElement.style.paddingTop = `${row.properties.paddingTop ?? 0}px`;
            rowElement.style.paddingBottom = `${row.properties.paddingBottom ?? 0}px`;
            rowElement.addEventListener('click', event => {
                if (event.target === rowElement || event.target === grid) this.#selectProperties('row', row, rowElement);
            });

            const rowControls = document.createElement('div');
            rowControls.className = 'vhd-row-controls';

            const dragRow = this.#miniButton('⋮⋮', this.t.editor.dragRow, () => {});
            dragRow.classList.add('vhd-row-drag-handle');
            dragRow.setAttribute('aria-label', this.t.editor.dragRow);
            dragRow.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
            });
            dragRow.addEventListener('pointerdown', event => {
                this.#startRowDrag(event, rowIndex);
            });

            const remove = this.#miniButton('×', this.t.editor.remove, () => {
                this.removeRow(rowIndex);
            });

            if (rowIndex === 0) {
                const topChooser = this.#createRowChooser(0);
                topChooser.classList.add('vhd-row-chooser-inline');
                rowControls.append(topChooser);
            }

            rowControls.append(dragRow, remove);
            rowElement.append(rowControls);

            const grid = document.createElement('div');
            grid.className = 'vhd-grid';
            const gridUnits = row.columns.reduce((total, column) => total + column.width, 0);
            grid.style.setProperty('--vhd-grid-units', gridUnits);

            row.columns.forEach((column, columnIndex) => {
                const columnElement = document.createElement('div');
                columnElement.className = 'vhd-column';
                columnElement.dataset.rowIndex = String(rowIndex);
                columnElement.dataset.columnIndex = String(columnIndex);
                columnElement.style.setProperty('--vhd-span', column.width);
                column.properties ??= { backgroundColor: '', padding: 10 };
                column.properties.backgroundColor ??= '';
                columnElement.style.backgroundColor =
                    column.properties.backgroundColor || '#fafbfc';
                columnElement.style.padding = `${column.properties.padding ?? 10}px`;
                columnElement.addEventListener('click', event => {
                    if (event.target === columnElement) {
                        event.stopPropagation();
                        this.#selectProperties('column', column, columnElement);
                    }
                });

                if (!column.blocks.length) {
                    columnElement.append(
                        this.#blockMenu(
                            rowIndex,
                            columnIndex,
                            0,
                            'column'
                        )
                    );
                } else {
                    column.blocks.forEach((block, blockIndex) => {
                        columnElement.append(
                            this.#renderBlock(
                                block,
                                rowIndex,
                                columnIndex,
                                blockIndex
                            )
                        );
                    });

                    columnElement.append(
                        this.#blockMenu(
                            rowIndex,
                            columnIndex,
                            column.blocks.length,
                            'end'
                        )
                    );
                }

                grid.append(columnElement);
            });

            rowElement.append(grid);
            content.append(rowElement, this.#createRowChooser(rowIndex + 1));
        });

        this.canvas.append(content);
        this.#syncHistoryButtons();
        this.#updateDocumentStatistics();
    }

    getData() {
        return structuredClone(this.project);
    }

    getHtml() {
        return Serializer.toHtml(this.project);
    }

    loadHtml(html) {
        const project = HtmlImporter.fromHtml(html);

        this.history.clear();
        this.project = this.#normalizeLegacyColumnBackgrounds(
            project || this.#createDefaultProject()
        );
        this.#emit('change', { source: 'load:html' });
        this.render();
    }

    load(project) {
        if (!project || !Array.isArray(project.rows)) {
            throw new Error('Invalid project.');
        }

        for (const row of project.rows) {
            const widths = row.columns?.map(column => column.width);

            if (!Grid.isValidWidths(widths)) {
                throw new Error('Invalid project grid.');
            }
        }

        this.history.clear();
        this.project = this.#normalizeLegacyColumnBackgrounds(
            project.rows.length
                ? structuredClone(project)
                : this.#createDefaultProject()
        );
        this.#emit('change', { source: 'load' });
        this.render();
    }

    undo() {
        const state = this.history.undo(this.project);

        if (state) {
            this.project = state;
            this.#emit('change', { source: 'undo' });
            this.render();
        }
    }

    redo() {
        const state = this.history.redo(this.project);

        if (state) {
            this.project = state;
            this.#emit('change', { source: 'redo' });
            this.render();
        }
    }
}
