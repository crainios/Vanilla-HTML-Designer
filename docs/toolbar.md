# Toolbar and text editing

The main VHD toolbar is permanently divided into two rows. Commands do not move when
the selection changes. On narrow screens, each row scrolls horizontally.

## First row

The first row contains document history, character formatting and insertion commands:

- Paste special
- Undo and Redo
- Clear formatting
- Find / Replace
- Bold, Italic, Underline and Strike-through
- Superscript and Subscript
- Text colour and text background colour
- Letter spacing
- Font family and font size
- Link
- Inline image, video and code insertion
- Emoji and special-character insertion

Letter spacing applies only to selected text. Clear formatting replaces the selected
formatted structure with plain text while preserving the surrounding document.

## Second row

The second row contains paragraph and document commands:

- Paragraph or Heading 1–6
- Line height
- Lists
- Citation
- Alignment
- Decrease and Increase indent
- Drop cap
- Custom host actions, when configured
- Shortcode source/rendered mode
- JSON export, HTML export, Preview and Fullscreen
- About VHD

Line height applies to every paragraph or block touched by the selection. Paragraph and
heading indentation uses `margin-left` in 2rem steps. List indentation remains structural
so nested lists retain semantic HTML.

The Drop cap button toggles the current paragraph and reflects its active state. Drop-cap
size, colour, spacing and line count are edited in Properties.

## Lists

The Lists menu provides:

- Standard
- Square
- Circle
- Numbers
- Lowercase letters
- Uppercase letters
- Lowercase Roman numerals
- Uppercase Roman numerals
- Clear

When plain lines begin with hyphens, VHD removes those textual markers when converting
the selection to a semantic list. Applying another list style to an existing list changes
its style without removing the list structure.

## Disabling controls

Use stable language-independent keys:

```js
const editor = new HtmlDesigner('#htmlDesigner', {
    disabledToolbarButtons: [
        'video',
        'shortcodeMode',
        'exportJson'
    ]
});
```

Available native keys:

```text
pasteSpecial
undo
redo
clearFormatting
searchReplace
bold
italic
underline
strike
superscript
subscript
textColor
backgroundColor
letterSpacing
fontFamily
fontSize
link
inlineImage
video
code
emoji
specialCharacters
paragraph
lineHeight
lists
quote
alignment
outdent
indent
dropCap
customActions
shortcodeMode
exportJson
exportHtml
preview
fullscreen
```

Unknown keys are ignored. Separators are cleaned up automatically. The About/VHD identity
button remains visible.

## Content and section menus

Hide native content types with `disabledContentBlocks`:

```js
disabledContentBlocks: ['image', 'table', 'raw-html']
```

Native content keys are `heading`, `text`, `image`, `button`, `divider`, `spacer`,
`table` and `raw-html`.

Filter section layouts with `disabledSections`:

```js
disabledSections: ['five', 'six']
```

Available layout keys are `one`, `twoEqual`, `twoWideLeft`, `twoWideRight`, `three`,
`four`, `five` and `six`. Existing loaded content is preserved even when its creation
command is hidden.

## Sticky toolbar

The toolbar is sticky by default. Account for an application header with:

```js
const editor = new HtmlDesigner('#htmlDesigner', {
    stickyToolbar: true,
    stickyToolbarOffset: 60
});
```

Set `stickyToolbar: false` to disable it.

## Custom actions

Use `customButtons` during initialisation or `registerToolbarButton()` at runtime. See
[Plugin development](plugins.md) for reusable toolbar extensions.
