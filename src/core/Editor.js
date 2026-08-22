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
        this.root.style.setProperty('--vhd-default-font-family', this.options.defaultFontFamily);
        this.t = deepMerge(fallbackTranslations, this.options.translations ?? {});
        this.project = HtmlImporter.fromHtml(this.options.html)
            || this.#createDefaultProject();
        this.history = new History();
        this.textToolbar = new TextToolbar(this.t, {
            defaultFontFamily: this.options.defaultFontFamily,
            customButtons: this.options.customButtons ?? [],
            publicApi: () => this.options.publicApi ?? null,
            undo: () => this.undo(),
            redo: () => this.redo(),
            exportJson: () => this.#showOutput(JSON.stringify(this.getData(), null, 2)),
            exportHtml: () => this.#showOutput(this.getHtml()),
            preview: () => this.#showPreview(),
            insertInlineImage: editable => this.#insertInlineImage(editable),
            insertVideo: editable => this.#insertVideo(editable)
        });

        this.#buildShell();
        this.render();
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

    #showPreview() {
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
            document.body.append(this.previewDialog);
        }

        this.previewContent.innerHTML = this.getHtml();
        this.previewDialog.showModal();
    }

    #buildShell() {
        this.root.classList.add('vhd');

        this.topbar = document.createElement('div');
        this.topbar.className = 'vhd-topbar';

        this.canvas = document.createElement('div');
        this.canvas.className = 'vhd-canvas';

        this.propertiesPanel = document.createElement('aside');
        this.propertiesPanel.className = 'vhd-properties';
        this.propertiesPanel.innerHTML = `<h3>${this.t.properties.title}</h3><p class="vhd-properties-empty">${this.t.properties.none}</p>`;

        this.workspace = document.createElement('div');
        this.workspace.className = 'vhd-workspace';
        this.workspace.append(this.canvas, this.propertiesPanel);

        this.root.replaceChildren(this.textToolbar.element, this.workspace);
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
            if (type === 'number') input.min = '0';
        }

        input.value = value;
        input.addEventListener('input', () => onInput(input.value, input));
        field.append(caption, input);
        return field;
    }

    #selectProperties(kind, target, element) {
        this.root.querySelectorAll('.vhd-selected').forEach(item => item.classList.remove('vhd-selected'));
        element?.classList.add('vhd-selected');

        const panel = this.propertiesPanel;
        panel.replaceChildren();

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
            panel.append(
                this.#propertyField(this.t.properties.width, 'number', target.properties.width ?? 100, value => {
                    target.properties.width = Math.min(100, Math.max(1, Number(value))); const img=element.querySelector('img'); if(img) img.style.width=`${target.properties.width}%`;
                }),
                this.#propertyField(this.t.properties.align, 'select', target.properties.align || 'center', value => {
                    target.properties.align = value;

                    const img = element.querySelector('.vhd-image-editor img');

                    if (img) {
                        if (value === 'left') {
                            img.style.marginLeft = '0';
                            img.style.marginRight = 'auto';
                        } else if (value === 'right') {
                            img.style.marginLeft = 'auto';
                            img.style.marginRight = '0';
                        } else {
                            img.style.marginLeft = 'auto';
                            img.style.marginRight = 'auto';
                        }
                    }
                }, [['left',this.t.properties.left],['center',this.t.properties.center],['right',this.t.properties.right]]),
                this.#propertyField(this.t.properties.borderRadius, 'number', target.properties.borderRadius ?? 4, value => {
                    target.properties.borderRadius=Number(value); const img=element.querySelector('img'); if(img) img.style.borderRadius=`${value}px`;
                })
            );
        } else if (target.type === 'button') {
            panel.append(
                this.#propertyField(this.t.properties.buttonBackground,'color',target.properties.backgroundColor||'#2563eb',value=>{target.properties.backgroundColor=value; element.querySelector('a').style.backgroundColor=value;}),
                this.#propertyField(this.t.properties.buttonColor,'color',target.properties.color||'#ffffff',value=>{target.properties.color=value; element.querySelector('a').style.color=value;}),
                this.#propertyField(this.t.properties.borderRadius,'number',target.properties.borderRadius??5,value=>{target.properties.borderRadius=Number(value); element.querySelector('a').style.borderRadius=`${value}px`;}),
                this.#propertyField(this.t.properties.paddingHorizontal,'number',target.properties.paddingHorizontal??16,value=>{target.properties.paddingHorizontal=Number(value); element.querySelector('a').style.paddingLeft=`${value}px`; element.querySelector('a').style.paddingRight=`${value}px`;}),
                this.#propertyField(this.t.properties.paddingVertical,'number',target.properties.paddingVertical??10,value=>{target.properties.paddingVertical=Number(value); element.querySelector('a').style.paddingTop=`${value}px`; element.querySelector('a').style.paddingBottom=`${value}px`;}),
                this.#propertyField(this.t.properties.align,'select',target.properties.align||'left',value=>{target.properties.align=value;element.querySelector('.vhd-button-editor').style.textAlign=value;},[['left',this.t.properties.left],['center',this.t.properties.center],['right',this.t.properties.right]])
            );
        } else if (target.type === 'divider') {
            panel.append(
                this.#propertyField(this.t.properties.dividerColor,'color',target.properties.color||'#9ca3af',value=>{target.properties.color=value;element.querySelector('hr').style.borderTopColor=value;}),
                this.#propertyField(this.t.properties.dividerWidth,'number',target.properties.width??1,value=>{target.properties.width=Number(value);element.querySelector('hr').style.borderTopWidth=`${value}px`;}),
                this.#propertyField(this.t.properties.dividerStyle,'select',target.properties.style||'solid',value=>{target.properties.style=value;element.querySelector('hr').style.borderTopStyle=value;},[['solid','Solid'],['dashed','Dashed'],['dotted','Dotted']])
            );
        } else if (target.type === 'spacer') {
            panel.append(this.#propertyField(this.t.properties.height,'number',target.height??32,value=>{target.height=Number(value); const preview=element.querySelector('.vhd-spacer-preview'); if(preview) preview.style.height=`${value}px`; const label=element.querySelector('.vhd-spacer-value'); if(label) label.textContent=`${value}px`; const range=element.querySelector('.vhd-spacer-range'); if(range) range.value=value;}));
        } else if (target.type === 'text' || target.type === 'heading') {
            panel.append(
                this.#propertyField(this.t.properties.textColor,'color',target.properties.color||'#1f2937',value=>{target.properties.color=value; const editable=element.querySelector('[contenteditable]'); if(editable) editable.style.color=value;}),
                this.#propertyField(this.t.properties.lineHeight,'number',target.properties.lineHeight??1.5,value=>{target.properties.lineHeight=Number(value); const editable=element.querySelector('[contenteditable]'); if(editable) editable.style.lineHeight=value;}),
                this.#propertyField(this.t.properties.letterSpacing,'number',target.properties.letterSpacing??0,value=>{target.properties.letterSpacing=Number(value); const editable=element.querySelector('[contenteditable]'); if(editable) editable.style.letterSpacing=`${value}px`;})
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
        this.#remember();
        this.project.rows.push(
            this.#populateRowWithDefaultText(Grid.createPreset(preset))
        );
        this.render();
    }

    addBlock(rowIndex, columnIndex, type) {
        this.#remember();
        this.project.rows[rowIndex].columns[columnIndex].blocks.push(BlockFactory.create(type));
        this.render();
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

    #blockControls(rowIndex, columnIndex, blockIndex) {
        const controls = document.createElement('div');
        controls.className = 'vhd-block-controls';

        const up = this.#miniButton('↑', this.t.editor.moveUp, () => {
            this.moveBlock(rowIndex, columnIndex, blockIndex, -1);
        });

        const down = this.#miniButton('↓', this.t.editor.moveDown, () => {
            this.moveBlock(rowIndex, columnIndex, blockIndex, 1);
        });

        const remove = this.#miniButton('×', this.t.editor.remove, () => {
            this.removeBlock(rowIndex, columnIndex, blockIndex);
        });

        controls.append(up, down, remove);
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
        });

        element.addEventListener('blur', () => {
            block[property] = element.innerHTML;
        });
    }

    #renderBlock(block, rowIndex, columnIndex, blockIndex) {
        const wrapper = document.createElement('div');
        wrapper.className = `vhd-block vhd-block-${block.type}`;
        wrapper.append(this.#blockControls(rowIndex, columnIndex, blockIndex));

        if (block.type === 'heading') {
            const heading = document.createElement(`h${block.level || 2}`);
            heading.innerHTML = block.content || '';
            this.#editable(heading, block, 'content');
            wrapper.append(heading);
        }

        if (block.type === 'text') {
            const text = document.createElement('div');
            text.className = 'vhd-editable-text';
            text.innerHTML = block.content || '';
            this.#editable(text, block, 'content');
            wrapper.append(text);
        }

        if (block.type === 'image') {
            const preview = document.createElement('div');
            preview.className = 'vhd-image-editor';

            if (block.src) {
                const image = document.createElement('img');
                image.src = block.src;
                image.alt = block.alt || '';
                image.style.width = `${block.properties?.width ?? 100}%`;
                image.style.borderRadius = `${block.properties?.borderRadius ?? 4}px`;

                const align = block.properties?.align || 'center';

                if (align === 'left') {
                    image.style.marginLeft = '0';
                    image.style.marginRight = 'auto';
                } else if (align === 'right') {
                    image.style.marginLeft = 'auto';
                    image.style.marginRight = '0';
                } else {
                    image.style.marginLeft = 'auto';
                    image.style.marginRight = 'auto';
                }

                preview.append(image);
            }

            const url = document.createElement('input');
            url.type = 'url';
            url.placeholder = this.t.editor.imageUrl;
            url.value = block.src || '';
            url.addEventListener('change', () => {
                this.#remember();
                block.src = url.value.trim();
                this.render();
            });

            const alt = document.createElement('input');
            alt.type = 'text';
            alt.placeholder = this.t.editor.imageAlt;
            alt.value = block.alt || '';
            alt.addEventListener('input', () => {
                block.alt = alt.value;
            });

            preview.append(url, alt);

            if (this.options.imageGalleryUrl || typeof this.options.onImageSelect === 'function') {
                const choose = document.createElement('button');
                choose.type = 'button';
                choose.className = 'vhd-secondary-button';
                choose.textContent = this.t.editor.chooseImage;

                choose.addEventListener('click', async () => {
                    if (this.options.imageGalleryUrl) {
                        await this.#openImageGallery({
                            type: 'block',
                            block
                        });
                        return;
                    }

                    const selected = await this.options.onImageSelect();

                    if (!selected?.src) {
                        return;
                    }

                    this.pendingImageTarget = {
                        type: 'block',
                        block
                    };

                    this.insertImage(selected);
                });

                preview.append(choose);
            }

            wrapper.append(preview);
        }

        if (block.type === 'button') {
            const editor = document.createElement('div');
            editor.className = 'vhd-button-editor';

            const preview = document.createElement('a');
            preview.className = 'vhd-preview-button';
            preview.href = block.url || '#';
            preview.textContent = block.text || 'Button';
            preview.style.backgroundColor = block.properties?.backgroundColor || '#2563eb';
            preview.style.color = block.properties?.color || '#ffffff';
            preview.style.borderRadius = `${block.properties?.borderRadius ?? 5}px`;
            preview.style.padding = `${block.properties?.paddingVertical ?? 10}px ${block.properties?.paddingHorizontal ?? 16}px`;
            preview.style.display = 'inline-block';
            preview.style.textDecoration = 'none';
            editor.style.textAlign = block.properties?.align || 'left';
            preview.addEventListener('click', event => event.preventDefault());

            const text = document.createElement('input');
            text.type = 'text';
            text.placeholder = this.t.editor.buttonText;
            text.value = block.text || '';
            text.addEventListener('input', () => {
                block.text = text.value;
                preview.textContent = text.value || 'Button';
            });

            const url = document.createElement('input');
            url.type = 'url';
            url.placeholder = this.t.editor.buttonUrl;
            url.value = block.url || '';
            url.addEventListener('input', () => {
                block.url = url.value;
                preview.href = url.value || '#';
            });

            editor.append(preview, text, url);
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
            const editor = document.createElement('div');
            editor.className = 'vhd-spacer-editor';

            const value = document.createElement('span');
            value.className = 'vhd-spacer-value';
            value.textContent = `${block.height ?? 32}px`;

            const range = document.createElement('input');
            range.type = 'range';
            range.min = '0';
            range.max = '200';
            range.step = '4';
            range.value = String(block.height ?? 32);
            range.className = 'vhd-spacer-range';

            const preview = document.createElement('div');
            preview.className = 'vhd-spacer-preview';
            preview.style.height = `${range.value}px`;

            range.addEventListener('input', () => {
                const height = Number(range.value);

                block.height = height;
                value.textContent = `${height}px`;
                preview.style.height = `${height}px`;
            });

            editor.append(value, range);
            wrapper.append(editor, preview);
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

        for (const type of BlockFactory.types) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'vhd-block-add-item';
            button.setAttribute('role', 'menuitem');
            button.textContent = this.t.blocks[type];
            button.addEventListener('click', () => {
                menu.hidden = true;
                trigger.setAttribute('aria-expanded', 'false');
                this.addBlock(rowIndex, columnIndex, type);
            });
            menu.append(button);
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
        ];

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

    render() {
        this.canvas.replaceChildren();

        const content = document.createElement('div');
        content.className = 'vhd-content';

        if (!this.project.rows.length) {
            content.append(this.#createRowChooser(0));
            this.canvas.append(content);
            this.#syncHistoryButtons();
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

            const moveUp = this.#miniButton('↑', this.t.editor.moveRowUp, () => {
                this.moveRow(rowIndex, -1);
            });
            moveUp.disabled = rowIndex === 0;

            const moveDown = this.#miniButton('↓', this.t.editor.moveRowDown, () => {
                this.moveRow(rowIndex, 1);
            });
            moveDown.disabled = rowIndex === this.project.rows.length - 1;

            const remove = this.#miniButton('×', this.t.editor.remove, () => {
                this.removeRow(rowIndex);
            });

            if (rowIndex === 0) {
                const topChooser = this.#createRowChooser(0);
                topChooser.classList.add('vhd-row-chooser-inline');
                rowControls.append(topChooser);
            }

            rowControls.append(moveUp, moveDown, remove);
            rowElement.append(rowControls);

            const grid = document.createElement('div');
            grid.className = 'vhd-grid';
            const gridUnits = row.columns.reduce((total, column) => total + column.width, 0);
            grid.style.setProperty('--vhd-grid-units', gridUnits);

            row.columns.forEach((column, columnIndex) => {
                const columnElement = document.createElement('div');
                columnElement.className = 'vhd-column';
                columnElement.style.setProperty('--vhd-span', column.width);
                column.properties ??= { backgroundColor: '#fafbfc', padding: 10 };
                columnElement.style.backgroundColor = column.properties.backgroundColor;
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
        this.project = project || this.#createDefaultProject();
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
        this.project = project.rows.length
            ? structuredClone(project)
            : this.#createDefaultProject();
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
