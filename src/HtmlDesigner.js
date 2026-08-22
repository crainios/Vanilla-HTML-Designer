import Editor from './core/Editor.js';
import en from './lang/en.js';

export default class HtmlDesigner {
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
