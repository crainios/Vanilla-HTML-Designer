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


## Tables

Since 0.6.65, VHD includes a structured Table block. New tables use a 3 × 3
layout, with the first row configured as a semantic header by default.

Cells are edited directly in the canvas. The Properties panel provides:

- header row on/off;
- border color and width;
- cell padding;
- header background;
- add/remove row;
- add/remove column.

The JSON keeps table rows and cells as structured data, while public output uses
semantic HTML table elements. The block can be disabled with:

```js
disabledContentBlocks: ['table']
```

This first table implementation intentionally does not yet include merged cells,
per-cell styling or arbitrary row/column insertion positions.


### Contextual row and column editing

Since 0.6.66, table structure actions apply to the currently selected cell:

- add row above;
- add row below;
- remove current row;
- add column left;
- add column right;
- remove current column.

The selected cell is highlighted in the canvas. A table always retains at least
one row and one column.


### Table contextual structure menu

Since 0.6.67, structural table editing is no longer mixed with visual
properties. Right-click a cell, or use the visible `⋮` trigger on the selected
cell, to access:

- add row above;
- add row below;
- remove current row;
- add column left;
- add column right;
- remove current column.

The Properties panel only contains table appearance/configuration settings.


### Editor-only table controls

Since 0.6.68, contextual table controls are structurally separated from editable
cell content. The `⋮` trigger exists only in the editor DOM and is never part of
the JSON cell content or public HTML.

Projects saved with 0.6.67 are cleaned automatically when loaded/exported.


### Table column widths

Since 0.6.69, each table column has a percentage width. Select a cell and open
its contextual menu to change the width of that column.

When a column width is changed, VHD automatically redistributes the remaining
percentage among the other columns so the total remains 100%. The contextual
menu also provides `Répartir les colonnes également`.

Widths are stored as:

```json
"columnWidths": [25, 50, 25]
```

and are exported through a semantic `<colgroup>`.


### Central contextual table toolbar

Since 0.6.70, tables use a single toolbar centered above the table instead of a
menu on every cell. The toolbar becomes active according to the cell containing
the cursor.

It provides contextual row actions, contextual column actions, column width in
percent, and equal-width redistribution. Changing the numeric width updates the
table directly, so the toolbar remains visible while using the input arrows.


### Table toolbar position and cell focus

Since 0.6.71, the contextual table toolbar is positioned closer to the top of
the table block. Clicking anywhere in a table cell reliably focuses the inner
editable content, while direct clicks inside that content retain normal caret
placement.


### Direct table cell editing

Since 0.6.72, table `<th>` and `<td>` elements are directly contenteditable
again. The central table toolbar is completely outside cell content and uses
the existing block-control line, eliminating the additional vertical gap above
the table.


### Visible table toolbar with horizontal scrolling

Since 0.6.73, horizontal scrolling belongs to the inner `.vhd-table-scroll`
container rather than `.vhd-table-editor`. This allows the contextual toolbar
to sit above the table without being clipped by overflow.


### Multi-cell table selection

Since 0.6.74, table cells can be selected as a temporary rectangular range:

- click: select one cell;
- Shift + click: extend from the anchor cell to a rectangular range.

The selection itself is never stored. Each selected cell keeps its own
independent properties, for example:

```json
{
  "content": "Text",
  "properties": {
    "textAlign": "center",
    "verticalAlign": "middle",
    "color": "#1f2937",
    "backgroundColor": "#ffffff"
  }
}
```

Horizontal alignment, vertical alignment, text color and cell background can be
applied to the complete temporary selection. Structural row/column operations
and column width controls are disabled while more than one cell is selected.


### Main toolbar and multi-cell formatting

Since 0.6.75, the table toolbar contains structure controls only. Formatting is
not duplicated there.

With a rectangular multi-cell selection, the main VHD toolbar applies compatible
formats to every selected cell independently:

- bold, italic, underline and strike-through;
- superscript and subscript;
- font family and font size;
- text color and background color;
- horizontal alignment.

The temporary selection is not persisted. Each cell keeps its own properties
and HTML content.


### Persistent multi-cell formatting selection

Since 0.6.76, a rectangular table-cell selection remains active while the user
applies several formatting commands from the main toolbar. Browser focus and
DOM selection changes used internally to format each contenteditable cell do
not alter the editor-level cell range.


### Mouse table selection and column resizing

Since 0.6.77:

- click keeps normal single-cell editing;
- Shift + click keeps rectangular range selection;
- dragging from a cell across other cells creates a rectangular temporary selection;
- dragging a separator between columns resizes the two adjacent columns.

Column resizing preserves the combined percentage of the two affected columns,
with a 5% minimum per column, and writes the result to `columnWidths`.


### Per-cell table borders

Since 0.6.78, each table cell can independently store:

```json
"properties": {
  "borderWidth": 2,
  "borderStyle": "dashed",
  "borderColor": "#6b7280"
}
```

When several cells are selected, the properties panel applies the chosen border
settings independently to each selected cell. No group object is created.

Cells without explicit border properties continue to use the table-level
border settings.


### Compact border properties heading

Since 0.6.79, the contextual cell-border subsection is simply titled
`Bordures`, without displaying the number of selected cells.


### Merge and unmerge table cells

Since 0.6.80, a rectangular selection of unmerged cells can be merged with the
contextual table toolbar. The top-left cell becomes the visible anchor:

```json
{
  "content": "Visible content",
  "properties": {
    "rowspan": 2,
    "colspan": 3
  }
}
```

Covered cells remain in the logical JSON grid and contain:

```json
"mergedInto": {
  "row": 0,
  "column": 0
}
```

Their original content and properties are therefore not destroyed. When the
merged cell is separated, the underlying cells become visible again.

Public HTML uses standard `rowspan` and `colspan`. HTML import reconstructs the
logical grid from these attributes.

For structural safety in 0.6.80, adding/removing rows or columns is disabled
while a table contains merged cells; unmerge first before changing the grid.


### Merged cell content

Since 0.6.81, merging cells keeps all non-empty source contents visible in the
merged cell. They are combined in reading order and separated with `<br>`.

Example:

```text
Cell A | Cell B
Cell C | Cell D
```

becomes:

```html
Cell A<br>Cell B<br>Cell C<br>Cell D
```

The user can then decide what to keep or remove.

The original logical-cell contents are still preserved so that unmerging can
restore the original grid.


### Visible empty table rows

Since 0.6.82, empty table cells keep a minimum editor height of 34px. This
makes newly inserted empty rows and empty merged cells clearly visible and
clickable.

This visual aid exists only in the editor and does not affect exported HTML.


### Deleting rows and columns with merged cells

Since 0.6.83, rows and columns can be deleted even when the table contains
merged cells. VHD recalculates `rowspan`, `colspan` and `mergedInto`
coordinates automatically.

If the deleted row or column contains the merge anchor, the next surviving
logical cell becomes the new anchor while preserving the visible merged
content.

Adding rows or columns while merges exist remains intentionally disabled for
now.


### Adding rows and columns with merged cells

Since 0.6.84, adding rows and columns is compatible with merged cells.

- Insertion before a merge shifts its logical anchor.
- Insertion inside a merge expands its `rowspan` or `colspan`.
- `mergedInto` coordinates are rebuilt automatically.
- Existing contents and properties remain preserved.

Together with 0.6.83, all four structural operations — add/remove row and
add/remove column — now work with merged cells.


### Quick table selection and Tab row creation

Since 0.6.85, the contextual table toolbar provides:

- `L` — select the current logical row;
- `C` — select the current logical column;
- `▦` — select the entire table.

These commands use the existing temporary multi-cell selection; no selection
group is stored in JSON.

Native `Tab` / `Shift+Tab` navigation remains unchanged. When `Tab` is pressed
from the logical bottom-right cell, VHD automatically creates a new row and
places the caret in its first cell. This also works when the final visible
cell is a merged cell covering the bottom-right logical position.


### Ergonomic row, column and table selection

Since 0.6.86, row/column/table selection no longer uses `L`, `C` or `▦`
buttons in the contextual toolbar.

Instead:

- hover the left margin of a row, then click to select that row;
- hover just above a column, then click to select that column;
- hover the top-left corner, then click to select the whole table.

These controls are editor-only overlays and are never exported in public HTML.
They use the same transient logical selection model as drag and Shift+click.


### Visible table selectors and inherited Tab row formatting

Since 0.6.87, the row/column/table selector overlay is attached to the outer
table editor, so its margins are no longer clipped by horizontal scrolling.

A row created automatically with `Tab` from the final cell inherits the visual
properties of the previous last row while remaining empty. Merge metadata is
explicitly excluded from this inheritance.


### Reliable row selection margin

Since 0.6.88, row selectors are positioned from the rendered row rectangles
relative to the table. This makes the left-margin row-selection controls
reliable even when the selector overlay is outside the scrolling wrapper.


### Dedicated row-selector gutter

Since 0.6.89, the editor reserves an 18px left gutter beside tables. Row
selectors live inside this gutter instead of outside the block, making them
reliably visible and clickable without affecting exported HTML.


### Row selector DOM compatibility

Since 0.6.90, row-selector geometry uses `table.rows` rather than requiring
rows to be inside a `<tbody>`. This supports both editor-created tables and
browser/imported table structures.


### Compact table selector gutter

Since 0.6.91, the editor-only row-selector gutter is 12px wide instead of
18px. This keeps row selection discoverable while reducing unused space.


### Compact SVG table toolbar

Since 0.6.92, the contextual table toolbar uses compact blue buttons with
white inline SVG icons. The icons are embedded directly in the editor,
require no external library, and retain accessible titles/ARIA labels.


### Table text selection and toolbar spacing

Since 0.6.93, dragging inside a non-empty table cell keeps native browser text
selection. Rectangular table-cell selection remains available with Shift+click
and the row/column/table selectors, and mouse dragging can still start from an
empty cell.

The editor also adds an 8px top gutter between the contextual table toolbar and
the table itself.


### Per-cell padding and vertical alignment

Since 0.6.94, selected table cells expose:

- cell padding;
- vertical alignment (`top`, `middle`, `bottom`).

Each selected cell stores the values independently. Without a cell-specific
padding value, the table-level `cellPadding` remains the fallback.

The editor-only top gutter below the contextual table toolbar is now 12px.


### Vertical alignment and structural actions

Since 0.6.95, exported table cells carry explicit vertical-alignment classes
(`vhd-valign-top`, `vhd-valign-middle`, `vhd-valign-bottom`) handled by
`vhd-content.css`, ensuring identical behavior in Preview and public output.

A complete row selection keeps row add/remove actions enabled, and a complete
column selection keeps column add/remove actions enabled.


### Persistent table-cell horizontal alignment

Since 0.6.96, horizontal alignment applied to a single table cell is stored in
the cell's `properties.textAlign`, exactly like a multi-cell selection. It
therefore survives JSON saving, re-rendering, Preview and HTML export.


### Logical-grid selection with merged cells

Since 0.6.97, mouse-drag table selection resolves its target from the logical
row/column grid rather than the DOM cell under the pointer. This keeps
rectangular selection usable even where `rowspan` or `colspan` hides logical
cells from the rendered DOM.


### Text selection and cell-range drag

Since 0.6.98, a mouse drag inside a table cell determines its intent
dynamically. As long as the pointer remains in the starting logical cell, the
browser selects text normally. As soon as the pointer crosses into another
logical cell, VHD switches to rectangular cell selection.


### Delete selected cell contents and independent borders

Since 0.6.99, pressing `Delete` while a multi-cell table range is active clears
the selected cell contents while preserving structure and formatting.

Table-cell borders can also be enabled or disabled independently on the Top,
Right, Bottom and Left sides. Disabled edges use CSS `hidden` so collapsed
table borders cannot be restored by the neighbouring cell.


### Mouse resizing for inline images

Since 0.6.100, inline images can be resized directly with left/right mouse
handles. The handles are editor-only overlays and work equally in text blocks
and table cells. The resulting width is stored through the existing
`data-size` percentage and remains synchronized with the Properties panel.


### Reliable inline-image resize handles in tables

Since 0.6.101, inline-image resize handles use a viewport-fixed overlay attached
to `document.body`. This makes the handles independent from table overflow,
horizontal scrolling and nested editor layout containers.


### Inline-image alignment inside table cells

Since 0.6.102, Left, Center and Right alignment of inline images is applied
through explicit block/margin layout and persisted immediately in the logical
table-cell HTML. The same state is preserved when the image is resized.


### Contextual main-toolbar alignment for inline images

Since 0.6.103, selecting an inline image changes the meaning of the main
alignment menu: Left, Center and Right align the image itself. Outside an image
selection, the same controls continue to format text or selected table cells.


### Reactive table selector geometry

Since 0.6.104, table row/column selector overlays automatically follow
rendered geometry changes. Text wrapping, inline-image resizing, cell padding,
borders, merges and structural DOM changes trigger a synchronized geometry
refresh through `ResizeObserver` / `MutationObserver`.


### Toolbar dropdown dismissal

Since 0.6.105, main-toolbar dropdowns close automatically whenever the user
clicks outside a toolbar dropdown. This applies to complementary formatting,
Lists, Alignment and Custom actions.


### Inline-image resize overlay cleanup

Since 0.6.106, deleting a selected inline image immediately removes its
editor-only resize frame and handles. This works in both normal editable text
and table cells, including keyboard deletion.


### Unified toolbar and editor frame

Since 0.6.107, the main toolbar visually forms the header of a common framed
workspace containing both the editable canvas and the Properties panel. The
toolbar has a subtle lower shadow and the workspace adds a small inner padding.


### Custom actions split-button

Since 0.6.108, the Custom actions toolbar control uses a compact split-button
appearance with a dedicated "+" segment and a dedicated dropdown-caret segment.


### Section shadow presentation

Since 0.6.109, the visual placement of sections/columns uses a medium shadow
instead of a dashed border.


### Zone shadow presentation

Since 0.6.110, the medium shadow applies to the complete editor zone/section,
not to its internal columns. Column styling remains unchanged from 0.6.108.
