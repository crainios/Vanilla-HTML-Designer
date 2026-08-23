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


## Code blocks

Vanilla HTML Designer can insert dedicated code blocks from the text toolbar using **Insert code**.
The generated HTML uses semantic markup:

```html
<pre class="vhd-code"><code>...</code></pre>
```

For public pages, load the standalone enhancer:

```html
<script src="/path/to/Vanilla-HTML-Designer/src/vhd-code.js" defer></script>
```

`vhd-code.js` has no framework dependency. It scans every `pre.vhd-code` block on the page,
automatically loads `vhd-code.css` from the same directory, formats the code area and adds a
copy-to-clipboard button. It also observes dynamically inserted content.

If the CSS file is stored elsewhere, specify it explicitly:

```html
<script
    src="/path/to/vhd-code.js"
    data-css="/assets/vhd-code.css"
    defer
></script>
```


## Public content styles

Pages that display HTML generated by Vanilla HTML Designer should load the public content stylesheet:

```html
<link rel="stylesheet" href="/lib/Vanilla-HTML-Designer/src/vhd-content.css">
```

This stylesheet contains presentation rules for rendered content such as citations (`blockquote`),
without requiring the full editor stylesheet on public pages.

If the page also contains Code blocks, keep loading the code enhancer:

```html
<link rel="stylesheet" href="/lib/Vanilla-HTML-Designer/src/vhd-content.css">
<script src="/lib/Vanilla-HTML-Designer/src/vhd-code.js" defer></script>
```

`vhd-code.js` automatically loads `vhd-code.css`.


## Sticky toolbar

The toolbar remains visible while scrolling long documents by default.

```js
const editor = new HtmlDesigner('#htmlDesigner', {
    stickyToolbar: true,
    stickyToolbarOffset: 0
});
```

If the host application already has a fixed header, set `stickyToolbarOffset`
to that header height:

```js
const editor = new HtmlDesigner('#htmlDesigner', {
    stickyToolbar: true,
    stickyToolbarOffset: 60
});
```

Disable the behavior if needed:

```js
stickyToolbar: false
```


### Public layout stylesheet

`vhd-content.css` is required on public pages. It contains the layout rules for all exported
VHD rows and columns (1, 1/1, 2/1, 1/2, 3, 4, 5 and 6 columns), responsive stacking,
images, inline media, buttons, dividers, spacers, citations and imported tables.

Without this stylesheet, CSS-grid variables such as `--vhd-grid-units` and `--vhd-span`
remain present in the HTML but the browser has no rule telling `.vhd-row` and `.vhd-col`
how to use them.


## Disabling toolbar buttons

Toolbar controls can be hidden at initialization with `disabledToolbarButtons`.
The About / Vanilla HTML Designer identity button is always displayed and cannot be disabled.

```js
const editor = new HtmlDesigner('#htmlDesigner', {
    disabledToolbarButtons: [
        'undo',
        'redo',
        'clearFormatting',
        'code',
        'emoji',
        'exportJson'
    ]
});
```

Available keys:

```text
undo
redo
clearFormatting
bold
italic
underline
strike
textColor
backgroundColor
fontFamily
fontSize
link
inlineImage
video
code
emoji
specialCharacters
paragraph
lists
quote
alignment
customActions
exportJson
exportHtml
preview
fullscreen
```

Unknown keys are ignored. Separators are automatically cleaned up when adjacent controls are hidden.


## Disabling “Add content” block types

The items offered by the `+` **Add content** menu can be hidden at initialization with
`disabledContentBlocks`.

```js
const editor = new HtmlDesigner('#htmlDesigner', {
    disabledContentBlocks: [
        'image',
        'button',
        'code'
    ]
});
```

Available block keys:

```text
heading
text
image
button
divider
spacer
code
```

The `+` button remains visible as long as at least one content type is available.
If all content types are disabled, the `+` **Add content** control is hidden automatically.

This option affects the manual **Add content** menu. Existing blocks already present in
loaded JSON/HTML are preserved and remain editable.


## Disabling section layouts

The layouts offered by the `+` **Add section** control can be filtered with `disabledSections`.

```js
const editor = new HtmlDesigner('#htmlDesigner', {
    disabledSections: [
        'five',
        'six'
    ]
});
```

Available section keys:

```text
one
twoEqual
twoWideLeft
twoWideRight
three
four
five
six
```

They correspond to:

```text
one          → 1 column
twoEqual     → 1/2 + 1/2
twoWideLeft  → 2/3 + 1/3
twoWideRight → 1/3 + 2/3
three        → 3 columns
four         → 4 columns
five         → 5 columns
six          → 6 columns
```

If all section layouts are disabled, the `+ Add section` control is hidden automatically.

This setting only affects the creation of new sections. Existing sections loaded from JSON/HTML are preserved.


## Properties-driven editing

Visual blocks now follow a consistent editing model:

- Heading, Text and Code content is edited directly in the canvas.
- Image source, gallery selection, alternative text and presentation settings are edited in the Properties panel.
- Button text, URL, target and presentation settings are edited in the Properties panel.
- Divider and Spacer settings are edited in the Properties panel.
- The canvas therefore stays close to the final public rendering instead of displaying technical form fields inside content blocks.


## Fullscreen mode

The toolbar includes a **Fullscreen** button immediately after **Preview**.

- Click once to expand the editor to the whole viewport.
- Click again to restore the normal layout.
- Press `Escape` to leave fullscreen mode.
- Page scrolling is temporarily disabled while the editor is fullscreen.
- The fullscreen toolbar button can be hidden with `disabledToolbarButtons: ['fullscreen']`.
- The About button remains always available.


## Status message API

Vanilla HTML Designer exposes a public `setStatus()` method for displaying a discreet
application-level message in the Properties panel, directly under the document statistics.

```js
editor.setStatus('Sauvegarde…', 'info');

editor.setStatus(
    'Sauvegardé automatiquement à 10:48',
    'success'
);

editor.setStatus(
    'Échec de la sauvegarde automatique',
    'error'
);
```

Supported types: `info`, `success`, `error`.

Clear the status with:

```js
editor.setStatus('');
```

The status API is generic and independent of autosave.


## Render JSON without creating an editor

`HtmlDesigner.renderJson()` converts a Vanilla HTML Designer project directly to its final HTML
without creating a visible editor and without modifying an existing editor instance.

It accepts either the JSON string stored in the database:

```js
const html = HtmlDesigner.renderJson(ges_co_tarif_json);

document.querySelector('#autosavePreview').innerHTML = html;
```

or an already parsed project object:

```js
const project = JSON.parse(ges_co_tarif_json);
const html = HtmlDesigner.renderJson(project);
```

For the public presentation styles, include:

```html
<link rel="stylesheet" href="/lib/Vanilla-HTML-Designer/src/vhd-content.css">
```

Invalid JSON or an object that is not a VHD project throws an explicit error.


## Compact toolbar style

Since version 0.6.49, the main toolbar uses a compact borderless presentation:
light grey background, tighter spacing, and subtle hover/active states.


## Find / Replace

The toolbar includes a **Find / Replace** command after Clear formatting.

It searches all Heading, Text and Code blocks in the current document.

Features:

- Previous / Next result navigation
- `Enter` for next result and `Shift+Enter` for previous
- Replace current occurrence
- Replace all occurrences
- Optional case-sensitive search
- Preserves the HTML structure of Heading and Text blocks while replacing text
- Code blocks are searched and replaced as plain text
- The command can be hidden with `disabledToolbarButtons: ['searchReplace']`

The search intentionally targets document text only. Image URLs, alternative text, button
URLs and other block properties are not included.


## Superscript, subscript and indentation

The character toolbar includes compact `x²` and `x₂` controls for semantic
`<sup>` and `<sub>` formatting.

The Alignment dropdown also contains:

- Decrease indent
- Increase indent

Indentation uses the browser editing model so it works with paragraphs and list
items while preserving the current selection.

These controls can be hidden independently:

```js
disabledToolbarButtons: [
    'superscript',
    'subscript',
    'indent',
    'outdent'
]
```


### Indentation behavior

Since 0.6.52, paragraph and heading indentation is independent from Citation:
it uses `margin-left` in 2rem steps and never creates a `<blockquote>`.
List indentation remains structural so nested lists continue to use semantic list markup.


## Grouped secondary formatting

Since 0.6.53 the main character toolbar keeps the most common controls directly visible:

- Bold
- Italic
- Underline
- Font family
- Font size

Less frequent formatting commands are grouped in **More formatting**:

- Strike
- Superscript
- Subscript
- Text color
- Text background color

The existing `disabledToolbarButtons` keys for these commands remain valid and are
applied inside the dropdown.


## Visual image resizing

Since 0.6.54, Image blocks can be resized directly in the canvas by dragging
the handles displayed on the left and right edges of the selected/hovered image.

- Aspect ratio is preserved.
- Width remains percentage-based and is constrained to 5–100%.
- The Width field in Properties is synchronized while dragging.
- Alignment (left, center, right) is preserved.
- The existing numeric Width property remains available for precise values.


## Block drag and drop

Since 0.6.55, content blocks can be moved using the dedicated `⋮⋮` handle shown
with the existing block controls.

A block can be dropped:

- before or after another block in the same column;
- into another column;
- into a column belonging to another zone;
- into an empty column.

A thin insertion marker shows the exact target position. The operation uses
Pointer Events and therefore supports mouse, pen and touch input. Dragging
changes only the order/location of the existing block object; the project JSON
format is unchanged. Undo/Redo records each completed move.

The Up and Down buttons remain available.


### Drag implementation note

Version 0.6.56 replaces the first drag implementation with document-level Pointer
Events and a lightweight drag preview. No full block clone is created while moving,
which keeps editing responsive on complex blocks.


### Drag auto-scroll

Since 0.6.57, dragging a block near the top or bottom edge of the viewport
automatically scrolls the document. The closer the pointer is to the edge, the
faster the scroll. In fullscreen mode, the editor canvas is scrolled instead of
the page.


### Continuous target tracking during auto-scroll

Since 0.6.58, the drop position is recalculated on every auto-scroll frame. This
allows a block to cross very tall content in both directions even when the
pointer remains stationary near the top or bottom edge. Auto-scroll is also
slightly faster than in 0.6.57.


### Same-column downward drag

Version 0.6.59 fixes an index calculation error affecting downward moves in the
same column. Drop positions are calculated from a list that excludes the source
block, so the destination index must not be decremented again before insertion.


### Canvas presentation

Since 0.6.60, the editor canvas no longer adds a grey background or outer padding
around content zones. Zones are displayed directly against the editor background.


### Editor-only column background

Since 0.6.61, the light grey `#fafbfc` visible in editor columns is purely an
editing aid. It is not stored as the default column background and is not
exported to public HTML. A `background-color` is exported only after the user
explicitly chooses a column background.

Legacy projects containing the former automatic `#fafbfc` value are normalized
to transparent when loaded.


## Zone drag and drop

Since 0.6.62, complete zones can be reordered vertically using the dedicated
`⋮⋮` handle in the zone controls. The entire zone moves as one unit, including
its column layout, column properties and all content blocks.

The drag includes:

- a precise insertion marker;
- automatic edge scrolling;
- mouse, pen and touch support through Pointer Events;
- Undo/Redo support.

Horizontal column dragging is intentionally not implemented: zone dragging only
changes the vertical order of complete zones.


### Faster drag auto-scroll

Since 0.6.63, automatic scrolling during block and zone dragging is substantially
faster. The scroll speed now ranges from 8px to 44px per animation frame while
remaining progressive according to the pointer distance from the viewport edge.


### Simplified movement controls

Since 0.6.64, the legacy Up/Down buttons have been removed from both block and
zone controls. Drag-and-drop is the primary movement mechanism.

Controls are now:

```text
⋮⋮   ×
```

The first zone still keeps its Add Zone control.
