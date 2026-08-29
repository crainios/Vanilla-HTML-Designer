import Editor from './core/Editor.js';
import Serializer from './core/Serializer.js';
import BlockFactory from './blocks/BlockFactory.js';
import EventBus from './core/EventBus.js';
import PluginManager from './core/PluginManager.js';
import { VERSION } from './version.js';
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

        this.events = new EventBus();

        this.editor = new Editor(root, {
            ...options,
            publicApi: this,
            emitEvent: (event, detail) => this.events.emit(event, detail)
        }, en);

        this.plugins = new PluginManager(this, VERSION);

        for (const plugin of options.plugins ?? []) {
            this.use(plugin);
        }

        queueMicrotask(() => {
            this.events.emit('ready', {
                version: VERSION,
                plugins: this.getPlugins()
            });
        });
    }

    _emitPluginEvent(event, detail = {}) {
        this.events.emit(event, detail);
    }

    on(event, callback) {
        return this.events.on(event, callback);
    }

    off(event, callback) {
        return this.events.off(event, callback);
    }

    use(plugin) {
        return this.plugins.use(plugin);
    }

    getPlugins() {
        return this.plugins.list();
    }

    registerToolbarButton(definition) {
        const plugin = String(definition?.plugin ?? 'host');

        return this.editor.registerToolbarButton(
            definition,
            { plugin }
        );
    }

    registerBlock(definition) {
        const plugin = String(definition?.plugin ?? 'host');
        const registered = BlockFactory.register(
            definition,
            plugin
        );

        this.editor.refreshBlockRegistry();

        this.events.emit('block:registered', {
            ...registered
        });

        return registered;
    }

    getRegisteredBlocks() {
        return BlockFactory.registered;
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
