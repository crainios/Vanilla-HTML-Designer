# Vanilla HTML Designer plugins

Plugin support is introduced in VHD 0.7.0.

## Purpose

Plugins are reusable, distributable VHD extensions. They are intentionally
separate from `customButtons`, which remains the lightweight mechanism for a
webmaster to connect proprietary application-specific actions to VHD.

## Loading a plugin

```js
import HtmlDesigner from '../src/HtmlDesigner.js';
import MyPlugin from './MyPlugin.js';

const editor = new HtmlDesigner('#htmlDesigner', {
    plugins: [
        MyPlugin
    ]
});
```

A plugin is a standard ES module exporting an object:

```js
export default {
    name: 'my-plugin',
    version: '1.0.0',
    requires: '>=0.7.0',

    setup(vhd) {
        // Plugin initialization.
    }
};
```

Plugins may also be loaded after editor construction:

```js
editor.use(MyPlugin);
```

Duplicate plugin names are rejected.

## Plugin API in 0.7.0

The `setup(vhd)` argument is a restricted public API. It currently exposes:

```js
vhd.version;
vhd.plugin;

vhd.on(event, callback);
vhd.off(event, callback);

vhd.getData();
vhd.getHtml();

vhd.insertAtCursor(content, options);
vhd.setStatus(message, type);

vhd.registerToolbarButton(definition);
```

Plugins do not receive the internal `Editor` instance and should not depend on
the internal VHD DOM/project structure.

## Toolbar button

```js
setup(vhd) {
    vhd.registerToolbarButton({
        id: 'insert-date',
        label: 'Insert date',
        text: 'D',
        action() {
            vhd.insertAtCursor(
                new Date().toLocaleDateString()
            );
        }
    });
}
```

`icon` may be supplied instead of `text` when HTML/SVG markup is desired.

## Events

0.7.0 provides these initial events:

- `ready`
- `change`
- `block:add`
- `block:remove`
- `block:select`
- `plugin:loaded`

Example:

```js
setup(vhd) {
    vhd.on('change', event => {
        console.log(event.source);
    });
}
```

## Metadata

Recognized plugin metadata:

```js
{
    name: 'my-plugin',
    version: '1.0.0',
    requires: '>=0.7.0',
    author: '...',
    license: '...',
    setup(vhd) {}
}
```

The first compatibility syntax supported by VHD is `>=x.y.z`. Exact `x.y.z`
requirements are also accepted.

## Scope of 0.7.0

0.7.0 establishes the plugin infrastructure only. Custom plugin blocks,
declarative plugin properties, serializer/importer extensions and a block
registry are planned for subsequent 0.7.x versions.


## Custom blocks — VHD 0.7.1

A plugin may register a new content block:

```js
setup(vhd) {
    vhd.registerBlock({
        type: 'notice',
        label: 'Notice',

        create() {
            return {
                type: 'notice',
                content: 'Plugin notice'
            };
        },

        render({ block, update }) {
            const element = document.createElement('div');
            element.textContent = block.content;

            element.addEventListener('dblclick', () => {
                update({
                    content: 'Updated notice'
                });
            });

            return element;
        },

        serialize({ block }) {
            return `<div class="notice">${block.content}</div>`;
        }
    });
}
```

### Required fields

- `type`: lowercase identifier using letters, numbers and hyphens;
- `label`: label displayed in the VHD content menu;
- `create()`: returns the initial block object;
- `render(context)`: returns a DOM Node, an HTML string, or `null`;
- `serialize(context)`: returns the public HTML string.

An optional `icon` may contain SVG/HTML markup for the content menu.

### Render context

`render()` receives:

```js
{
    block,      // cloned current block data
    element,    // block wrapper owned by VHD
    update,     // update(patch, { render: true|false })
    render      // request a complete VHD render
}
```

A plugin should use `update()` instead of modifying VHD internal project data.

### Registry rules

Native and plugin blocks share the same block registry. A plugin cannot replace
an existing native block or a block registered by another plugin. Duplicate
block types are rejected.

### Current 0.7.1 limitation

Plugin block property schemas and HTML import recognition are not implemented
yet. These remain planned for later 0.7.x versions.


## Declarative plugin properties — VHD 0.7.2

A plugin block may now declare fields for the standard VHD Properties panel.

```js
vhd.registerBlock({
    type: 'notice',
    label: 'Notice',

    create() {
        return {
            type: 'notice',
            content: 'Attention',
            properties: {
                backgroundColor: '#fff7d6',
                padding: 12,
                rounded: true
            }
        };
    },

    properties: [
        {
            key: 'content',
            label: 'Texte',
            type: 'text'
        },
        {
            key: 'properties.backgroundColor',
            label: 'Couleur de fond',
            type: 'color'
        },
        {
            key: 'properties.padding',
            label: 'Marge intérieure',
            type: 'number',
            min: 0,
            max: 100,
            step: 1
        },
        {
            key: 'properties.variant',
            label: 'Type',
            type: 'select',
            options: [
                ['info', 'Information'],
                ['warning', 'Attention'],
                ['danger', 'Danger']
            ]
        },
        {
            key: 'properties.rounded',
            label: 'Coins arrondis',
            type: 'checkbox'
        }
    ],

    render({ block }) {
        // ...
    },

    serialize({ block }) {
        // ...
    }
});
```

### Supported property types

- `text`
- `number`
- `color`
- `select`
- `checkbox`

### Property keys

A key without prefix targets the block object directly:

```js
key: 'content'
```

A key beginning with `properties.` targets `block.properties`:

```js
key: 'properties.backgroundColor'
```

### Optional field configuration

Supported options include:

- `default`
- `placeholder`
- `min`
- `max`
- `step`
- `options` for `select`
- `live: true` to commit text/number changes on `input`
- `render: false` to update data without forcing a full VHD render

Each change emits a normal `change` event with source `plugin:property`.


## Plugin HTML import hooks — VHD 0.7.3

A plugin block may now restore itself from exported HTML by defining
`canImport(element)` and `import(element)`.

```js
vhd.registerBlock({
    type: 'notice',
    label: 'Notice',

    create() {
        return {
            type: 'notice',
            content: 'Attention'
        };
    },

    render({ block }) {
        // ...
    },

    serialize({ block }) {
        return `<div class="vhd-notice">${block.content}</div>`;
    },

    canImport(element) {
        return element.matches('.vhd-notice');
    },

    import(element) {
        return {
            type: 'notice',
            content: element.innerHTML
        };
    }
});
```

### Import cycle

Plugin blocks can now participate in the complete round trip:

```text
JSON -> editor -> HTML -> import HTML -> JSON
```

`canImport()` receives a cloned sanitized DOM element. If it returns `true`,
VHD calls the same block definition's `import()` hook.

`import()` must return a plain block object. VHD enforces the registered plugin
block `type` on the returned object.

Plugin import hooks run before native block recognition so a plugin may
recognize the HTML that its own `serialize()` function produces. Duplicate block
types remain prohibited.

### Safety

Plugin import hooks receive sanitized cloned DOM elements, not the live importer
DOM tree. Errors in `canImport()` or `import()` are caught and reported to the
browser console without aborting the complete document import.


## Richer declarative properties — VHD 0.7.4

VHD 0.7.4 adds two field types and grouped property sections.

### New field types

```js
{
    key: 'content',
    label: 'Texte long',
    type: 'textarea',
    rows: 5
}
```

```js
{
    key: 'properties.url',
    label: 'URL',
    type: 'url',
    placeholder: 'https://example.com'
}
```

### Property groups

A block may organize its fields with `group` or `section` items:

```js
properties: [
    {
        type: 'group',
        label: 'Contenu',
        description: 'Texte et destination du composant.',
        fields: [
            {
                key: 'content',
                label: 'Texte',
                type: 'textarea'
            },
            {
                key: 'properties.url',
                label: 'URL',
                type: 'url'
            }
        ]
    },
    {
        type: 'group',
        label: 'Présentation',
        fields: [
            {
                key: 'properties.backgroundColor',
                label: 'Couleur de fond',
                type: 'color'
            }
        ]
    }
]
```

Groups are presentation-only: they do not create persistent group data in the
block. Each declared field still owns and updates its own target value.

### Supported field types

- `text`
- `textarea`
- `url`
- `number`
- `color`
- `select`
- `checkbox`

`textarea` also supports `rows`.


> VHD 0.7.5: source code is now rich content inside Text blocks; `code` is no longer a native block type.
