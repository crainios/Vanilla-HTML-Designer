import createTextBlock from './TextBlock.js';
import createHeadingBlock from './HeadingBlock.js';
import createImageBlock from './ImageBlock.js';
import createButtonBlock from './ButtonBlock.js';
import createDividerBlock from './DividerBlock.js';
import createSpacerBlock from './SpacerBlock.js';
import createTableBlock from './TableBlock.js';

const definitions = new Map();

const registerNative = (type, factory) => {
    definitions.set(type, {
        type,
        label: '',
        factory,
        render: null,
        serialize: null,
        plugin: null,
        native: true
    });
};

registerNative('text', createTextBlock);
registerNative('heading', createHeadingBlock);
registerNative('image', createImageBlock);
registerNative('button', createButtonBlock);
registerNative('divider', createDividerBlock);
registerNative('spacer', createSpacerBlock);
registerNative('table', createTableBlock);

function normalizeType(value) {
    return String(value ?? '').trim().toLowerCase();
}

function clonePropertySchema(items) {
    if (!Array.isArray(items)) {
        return [];
    }

    return items.map(item => ({
        ...item,
        ...(Array.isArray(item?.fields)
            ? { fields: clonePropertySchema(item.fields) }
            : {})
    }));
}

function validatePluginDefinition(definition, pluginName) {
    if (!definition || typeof definition !== 'object') {
        throw new TypeError(
            'Vanilla HTML Designer: block definition must be an object.'
        );
    }

    const type = normalizeType(definition.type);
    const label = String(definition.label ?? '').trim();

    if (!/^[a-z][a-z0-9-]*$/.test(type)) {
        throw new Error(
            'Vanilla HTML Designer: plugin block type must use lowercase letters, numbers and hyphens.'
        );
    }

    if (!label) {
        throw new Error(
            `Vanilla HTML Designer: plugin block "${type || '?'}" must define a label.`
        );
    }

    if (typeof definition.create !== 'function') {
        throw new Error(
            `Vanilla HTML Designer: plugin block "${type}" must define create().`
        );
    }

    if (typeof definition.render !== 'function') {
        throw new Error(
            `Vanilla HTML Designer: plugin block "${type}" must define render(context).`
        );
    }

    if (typeof definition.serialize !== 'function') {
        throw new Error(
            `Vanilla HTML Designer: plugin block "${type}" must define serialize(context).`
        );
    }

    const properties = clonePropertySchema(
        definition.properties
    );

    return {
        type,
        label,
        icon: definition.icon ? String(definition.icon) : '',
        factory: definition.create,
        render: definition.render,
        serialize: definition.serialize,
        canImport: typeof definition.canImport === 'function'
            ? definition.canImport
            : null,
        importer: typeof definition.import === 'function'
            ? definition.import
            : null,
        properties,
        plugin: String(pluginName || 'plugin'),
        native: false
    };
}

export default class BlockFactory {
    static create(type) {
        const definition = definitions.get(normalizeType(type));

        if (!definition) {
            throw new Error(`Unknown block type: ${type}`);
        }

        const block = definition.factory();

        if (!block || typeof block !== 'object') {
            throw new Error(
                `Vanilla HTML Designer: block factory "${definition.type}" must return an object.`
            );
        }

        block.type = definition.type;

        return block;
    }

    static register(definition, pluginName = 'plugin') {
        const normalized = validatePluginDefinition(
            definition,
            pluginName
        );

        if (definitions.has(normalized.type)) {
            throw new Error(
                `Vanilla HTML Designer: block type "${normalized.type}" is already registered.`
            );
        }

        definitions.set(normalized.type, normalized);

        return {
            type: normalized.type,
            label: normalized.label,
            plugin: normalized.plugin
        };
    }

    static get(type) {
        return definitions.get(normalizeType(type)) ?? null;
    }

    static has(type) {
        return definitions.has(normalizeType(type));
    }

    static getLabel(type, translations = {}) {
        const definition = this.get(type);

        if (!definition) {
            return String(type ?? '');
        }

        if (definition.native) {
            return translations?.[definition.type]
                || definition.type;
        }

        return definition.label;
    }

    static get types() {
        return [...definitions.keys()];
    }

    static get pluginTypes() {
        return [...definitions.values()]
            .filter(definition => !definition.native)
            .map(definition => definition.type);
    }

    static get registered() {
        return [...definitions.values()].map(definition => ({
            type: definition.type,
            label: definition.label,
            plugin: definition.plugin,
            native: definition.native,
            properties: clonePropertySchema(
                definition.properties
            ),
            importable: Boolean(
                definition.canImport
                && definition.importer
            )
        }));
    }
}
