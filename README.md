# Vanilla HTML Designer

A lightweight visual HTML content editor written in **Vanilla JavaScript**.

**No React. No Vue. No Angular. No jQuery. No build step required.**

Vanilla HTML Designer (VHD) combines a structured JSON document model with clean,
portable HTML output. It is designed for host applications that need a visual editor
without adopting a front-end framework.

## Highlights

- Responsive sections with one to six columns
- Text, Heading, Image, Button, Divider, Spacer, Table and secure Free HTML content
- Rich-text formatting, links, lists, citations, code, inline images and video
- Two-row toolbar with always-visible character and paragraph commands
- Paragraph drop caps with configurable size, colour and spacing
- Direct block and section reordering
- Advanced editable tables, including merged cells and per-cell presentation
- JSON and existing-HTML loading
- HTML export separated from the editable project
- Undo and redo across native and custom editing actions
- External image-gallery integration
- Protected application shortcodes with optional rendered previews
- Extensible toolbar and plugin block API
- English and French interface

## Quick start

Serve the repository over HTTP:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/demo/
```

## Basic integration

```html
<link rel="stylesheet" href="/Vanilla-HTML-Designer/src/html-designer.css">

<div id="htmlDesigner"></div>

<script type="module">
import HtmlDesigner from '/Vanilla-HTML-Designer/src/HtmlDesigner.js';
import fr from '/Vanilla-HTML-Designer/src/lang/fr.js';

const editor = new HtmlDesigner('#htmlDesigner', {
    translations: fr,
    defaultFontFamily: 'system-ui'
});

const project = editor.getData();
const html = editor.getHtml();
</script>
```

The JSON project is the editable source. The generated HTML is intended for storage
or display by the host application.

## Load existing content

VHD can start from an existing project or import regular HTML:

```js
const fromHtml = new HtmlDesigner('#htmlDesigner', {
    translations: fr,
    html: document.querySelector('#content').value
});

fromHtml.loadHtml('<h2>Imported content</h2><p>Editable text.</p>');
fromHtml.load(savedProject);
```

The HTML importer recognises VHD layouts and native blocks, preserves supported rich
content, and removes unsafe elements, event attributes and URL protocols.

## Display exported content

Public pages should load the standalone content stylesheet:

```html
<link rel="stylesheet" href="/Vanilla-HTML-Designer/src/vhd-content.css">
```

Pages containing Code regions may also load the optional enhancer:

```html
<script src="/Vanilla-HTML-Designer/src/vhd-code.js" defer></script>
```

It adds code presentation and a copy button without requiring the complete editor CSS.

## Main API

```js
editor.getData();
editor.getHtml();
editor.load(project);
editor.loadHtml(html);
editor.undo();
editor.redo();
editor.insertAtCursor('Text');
editor.insertAtCursor('<strong>HTML</strong>', { html: true });
editor.insertImage({ src, alt, title });
editor.setStatus('Saved', 'success');
```

Render a saved project without creating an editor:

```js
const html = HtmlDesigner.renderJson(projectOrJsonString);
```

See [API documentation](docs/api.md) for options, public methods and shortcode support.

## Image gallery

A host application can provide a gallery URL or an asynchronous image callback:

```js
const editor = new HtmlDesigner('#htmlDesigner', {
    translations: fr,
    imageGalleryUrl: '/media/gallery.php'
});
```

The gallery returns a selection through the public API:

```js
window.parent.editor.insertImage({
    src: '/uploads/photo.jpg',
    alt: 'Mountain landscape',
    title: 'Mountain landscape'
});
```

When `title` is omitted, the alternative text is used by default. See
[Images and gallery](docs/images.md) for block images, inline images and gallery details.

## Toolbar and editing

The main toolbar uses two permanent rows:

1. history, character formatting and insertion;
2. paragraph formatting, indentation, drop caps, output and preview.

Commands can be hidden independently through `disabledToolbarButtons`. Content types
and section layouts can be filtered through `disabledContentBlocks` and
`disabledSections`.

See [Toolbar and text editing](docs/toolbar.md) for the complete command list and
configuration keys.

## Tables

The native Table content supports direct cell editing, row and column operations,
column resizing, rectangular multi-cell selection, merged cells, borders, padding and
alignment.

See [Table editing](docs/tables.md) for the current behaviour.

## Secure Free HTML

The native **Free HTML** content accepts custom markup while protecting the editor and
the exported page. Scripts, embedded styles, forms, event-handler attributes, unsafe
URLs and dangerous positioning rules are removed. Unapproved iframe sources are also
rejected.

```js
const editor = new HtmlDesigner('#htmlDesigner', {
    disabledContentBlocks: ['raw-html'] // Hide it when the host does not need it.
});
```

## Extensions and plugins

Host applications can register custom toolbar actions or reusable content blocks:

```js
editor.registerToolbarButton({
    id: 'insert-user',
    label: 'Insert user',
    icon: '👤',
    action: () => editor.insertAtCursor('{{ user.name }}')
});
```

Plugins can register blocks, properties, HTML importers and toolbar commands. See
[Plugin documentation](docs/plugins.md).

## Document model

A project contains rows, columns and content blocks. Column widths are relative integer
proportions, so `[2, 1]` produces a two-thirds/one-third layout while `[1, 1, 1]`
produces three equal columns.

See [Project JSON format](docs/project-format.md).

## Documentation

- [API and constructor options](docs/api.md)
- [Toolbar and text editing](docs/toolbar.md)
- [Images and gallery](docs/images.md)
- [Table editing](docs/tables.md)
- [Plugin development](docs/plugins.md)
- [Project JSON format](docs/project-format.md)
- [Release history](CHANGELOG.md)

The README describes the current release. Version-by-version implementation history is
kept exclusively in the changelog.

## Project structure

```text
src/
├── HtmlDesigner.js
├── blocks/
├── core/
├── lang/
├── layout/
├── toolbar/
├── html-designer.css
└── vhd-content.css
```

## Development

All source files are plain ES modules. No compilation step is required. JavaScript files
can be syntax-checked with Node.js:

```bash
find src demo -type f -name '*.js' -print0 | xargs -0 -n1 node --check
```

## Project authorship

Vanilla HTML Designer was initiated, directed and validated by **François Milhiet**.
Its design and development are carried out in collaboration with OpenAI's ChatGPT.
Functional direction, architectural decisions, real-world testing and final validation
remain under the responsibility of the project's initiator.

## License

Vanilla HTML Designer is distributed under the GNU Affero General Public License v3.0
(AGPL-3.0).
