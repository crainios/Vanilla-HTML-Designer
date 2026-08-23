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
        this.fullscreenKeyHandler = event => {
            if (event.key === 'Escape' && this.isFullscreen) {
                event.preventDefault();
                this.toggleFullscreen(false);
            }
        };

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
            insertInlineImage: editable => this.#insertInlineImage(editable),
            insertVideo: editable => this.#insertVideo(editable),
            insertCode: editable => this.#showInsertCodeDialog(editable)
        });

        this.#buildShell();
        this.render();
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

    #showInsertCodeDialog(editable) {
        const blockElement = editable?.closest?.('.vhd-block');
        const rowIndex = Number(blockElement?.dataset.rowIndex);
        const columnIndex = Number(blockElement?.dataset.columnIndex);
        const blockIndex = Number(blockElement?.dataset.blockIndex);

        this.pendingCodePosition = (
            Number.isInteger(rowIndex)
            && Number.isInteger(columnIndex)
            && Number.isInteger(blockIndex)
        )
            ? { rowIndex, columnIndex, blockIndex: blockIndex + 1 }
            : null;

        if (!this.codeDialog) {
            this.codeDialog = document.createElement('dialog');
            this.codeDialog.className = 'vhd-code-dialog';

            const form = document.createElement('form');
            form.method = 'dialog';
            form.className = 'vhd-code-dialog-content';

            const title = document.createElement('h2');
            title.textContent = this.t.editor.insertCodeTitle;

            this.codeTextarea = document.createElement('textarea');
            this.codeTextarea.className = 'vhd-code-dialog-textarea';
            this.codeTextarea.rows = 14;
            this.codeTextarea.spellcheck = false;
            this.codeTextarea.placeholder = this.t.editor.codePlaceholder;

            const actions = document.createElement('div');
            actions.className = 'vhd-code-dialog-actions';

            const cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.className = 'vhd-secondary-button';
            cancel.textContent = this.t.editor.cancel;
            cancel.addEventListener('click', () => this.codeDialog.close());

            const insert = document.createElement('button');
            insert.type = 'button';
            insert.className = 'vhd-action-button';
            insert.textContent = this.t.editor.insert;
            insert.addEventListener('click', () => {
                const code = this.codeTextarea.value;

                if (!code.length) {
                    this.codeTextarea.focus();
                    return;
                }

                this.#remember();

                let position = this.pendingCodePosition;

                if (!position) {
                    const fallbackRowIndex = 0;
                    const fallbackColumnIndex = 0;
                    const blocks = this.project.rows?.[fallbackRowIndex]?.columns?.[fallbackColumnIndex]?.blocks;

                    if (!blocks) {
                        return;
                    }

                    position = {
                        rowIndex: fallbackRowIndex,
                        columnIndex: fallbackColumnIndex,
                        blockIndex: blocks.length
                    };
                }

                const block = BlockFactory.create('code');
                block.code = code;

                this.project.rows[position.rowIndex]
                    .columns[position.columnIndex]
                    .blocks.splice(position.blockIndex, 0, block);

                this.codeDialog.close();
                this.codeTextarea.value = '';
                this.pendingCodePosition = null;
                this.render();
            });

            actions.append(cancel, insert);
            form.append(title, this.codeTextarea, actions);
            this.codeDialog.append(form);
            document.body.append(this.codeDialog);

            this.codeDialog.addEventListener('click', event => {
                if (event.target === this.codeDialog) {
                    this.codeDialog.close();
                }
            });
        }

        this.codeTextarea.value = '';
        this.codeDialog.showModal();
        requestAnimationFrame(() => this.codeTextarea.focus());
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

            if (block.type === 'code') {
                const element = wrapper.querySelector('.vhd-code-editor');

                if (element) {
                    items.push({
                        block,
                        wrapper,
                        element,
                        kind: 'code'
                    });
                }
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

        if (match.kind === 'code') {
            match.element.focus();
            match.element.setSelectionRange(match.start, match.end);
            return;
        }

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

        if (match.kind === 'code') {
            match.element.setRangeText(
                replacement,
                match.start,
                match.end,
                'end'
            );

            match.element.dispatchEvent(new Event('input', {
                bubbles: true
            }));

            return true;
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
                    } else if (block.type === 'code') {
                        countText(block.code);
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

        input.value = value;
        input.addEventListener('input', () => onInput(input.value, input));
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

    #selectProperties(kind, target, element) {
        this.root.querySelectorAll('.vhd-selected').forEach(item => item.classList.remove('vhd-selected'));
        element?.classList.add('vhd-selected');

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
            title.textContent = this.t.blocks[target.type] || target.type;
        }
        panel.append(title);

        target.properties ??= {};
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
        } else if (target.type === 'text' || target.type === 'heading') {
            panel.append(
                this.#propertyField(this.t.properties.textColor,'color',target.properties.color||'#1f2937',value=>{target.properties.color=value; const editable=element.querySelector('[contenteditable]'); if(editable) editable.style.color=value;}),
                this.#propertyField(
                    this.t.properties.lineHeight,
                    'number',
                    target.properties.lineHeight ?? 1.5,
                    value => {
                        target.properties.lineHeight = Number(value);
                        const editable = element.querySelector('[contenteditable]');
                        if (editable) editable.style.lineHeight = value;
                    },
                    { min: 0.5, max: 5, step: 0.1 }
                ),
                this.#propertyField(
                    this.t.properties.letterSpacing,
                    'number',
                    target.properties.letterSpacing ?? 0,
                    value => {
                        target.properties.letterSpacing = Number(value);
                        const editable = element.querySelector('[contenteditable]');
                        if (editable) editable.style.letterSpacing = `${value}px`;
                    },
                    { min: 0, step: 0.1 }
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

    addBlock(rowIndex, columnIndex, type) {
        if (
            this.disabledContentBlocks.has(type)
            || !BlockFactory.types.includes(type)
        ) {
            return false;
        }

        this.#remember();
        this.project.rows[rowIndex].columns[columnIndex].blocks.push(BlockFactory.create(type));
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
        this.project.rows[rowIndex].columns[columnIndex].blocks.splice(blockIndex, 1);
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

    #blockControls(rowIndex, columnIndex, blockIndex) {
        const controls = document.createElement('div');
        controls.className = 'vhd-block-controls';

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

        controls.append(drag, remove);
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
        this.root.querySelectorAll('.vhd-inline-image.is-selected').forEach(item => item.classList.remove('is-selected'));
        this.root.querySelectorAll('.vhd-selected').forEach(item => item.classList.remove('vhd-selected'));

        this.#showInlineLinkProperties(link);
    }

    #applyInlineImageStyles(image) {
        const align = image.dataset.align || 'left';
        const size = Math.min(100, Math.max(1, Number(image.dataset.size || 33)));
        const spacing = Math.max(0, Number(image.dataset.spacing || 0));

        image.dataset.align = align;
        image.dataset.size = String(size);
        image.dataset.spacing = String(spacing);
        image.style.width = `${size}%`;
        image.style.height = 'auto';

        if (align === 'right') {
            image.style.float = 'right';
            image.style.display = '';
            image.style.margin = `${spacing}px 0 ${spacing}px ${spacing}px`;
        } else if (align === 'center') {
            image.style.float = 'none';
            image.style.display = 'block';
            image.style.margin = `${spacing}px auto`;
        } else {
            image.style.float = 'left';
            image.style.display = '';
            image.style.margin = `${spacing}px ${spacing}px ${spacing}px 0`;
        }
    }

    #syncInlineImage(image) {
        const editable = image.closest('[contenteditable="true"]');

        editable?.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: 'formatImage',
            data: null
        }));
    }

    #showInlineImageProperties(image) {
        const panel = this.propertiesPanel;
        panel.replaceChildren();

        const title = document.createElement('h3');
        title.textContent = this.t.properties.inlineImage;
        panel.append(title);

        const currentSize = Math.min(100, Math.max(1, Number(image.dataset.size || 33)));
        const currentSpacing = Math.max(0, Number(image.dataset.spacing || 0));

        panel.append(
            this.#propertyField(
                this.t.properties.align,
                'select',
                image.dataset.align || 'left',
                value => {
                    image.dataset.align = value;
                    this.#applyInlineImageStyles(image);
                    this.#syncInlineImage(image);
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

        this.#applyInlineImageStyles(image);
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

    #editable(element, block, property) {
        element.contentEditable = 'true';
        element.spellcheck = true;
        element.style.fontFamily = this.options.defaultFontFamily;

        element.addEventListener('focus', () => {
            this.textToolbar.setActiveEditable(element);
            this.textToolbar.show();
        });

        element.addEventListener('paste', event => {
            this.#pastePlainText(event, element);
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
            }
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
            block[property] = element.innerHTML;
            this.#updateDocumentStatistics();
        });

        element.addEventListener('blur', () => {
            block[property] = element.innerHTML;
            this.#updateDocumentStatistics();
        });
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

        if (block.type === 'heading') {
            const heading = document.createElement(`h${block.level || 2}`);
            heading.innerHTML = block.content || '';
            heading.style.color = block.properties?.color || '#1f2937';
            heading.style.lineHeight = String(block.properties?.lineHeight ?? 1.2);
            heading.style.letterSpacing = `${block.properties?.letterSpacing ?? 0}px`;
            this.#editable(heading, block, 'content');
            wrapper.append(heading);
        }

        if (block.type === 'text') {
            const text = document.createElement('div');
            text.className = 'vhd-editable-text';
            text.innerHTML = block.content || '';
            text.style.color = block.properties?.color || '#1f2937';
            text.style.lineHeight = String(block.properties?.lineHeight ?? 1.5);
            text.style.letterSpacing = `${block.properties?.letterSpacing ?? 0}px`;
            this.#editable(text, block, 'content');
            wrapper.append(text);
        }

        if (block.type === 'image') {
            const preview = document.createElement('div');
            preview.className = 'vhd-image-editor';

            this.#renderResizableImage(preview, block, wrapper);
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

        if (block.type === 'code') {
            const editor = document.createElement('textarea');
            editor.className = 'vhd-code-editor';
            editor.spellcheck = false;
            editor.rows = Math.max(5, Math.min(18, String(block.code || '').split('\n').length + 1));
            editor.value = block.code || '';
            editor.placeholder = this.t.editor.codePlaceholder;

            editor.addEventListener('input', () => {
                block.code = editor.value;
                editor.rows = Math.max(5, Math.min(18, editor.value.split('\n').length + 1));
                this.#updateDocumentStatistics();
            });

            wrapper.append(editor);
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

    #blockMenu(rowIndex, columnIndex) {
        const wrapper = document.createElement('div');
        wrapper.className = 'vhd-block-add vhd-content-add';

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
            button.textContent = this.t.blocks[type];
            button.addEventListener('click', () => {
                menu.hidden = true;
                trigger.setAttribute('aria-expanded', 'false');
                this.addBlock(rowIndex, columnIndex, type);
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

                column.blocks.forEach((block, blockIndex) => {
                    columnElement.append(
                        this.#renderBlock(block, rowIndex, columnIndex, blockIndex)
                    );
                });

                columnElement.append(this.#blockMenu(rowIndex, columnIndex));
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
        this.render();
    }

    undo() {
        const state = this.history.undo(this.project);

        if (state) {
            this.project = state;
            this.render();
        }
    }

    redo() {
        const state = this.history.redo(this.project);

        if (state) {
            this.project = state;
            this.render();
        }
    }
}
