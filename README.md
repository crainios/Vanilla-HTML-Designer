# Vanilla HTML Designer

A lightweight visual HTML content designer written in **Vanilla JavaScript**.

**No React. No Vue. No Angular. No jQuery. No build step required.**

Vanilla HTML Designer is a block-based editor for creating reusable web content.  
The editable JSON project is kept separate from the generated HTML.

## Goals

- Keep the interface simple for non-technical users.
- Support up to six columns while keeping layout choices understandable.
- Produce clean web-oriented HTML.
- Remain framework-independent.
- Allow host applications to provide their own media library and persistence.

## Content structure

The editor is built around one main content container containing vertically stacked rows.

Each row has its own independent column layout:

```text
Main content
├── Row 1: 1 column
├── Row 2: 2 columns
├── Row 3: 1 column
├── Row 4: 3 columns
└── Row 5: 1 column
```

A new row can be inserted before, between or after existing rows.  
Each row can use a different layout without affecting the others.

## Initial features

- Visual block editor
- Layout engine supporting 1 to 6 columns
- Layouts:
  - 1 column
  - 2 equal columns
  - 2 columns: `2/3 + 1/3`
  - 2 columns: `1/3 + 2/3`
  - 3 equal columns
  - 4 equal columns
  - 5 equal columns
  - 6 equal columns
- Heading block
- Text block
- Image block
- Button block
- Divider block
- Spacer block
- Plain-text paste sanitization (external HTML/styles are discarded)
- Rich-text formatting:
  - paragraphs
  - H1 to H6
  - bold
  - italic
  - underline
  - strike-through
  - ordered and unordered lists
  - links
  - blockquote
  - alignment
  - text color
- Reordering and deletion
- Undo / redo
- JSON import/export
- HTML export
- External image-picker hook
- English and French interface
- No framework and no build tool required

## Project structure

```text
src/
├── HtmlDesigner.js
├── core/
│   ├── Editor.js
│   ├── History.js
│   └── Serializer.js
├── blocks/
│   ├── BlockFactory.js
│   ├── TextBlock.js
│   ├── HeadingBlock.js
│   ├── ImageBlock.js
│   ├── ButtonBlock.js
│   ├── DividerBlock.js
│   └── SpacerBlock.js
├── layout/
│   └── Grid.js
├── toolbar/
│   └── TextToolbar.js
├── lang/
│   ├── en.js
│   └── fr.js
└── html-designer.css
```

## Quick start

Serve the project over HTTP:

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

    async onImageSelect() {
        return {
            src: '/uploads/image.jpg',
            alt: 'Description'
        };
    }
});
</script>
```

## Main API

```javascript
const project = editor.getData();
const html = editor.getHtml();

editor.load(project);
editor.undo();
editor.redo();
```

The JSON project is the editable source. The HTML output is intended for display or storage by the host application.

## Grid model

A row contains between 1 and 6 columns. Each column has a relative integer width.

```javascript
{
    type: 'row',
    columns: [
        {
            width: 2,
            blocks: []
        },
        {
            width: 1,
            blocks: []
        }
    ]
}
```

`[2, 1]` produces a 2/3 + 1/3 layout.  
`[1, 1, 1, 1]` produces four equal columns.

This relative model allows 1 to 6 equal columns as well as asymmetric layouts without forcing every row into a fixed six-unit sum.

## License

Vanilla HTML Designer is distributed under the GNU Affero General Public License v3.0 (AGPL-3.0).

## AI-assisted development

Vanilla HTML Designer is a project initiated, directed and validated by **François Milhiet**.

Its design and development are carried out in collaboration with **OpenAI's ChatGPT**, through prompts, analyses, iterations and validations.

Functional direction, architectural decisions, real-world testing and final validation remain under the responsibility of the project's initiator.


### Default font family

The editor font can be configured at initialization:

```js
const designer = new HtmlDesigner('#designer', {
    defaultFontFamily: 'Arial, sans-serif'
});
```

`system-ui` remains the default when `defaultFontFamily` is omitted. Any valid CSS `font-family` value can be used. If the configured family is not one of the predefined toolbar choices, it is added automatically to the font selector.



## Simplified editing model

Since 0.6.0, the internal `row -> column -> block` model is deliberately less visible in the UI.

- A new page starts with editable text.
- Adding a new layout automatically creates editable text in every column.
- The `+` between areas is the main way to change the page layout.
- Technical borders and content controls appear mainly on hover, focus or selection.
- The JSON model remains unchanged and keeps rows, columns and blocks internally.


## Custom toolbar actions

The host application can add its own commands to the toolbar with `customButtons`.
The `+` menu is displayed only when at least one valid custom action is configured.

```javascript
function insertUserName({ insert }) {
    insert('{{ user.name }}');
}

async function insertSignature() {
    const signature = await getSignature();

    return {
        content: `<strong>${signature}</strong>`,
        html: true
    };
}

const editor = new HtmlDesigner('#htmlDesigner', {
    translations: fr,
    customButtons: [
        {
            icon: '👤',
            label: 'Nom utilisateur',
            action: 'insertUserName'
        },
        {
            icon: '✍',
            label: 'Signature',
            action: insertSignature
        }
    ]
});
```

Each entry supports:

- `icon`: text, emoji or SVG markup displayed on the left.
- `label`: menu text displayed on the right.
- `action`: either a JavaScript function or the name of a global JavaScript function.

The custom function receives a context object:

```javascript
{
    editor,
    editable,
    insert
}
```

`insert(content)` inserts plain text at the saved editor cursor position.

`insert(content, { html: true })` inserts HTML at the saved cursor position.

A custom function can alternatively return its content:

```javascript
return 'Plain text';
```

or:

```javascript
return {
    content: '<strong>HTML content</strong>',
    html: true
};
```

The public API also exposes the same insertion mechanism:

```javascript
editor.insertAtCursor('Text');
editor.insertAtCursor('<strong>HTML</strong>', { html: true });
```


## Import existing HTML

Vanilla HTML Designer can initialize directly from existing HTML:

```javascript
const editor = new HtmlDesigner('#htmlDesigner', {
    translations: fr,
    html: document.querySelector('#content').value
});
```

This makes it possible to replace a traditional HTML editor without requiring an existing Vanilla HTML Designer JSON document.

The importer:

- recognizes HTML previously generated by Vanilla HTML Designer and restores its rows/columns;
- converts `h1` to `h6` to heading blocks;
- converts standalone images / figures to image blocks;
- converts horizontal rules to divider blocks;
- recognizes Vanilla HTML Designer button and spacer markup;
- keeps ordinary paragraphs, lists, blockquotes, tables, inline formatting, links and other regular HTML inside editable text content;
- removes dangerous elements such as `script`, `style`, `object` and `embed`;
- removes inline event attributes such as `onclick`;
- rejects dangerous URL protocols such as `javascript:`;
- only keeps iframe embeds from supported video providers.

Existing HTML can also be loaded later:

```javascript
editor.loadHtml(html);
```

### Typical form integration

```html
<textarea id="content" name="content" hidden>
    ... existing HTML ...
</textarea>

<div id="htmlDesigner"></div>

<script type="module">
import HtmlDesigner from '/lib/Vanilla-HTML-Designer/src/HtmlDesigner.js';
import fr from '/lib/Vanilla-HTML-Designer/src/lang/fr.js';

const form = document.querySelector('#articleForm');
const textarea = document.querySelector('#content');

const editor = new HtmlDesigner('#htmlDesigner', {
    translations: fr,
    html: textarea.value
});

form.addEventListener('submit', () => {
    textarea.value = editor.getHtml();
});
</script>
```


## Image gallery integration

A host application can provide an image-gallery URL directly at initialization:

```javascript
window.editor = new HtmlDesigner('#htmlDesigner', {
    translations: fr,
    html: textarea.value,
    imageGalleryUrl: '/modale/image-gallery.php'
});
```

`imageGalleryUrl` can also be a function or async function:

```javascript
imageGalleryUrl: () => {
    return '/modale/image-gallery.php?id='
        + document.querySelector('#article_id').value;
}
```

When configured, the toolbar Image command and the Image block “Choose image” action open the same gallery in a native Vanilla HTML Designer dialog.

The gallery returns the selected image through the public API:

```javascript
window.parent.editor.insertImage({
    src: '/uploads/photo.jpg',
    alt: 'Description de la photo'
});
```

`insertImage()` automatically inserts the image in the correct context: at the saved text cursor position for an inline image, or into the Image block that opened the gallery.

The gallery closes automatically after insertion.

It can also be closed explicitly:

```javascript
window.parent.editor.closeImageGallery();
```

The existing `onImageSelect` callback remains supported when `imageGalleryUrl` is not configured.


### Inline image properties

An image inserted inside editable text can be selected by clicking it. Its settings are then shown in the main Properties panel:

- alignment: left, center or right;
- width: 1 to 100%;
- space around the image, in pixels.

Left- and right-aligned images remain floated so text can flow around them. A centered image becomes a block image centered in the text flow.


### Link properties

Clicking an existing link inside editable text opens its settings in the Properties panel.

Available settings:

- URL;
- open in the same window;
- open in a new tab (`target="_blank"` with `rel="noopener noreferrer"`);
- remove the link while preserving its text.

The Link toolbar button also displays an active state when the cursor is inside an existing link.
