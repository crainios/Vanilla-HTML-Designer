import Editor from './core/Editor.js';
import Serializer from './core/Serializer.js';
import en from './lang/en.js';

export default class HtmlDesigner {
    static renderJson(json) {
        let project = json;

        if (typeof json === 'string') {
            try {
                project = JSON.parse(json);
            } catch (error) {
                throw new Error(
                    `Vanilla HTML Designer: invalid JSON passed to renderJson(): ${error.message}`
                );
            }
        }

        if (
            !project
            || typeof project !== 'object'
            || !Array.isArray(project.rows)
        ) {
            throw new Error(
                'Vanilla HTML Designer: renderJson() expects a VHD project object or JSON string.'
            );
        }

        return Serializer.toHtml(project);
    }

    constructor(target, options = {}) {
        const root = typeof target === 'string'
            ? document.querySelector(target)
            : target;

        if (!(root instanceof HTMLElement)) {
            throw new Error('Vanilla HTML Designer: target element not found.');
        }

        this.editor = new Editor(root, {
            ...options,
            publicApi: this
        }, en);
    }

    setStatus(message = '', type = 'info') {
        return this.editor.setStatus(message, type);
    }

    getData() {
        return this.editor.getData();
    }

    getHtml() {
        return this.editor.getHtml();
    }

    load(project) {
        this.editor.load(project);
    }

    loadHtml(html) {
        this.editor.loadHtml(html);
    }

    insertAtCursor(content, options = {}) {
        return this.editor.insertAtCursor(content, options);
    }

    insertImage(image) {
        return this.editor.insertImage(image);
    }

    openImageGallery() {
        return this.editor.openImageGallery();
    }

    closeImageGallery() {
        this.editor.closeImageGallery();
    }

    undo() {
        this.editor.undo();
    }

    redo() {
        this.editor.redo();
    }
}
