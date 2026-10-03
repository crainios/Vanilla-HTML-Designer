# API

## Constructor

```javascript
const editor = new HtmlDesigner(selectorOrElement, options);
```

Options:

- `translations`: partial or complete translation object.
- `html`: existing HTML imported when the editor starts.
- `defaultFontFamily`: default editable-content font stack (`system-ui` by default).
- `imageGalleryUrl`: fixed URL, function or async function used by the image gallery dialog.
- `onImageSelect`: async callback returning `{ src, alt, title }`. When `title` is omitted or empty, the `alt` value is used by default.
- `stickyToolbar`: set to `false` to disable the sticky toolbar.
- `stickyToolbarOffset`: fixed application-header height in pixels.
- `disabledToolbarButtons`: array of toolbar keys to hide.
- `disabledContentBlocks`: array of native content types to hide from insertion menus.
- `disabledSections`: array of section layouts to hide.
- `customButtons`: host application toolbar actions.
- `compositeStyles`: optional initial array of reusable composite styles.
- `onCompositeStylesChange(styles)`: callback invoked after a style is created, updated or deleted. The host application is responsible for persistence; VHD never stores composite styles in `localStorage`.
- `plugins`: plugin modules loaded at initialisation.
- `shortcodeMode`, `shortcodeTags`, `shortcodeDisplay` and `renderShortcode`: protected-shortcode configuration.

## getData()

Returns a deep copy of the editable project.

## getHtml()

Returns generic web HTML generated from the current project.

## load(project)

Loads a project object.

## loadHtml(html)

Imports existing HTML into the editable VHD project.

## undo()

Restores the previous project state.

## redo()

Restores the next project state.

## insertAtCursor(content, options)

Inserts plain text at the saved caret. Pass `{ html: true }` for trusted HTML.

## insertImage(image)

Inserts or updates an image using `{ src, alt, title }`. An omitted `title` defaults to
`alt`.

## openImageGallery() / closeImageGallery()

Opens or closes the configured image-gallery dialog.

## setStatus(message, type)

Displays an application status in Properties. Supported types are `info`, `success` and
`error`; use an empty message to clear it.

## HtmlDesigner.renderJson(project)

Returns final HTML from a project object or JSON string without creating an editor.


## Protected shortcodes

Tokens of the form `<shortcode>{NAME}</shortcode>` are protected in editable
text, headings and table cells. They display a tooltip with their source and
can be selected, copied, cut or deleted as a whole. Both JSON and `getHtml()`
keep the original shortcode, never the preview HTML or editor attributes.

```javascript
const editor = new HtmlDesigner('#designer', {
    html: '<p>Hello <shortcode>{USER_NAME}</shortcode></p>',
    shortcodeMode: 'shortcode', // 'shortcode' (default) or 'rendered'
    shortcodeTags: ['pdf_id', 'product_id'], // optional application-specific elements
    shortcodeDisplay: (source, { tagName }) => (
        tagName === 'shortcode' && source === '{USER_NAME}' ? 'inline' : 'block'
    ),
    async renderShortcode(source, { display, tagName, html }) {
        // Call your application's interpreter here; return HTML or Promise<HTML>.
        return applicationRenderShortcode(html);
    }
});
editor.insertAtCursor('<shortcode>{USER_NAME}</shortcode>', { html: true });
editor.setShortcodeMode('rendered');
editor.setShortcodeMode('shortcode');
```

The renderer receives the token including braces. There is no dependency on
BlogThèque. Missing renderers, exceptions, rejected promises and non-string
results leave the source label visible with a preview-unavailable message. A loading message is shown while a promise is pending. Calling `setShortcodeMode('rendered')`
again refreshes previews. Old asynchronous results are ignored after refresh,
mode changes or removal of their editor element.

`shortcodeDisplay` is optional. By default, a token alone in its parent is a
block; otherwise it is inline. The callback can return `inline` or `block`.

Only the generic `<shortcode>` element is recognized by default. Register
application-specific element names such as `<pdf_id>` or `<product_id>` with
`shortcodeTags`. Their exact element name and token are preserved in HTML, JSON
and clipboard content. The second argument
received by `shortcodeDisplay` and `renderShortcode` contains `tagName` (also
available as `type`), `source`, `html` and `display`. The first `source`
argument remains unchanged for backwards compatibility.

Preview HTML is inserted directly into a protected, non-interactive editor
container. It therefore inherits the application's styles and naturally uses
the available width and content height. Only return trusted HTML from the
application renderer: this mode intentionally does not provide the security
isolation of an iframe. Preview markup is never included in saved HTML or JSON.
Mode switching is available through the API and a two-state toolbar icon whose
appearance reflects the current mode. The button is disabled when no renderer
is configured. Hide it with
`disabledToolbarButtons: ['shortcodeMode']`. Clipboard plain text contains literal tokens,
so the normal paste operation can reconstruct them. Other pasted text continues
to use the editor's existing plain-text behavior.

### Regression tests

Serve the repository over HTTP and open `tests/shortcodes.html`. The page reports
PASS or FAIL without a test library. It covers import, rendering, source export,
insertion, Undo/Redo (including keyboard shortcuts), formatting removal,
copy/cut/paste, headings, table cells, JSON reload, renderer failure and stale
asynchronous callbacks.
