# Changelog

All notable changes to Vanilla HTML Designer will be documented in this file.

## [0.6.22] - 2026-08-22

### Improved

- Added the same downward caret used by Lists and Alignment to the Custom Actions button.
- The caret makes it visually clear that clicking the button opens a dropdown menu.

## [0.6.21] - 2026-08-22

### Fixed

- Corrected the actual geometry mismatch between the first-zone `+` button and the adjacent row controls.
- The `+`, `↑`, `↓` and `×` controls now all use a 28 × 26 px box.
- Removed the `+` button shadow, which visually extended into the adjacent control.
- The row control group's existing 3 px gap now provides the spacing consistently.

## [0.6.20] - 2026-08-22

### Fixed

- The first-zone `+` control now reserves a few extra horizontal pixels so it no longer overlaps the adjacent `↑` button.
- Vertical alignment remains unchanged.

## [0.6.19] - 2026-08-22

### Fixed

- Applied a final 1 px upward adjustment to the first-zone `+` button so it visually aligns with the `↑`, `↓` and `×` controls.

## [0.6.18] - 2026-08-22

### Fixed

- The `+` button integrated into the first zone action group is now vertically aligned with the `↑`, `↓` and `×` buttons.
- Removed inherited chooser spacing/line-height effects that made the `+` sit lower than the other row controls.

## [0.6.17] - 2026-08-22

### Changed

- The upper `+` control used to insert a zone before the first zone is now placed directly in the first zone action group, before the move up/down and delete buttons.
- The lower and inter-zone `+` controls keep their existing centered positions.
- The short slash in the `<v/>` identity mark has been lowered so its bottom aligns with the bottom of the `v`.

## [0.6.16] - 2026-08-21

### Added

- New dedicated Vanilla HTML Designer `<v/>` icon at the far right of the toolbar.
- The slash is intentionally shorter to make the mark more distinctive.
- Hovering the icon still shows the currently loaded version.
- Clicking the icon opens a native About dialog with project name, version, description, credits and license.

### About

- Vanilla HTML Designer
- Version displayed dynamically from `src/version.js`
- Éditeur visuel HTML léger
- 100 % Vanilla JavaScript
- Sans framework
- Idée de F. Milhiet
- Programmation ChatGPT
- Licence : AGPL-3.0

## [0.6.15] - 2026-08-21

### Fixed

- Font-size changes now preserve the selected text when testing several sizes successively.
- The editor stores the selection as text offsets before replacing temporary browser-generated `<font size>` markup and rebuilds the Range afterwards.
- The font-size selector keeps the newly chosen value displayed after formatting.
- Version badge updated to 0.6.15.

## [0.6.14] - 2026-08-21

### Fixed

- Font-family selection now keeps the text selected without immediately overwriting the newly chosen font in the toolbar.
- Font formatting uses CSS styling mode to avoid replacing DOM nodes and invalidating the current selection.
- Toolbar font detection also recognizes legacy `<font face>` markup.

### Added

- A compact `VHD` identity indicator is displayed at the far right of the toolbar.
- Hovering the indicator shows `Vanilla HTML Designer — version 0.6.14`, making it easy to verify the version currently loaded during tests.
- The version is centralized in `src/version.js`.

## [0.6.13] - 2026-08-21

### Improved

- Selection preservation is now handled consistently across the text-formatting toolbar.
- Font family, font size, text color and background color keep the selected text active after formatting.
- Bold, italic, underline, strike-through and link creation preserve the active selection.
- Paragraph/heading formatting, lists, blockquote and text alignment use the saved selection when toolbar controls receive focus.
- Dropdown formatting actions restore the text selection before applying their command and keep it selected afterwards.

## [0.6.12] - 2026-08-21

### Improved

- The text selection is now preserved while trying different font families.
- Opening the font selector saves the current range before the native select receives focus.
- After applying a font, the original text remains selected so another font can be tested immediately.

## [0.6.11] - 2026-08-21

### Fixed

- Font selector no longer uses the browser-computed inherited font to determine the selected value.
- When text has no explicit `font-family`, the selector now always displays `defaultFontFamily`.
- Composite defaults such as `Verdana, Arial, sans-serif` are attached directly to the matching Verdana option.
- Explicit font formatting inside the text still overrides the default and is reflected in the toolbar.

## [0.6.10] - 2026-08-20

### Fixed

- Removed the hard-coded `selected` state from System UI in the font selector.
- `defaultFontFamily` is now the only source used to choose the initial font.
- CSS font stacks such as `Verdana, Arial, sans-serif` select the matching `Verdana` toolbar entry while the full stack remains applied to editable content.
- Font synchronization now matches the first family of a CSS font stack before falling back to System UI.

## [0.6.9] - 2026-08-20

### Fixed

- Composite `defaultFontFamily` values such as `Verdana, Arial, sans-serif` are now preserved as the selected toolbar value.
- Font-family synchronization now checks exact family stacks before attempting fallback matching.
- Prevents the font selector from incorrectly reverting to System UI or another shorter family option.

## [0.6.8] - 2026-08-20

### Added

- Existing links can now be selected by clicking them inside editable text.
- Link Properties panel with editable URL.
- Link target choice: same window or new tab (`_blank`).
- New-tab links automatically receive `rel="noopener noreferrer"`.
- Links can be removed while preserving their text.
- The Link toolbar button now shows an active state when the cursor is inside a link.

## [0.6.7] - 2026-08-20

### Fixed

- Changing a Heading block from one level to another (for example Heading 3 to Heading 2) now updates the actual heading block.
- The editor keeps the heading content editable after the level change and synchronizes the toolbar state.

## [0.6.6] - 2026-08-20

### Changed

- Clicking an image inserted inside text now opens its settings in the main Properties panel.
- Removed the redundant floating inline-image control strip.

### Added

- Inline image alignment: left, center or right.
- Inline image width from 1 to 100%.
- Configurable free space around an inline image, in pixels.
- Inline image settings update the text flow immediately and are retained in the editable HTML.

## [0.6.5] - 2026-08-20

### Fixed

- Image block alignment now works correctly in the Properties panel.
- Left, center and right alignment are applied directly to the block image through margins.
- Image width, alignment and border radius are now preserved in generated HTML.
- HTML re-import can restore image alignment from Vanilla HTML Designer output.

## [0.6.4] - 2026-08-20

### Added

- `imageGalleryUrl` initialization option.
- `imageGalleryUrl` may be a static URL, function or async function.
- Native image-gallery dialog with iframe, independent of Bootstrap.
- Public `insertImage({ src, alt })` API.
- Public `openImageGallery()` and `closeImageGallery()` APIs.
- Gallery integration works for inline text images and Image blocks.
- Pending image insertion context and caret position are preserved while the gallery is open.
- Gallery closes automatically after a successful image insertion.

### Compatibility

- Existing `onImageSelect` integrations remain supported when `imageGalleryUrl` is not configured.

## [0.6.3] - 2026-08-20

### Changed

- The Properties panel is now displayed on the right side of the editor on desktop.
- The editing canvas occupies the main left area.
- Responsive behavior is unchanged: below 900px the Properties panel moves below the editor.

## [0.6.2] - 2026-08-20

### Added

- Direct HTML import through the `html` initialization option.
- Public `loadHtml(html)` API.
- New `HtmlImporter` module for migrating existing HTML content.
- Previously exported Vanilla HTML Designer markup restores rows and column widths.
- Standard headings, standalone images, dividers, buttons and spacers are converted to native editor blocks.
- Paragraphs, lists, blockquotes, tables, links and inline formatting remain editable as text content.
- Imported HTML is sanitized: scripts and dangerous elements, inline event handlers and unsafe URL protocols are removed.
- Video iframes are restricted to supported providers.

## [0.6.1] - 2026-08-20

### Added

- Extensible toolbar through the `customButtons` initialization option.
- A `+` toolbar menu appears only when custom actions are configured.
- Each custom action defines an icon, a label and either a JavaScript function or global function name.
- Custom actions receive `editor`, `editable` and an `insert()` callback.
- Custom actions may return plain text or `{ content, html: true }`.
- Public `insertAtCursor()` API for inserting text or HTML at the saved editor caret position.
- Cursor position is preserved while a custom asynchronous action runs.

## [0.6.0] - 2026-08-20

### Changed

- Simplified the visible editing model while keeping the internal row/column/block architecture.
- Every newly created layout now contains editable Text content by default in each column.
- The layout `+` becomes the primary structural action for changing page layout.
- Technical row, column and block borders are more discreet and appear mainly on hover, focus or selection.
- The content-add control is hidden until its column is active or hovered.
- User-facing “Section” wording is replaced by “Zone”; the Properties panel identifies zones by their column count.

### Goal

- Users can choose a layout and immediately type, without having to understand or explicitly create a Text block first.

## [0.5.5] - 2026-08-20

### Changed

- A new empty editor now starts with one 1-column section containing a Text block.
- Loading a project with an empty `rows` array also creates the same ready-to-edit starting structure.
- Block action controls now occupy a permanently reserved row above the block content.
- Controls are revealed on hover/focus/selection without overlapping the editable area and without moving the content.

## [0.5.4] - 2026-08-20

### Changed

- Removed the empty-editor message "Ajoutez une première ligne pour commencer."
- An empty editor now displays only a centered blue `+` section button.
- Clicking the `+` opens the same visual section-layout choices used between existing sections.
- Section choices are presented as compact visual column-layout thumbnails.

## [0.5.3] - 2026-08-20

### Fixed

- Button HTML preview now uses the same visual properties as the editor.
- Button background color, text color, border radius, padding and alignment are serialized into the generated HTML.
- Removed generic exported button padding/radius that could override component properties.

### Added

- Horizontal button padding property.
- Vertical button padding property.

## [0.5.2] - 2026-08-20

### Changed

- Add-block control now follows the compact Vanilla Email Designer presentation.
- The blue `+` button is centered over the block separator line.
- Clicking `+` opens a floating two-column block chooser.
- Block choices are displayed as large rectangular buttons in a compact card.
- The chooser switches to one column on very narrow screens.

## [0.5.1] - 2026-08-20

### Fixed

- Section controls no longer use absolute positioning.
- Block controls no longer use absolute positioning.
- Section and block action buttons now each occupy their own toolbar row.
- Prevents move/delete controls from overlapping each other or the first field of a block.

## [0.5.0] - 2026-08-20

### Added

- Contextual Properties sidebar on the left of the editor.
- Section properties: background and vertical padding.
- Column properties: background and padding.
- Text/heading properties: color, line height and letter spacing.
- Image properties: width, alignment and border radius.
- Button properties: background, text color, alignment and border radius.
- Divider properties: color, thickness and line style.
- Spacer height is editable from the Properties panel.
- Default property objects added to the JSON model while legacy projects remain compatible.

## [0.4.1] - 2026-08-20

### Fixed

- Spacer value is now displayed on the left and no longer overlaps the move/delete controls.

### Changed

- Spacer height is previewed directly in the editor.
- Dragging the spacer range control updates the visual height in real time.
- Spacer value and preview stay synchronized while the slider moves.

## [0.4.0] - 2026-08-20

### Added

- New `defaultFontFamily` initialization option.
- The configured default family is applied to editable content and synchronized with the toolbar.
- Any valid CSS font-family can be configured; custom values are automatically added to the toolbar selector.
- `system-ui` remains the fallback default.

## [0.3.9] - 2026-08-20

### Added

- Font-family selector in the character-formatting toolbar group.
- Available families: System UI, Arial, Verdana, Tahoma, Trebuchet MS, Georgia, Times New Roman, Courier New, Serif, Sans-serif and Monospace.
- System UI is the default family.
- Font-family state follows the current selection.
- Font choices are stored as clean inline `font-family` styles rather than legacy `<font face>` elements.

## [0.3.8] - 2026-08-20

### Added

- Special-character insertion control in the Insertion toolbar group.
- Dedicated `Ω` icon and categorized picker.
- Categories: Typography, Currencies, Mathematics, Fractions & scripts, Arrows, Greek alphabet, Latin letters, Technical symbols and Miscellaneous symbols.
- Special-character data moved to `src/toolbar/SpecialCharacterData.js`.
- Emoji and special-character insertion now share the same selection-preserving text insertion helper.

## [0.3.7] - 2026-08-20

### Added

- Expanded Unicode emoji palette organized by categories.
- Categories: Smileys & emotion, People & body, Animals & nature, Food & drink, Activities, Travel & places, Objects, Symbols and Flags.
- Country flags and a much broader set of standard emojis are included.
- Category tabs use visual emoji icons with descriptive tooltips.
- Emoji data moved to a dedicated `src/toolbar/EmojiData.js` module.

## [0.3.6] - 2026-08-20

### Added

- Emoji insertion control in the Insertion toolbar group.
- Compact palette of common Unicode emojis.
- Emoji insertion preserves the text selection and inserts at the previous caret position.
- Emojis are stored as native Unicode characters without images or external dependencies.

## [0.3.5] - 2026-08-20

### Changed

- Video URLs are now normalized before insertion.
- YouTube standard `watch?v=`, `youtu.be`, Shorts, Live and existing Embed URLs are converted to `https://www.youtube.com/embed/VIDEO_ID`.
- YouTube mobile, Music and privacy-enhanced host variants are recognized.
- Vimeo URLs are converted to `https://player.vimeo.com/video/VIDEO_ID`.
- Dailymotion and `dai.ly` URLs are converted to Dailymotion embed URLs.
- Direct video-file URLs continue to use the HTML5 `<video controls>` element.
- External video platforms use responsive 16:9 `<iframe>` embeds.

## [0.3.4] - 2026-08-20

### Changed

- Added a dedicated Insertion group in the toolbar.
- Link and inline image controls were moved out of character formatting into the Insertion group.

### Added

- Video insertion control in the Insertion group.
- Initial video insertion uses a direct URL and generates an HTML5 `<video controls>` element.

## [0.3.3] - 2026-08-20

### Added

- Inline image insertion inside editable text.
- Inline image alignment: left, center or right.
- Inline image sizes: 25%, 33%, 50%, 75% and 100%.
- Inline image deletion control.
- Clicking an inline image reopens its compact image controls.
- Uses the configured `onImageSelect` callback when available, with URL prompt fallback.

## [0.3.2] - 2026-08-20

### Changed

- Removed the blue underline shown under a focused editable text area.
- Add, move up, move down and delete controls are now compact rectangular buttons instead of round buttons.
- Structural controls keep the same blue background and white icon color.

## [0.3.1] - 2026-08-20

### Fixed

- Citation is now a true toggle: first click applies `blockquote`, second click removes it.
- The Citation toolbar button now reflects the current selection with an active visual state.
- Quote state is derived directly from the selected element hierarchy.

## [0.3.0] - 2026-08-20

### Changed

- Character sizes now use typographic points (`pt`) instead of CSS pixels (`px`).
- 12 pt is the default document text size.
- Available sizes are 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36 and 48 pt.
- Font-size state synchronization converts computed CSS pixels back to points before updating the selector.

## [0.2.9] - 2026-08-20

### Changed

- Removed the “Font size” placeholder from the size selector.
- Added 8 px to the available character sizes.
- 12 px is now the default character size and the default value displayed by the selector.

## [0.2.8] - 2026-08-20

### Added

- Character-size selector in the character-formatting toolbar group.
- Main sizes: 10, 12, 14, 16, 18, 20, 24, 28, 32, 36 and 48 px.
- The selector follows the current text selection when its size matches a predefined value.
- Font sizes are stored as clean inline `font-size` styles instead of legacy `<font>` elements.

## [0.2.7] - 2026-08-20

### Changed

- Toolbar controls are now grouped by function with subtle vertical separators.
- Group 1: Undo, Redo and Clear formatting.
- Group 2: character formatting (bold, italic, underline, strike-through, link, text color and text background color).
- Group 3: paragraph formatting (paragraph/heading selector, lists, quote and alignment).
- Group 4: JSON, HTML and Preview.

## [0.2.6] - 2026-08-20

### Added

- Preview button at the end of the main toolbar.
- Preview dialog renders the current `getHtml()` output as content instead of source code.
- Dedicated eye icon for the preview action.

## [0.2.5] - 2026-08-20

### Added

- Paste sanitization for editable text and heading blocks.
- Clipboard HTML, inline styles, classes, scripts and other external markup are discarded.
- Only `text/plain` clipboard content is inserted.
- Line breaks are preserved with local `<br>` elements created by the editor.

## [0.2.4] - 2026-08-20

### Fixed

- Section layout thumbnails are forced to render horizontally.
- Legacy row-choice span styles no longer stack thumbnail cells vertically.
- Equal and asymmetric column previews now remain inside a single compact rectangle.

## [0.2.3] - 2026-08-20

### Changed

- “Add a row” is now “Add a section”.
- Section layout choices are now visual thumbnails instead of textual notations such as `1`, `1|1`, `2|1` or `1|2`.
- Each thumbnail keeps a descriptive tooltip and accessible `aria-label`.
- Layout thumbnails use the editor accent color on hover and keyboard focus.

## [0.2.2] - 2026-08-20

### Changed

- Replaced the persistent block-type row with a compact centered blue `+` button.
- The `+` button opens a small menu containing Text, Heading, Image, Button, Divider and Spacer.
- Move up, move down and delete controls now use the same blue background / white foreground action style.

## [0.2.1] - 2026-08-20

### Fixed

- Paragraph is now the default value of the format selector.
- The format selector no longer displays Heading 1 by default.
- The format selector now follows the current selection and switches between paragraph and H1-H6 according to the surrounding HTML element.

## [0.2.0] - 2026-08-20

### Fixed

- Restored the missing `updateActiveStates()` implementation.
- Formatting indicators now inspect the DOM around the current selection instead of relying on deprecated command-state detection.
- Bold, italic, underline and strike-through states are detected from tags and computed styles.
- List and alignment controls now reflect the current selection.
- Selection tracking also works when the caret is directly inside the editable root element.

## [0.1.9] - 2026-08-20

### Fixed

- The main toolbar is now always visible.
- Removing the former standalone top controls no longer leaves the editor without visible actions before a text block receives focus.
- Closing text editing only closes toolbar dropdown menus; it no longer hides the toolbar itself.

## [0.1.8] - 2026-08-20

### Added

- View JSON and View HTML controls at the end of the main toolbar, with dedicated icons.
- Toolbar active-state feedback for bold, italic, underline and strike-through.
- Active visual feedback for alignment and list dropdown controls based on the current text selection.
- Selection tracking updates formatting indicators while the caret or selection moves.

### Changed

- Demo-level JSON/HTML buttons were removed; these actions now belong to the editor toolbar.

## [0.1.7] - 2026-08-20

### Fixed

- Clear formatting now acts on the complete currently edited text block.
- The block is rebuilt from `innerText`, removing nested formatting elements and inline styles completely.
- The editable block data is immediately synchronized after formatting is cleared.

## [0.1.6] - 2026-08-20

### Changed

- Clear formatting now replaces the selected content with plain text only, removing all HTML markup and inline styles from that selection.
- Text color and text background color controls now use distinct toolbar icons.

## [0.1.5] - 2026-08-20

### Changed

- Undo and redo controls are now the first two buttons in the text toolbar.
- The separate undo/redo area above the toolbar has been removed.

### Added

- Clear-formatting control in third toolbar position using `removeFormat`.

## [0.1.4] - 2026-08-20

### Added

- Alignment dropdown grouping left, center, right and justified alignment.
- List dropdown with unordered styles: disc, square and circle.
- Ordered list styles: decimal, lower-alpha, upper-alpha, lower-roman and upper-roman.
- Text background color control immediately after text color.

### Changed

- Alignment commands no longer occupy four permanent toolbar buttons.
- List commands are grouped into one extensible toolbar menu.

## [0.1.3] - 2026-08-20

### Added

- Move-row-up and move-row-down controls.
- Boundary controls are disabled for the first and last rows.
- Row reordering is included in undo / redo history.

## [0.1.2] - 2026-08-20

### Changed

- The editor now explicitly uses one main content container with vertically stacked independent rows.
- Each row can use its own column layout from 1 to 6 columns.
- New rows can be inserted before, between or after existing rows.
- HTML export now wraps all rows in a main `vhd-content` container.
- Layout controls were moved between rows to make the vertical page structure explicit.

## [0.1.1] - 2026-08-20

### Changed

- Layout engine now supports 1 to 6 columns, including 4 and 5 equal columns.
- Column widths are relative proportions instead of a mandatory six-unit total.
- Alignment controls now use distinct visual icons.

### Added

- Justified text alignment.

## [0.1.0] - 2026-08-20

### Added

- Initial project structure derived conceptually from Vanilla Email Designer.
- Six-unit layout grid.
- Layout presets: 6, 3+3, 4+2, 2+4 and 2+2+2.
- Heading, text, image, button, divider and spacer blocks.
- Inline rich-text toolbar.
- Undo and redo.
- Editable JSON project format.
- Generic web HTML export.
- External image picker hook.
- English fallback and French translation.
- Standalone demo.
