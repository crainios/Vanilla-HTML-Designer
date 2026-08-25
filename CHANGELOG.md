# Changelog

All notable changes to Vanilla HTML Designer will be documented in this file.

## [0.6.110] - 2026-08-25

### Fixed

- Corrected the 0.6.109 visual-target mistake: the shadow is now applied to the complete zone/section (`.vhd-row-editor`), not to its internal columns.
- Restored the original 0.6.108 column presentation.
- The zone border is visually replaced by a medium shadow.
- Hover, selection and focus slightly strengthen the zone shadow while keeping the zone border transparent.

## [0.6.109] - 2026-08-25

### Changed

- Replaced the visual border used for section/column placement with a medium shadow.
- Section containers now use a cleaner card-like presentation.
- Hover/focus within a section slightly strengthens the shadow instead of relying on a dashed border.

## [0.6.108] - 2026-08-25

### Changed

- Restyled the "Custom actions" toolbar button as a compact split-button.
- The button now matches the requested visual style: a small square "+" area followed by a separate dropdown caret area.
- The control keeps the same behavior, title and accessibility attributes.
- Hover and active states were adapted specifically for the new split-button appearance.

## [0.6.107] - 2026-08-25

### Changed

- Redesigned the visual relationship between the main toolbar and the editor workspace.
- Added a subtle drop shadow under the main toolbar.
- Added one common bordered frame around both the editor canvas and the Properties panel.
- Added light inner padding to the common workspace frame.
- Removed the visual gap between toolbar and workspace so the toolbar reads as the header of the complete editor assembly.
- The Properties panel keeps its own light boundary as a contextual sub-panel.
- Responsive layout remains unchanged.

## [0.6.106] - 2026-08-24

### Fixed

- Fixed the inline-image resize overlay remaining visible after the image itself was deleted.
- The editor now observes inline-image removal and immediately destroys the external resize frame and handles.
- The geometry updater also self-cleans if the tracked image is no longer connected.
- Normal editable `input` events perform an additional stale-overlay check, covering keyboard Delete/Backspace and browser editing paths.
- The fix applies equally to inline images in normal text areas and table cells.

## [0.6.105] - 2026-08-24

### Fixed

- Fixed persistent main-toolbar dropdown menus.
- Complementary formatting, Lists, Alignment and Custom actions now close when clicking anywhere outside a toolbar dropdown.
- Clicking the canvas, Properties panel or a normal toolbar button closes all open dropdowns.
- Clicking inside the currently open dropdown keeps it open until an action is chosen.
- Switching directly to another dropdown still closes the previous one before opening the new one.

## [0.6.104] - 2026-08-24

### Fixed

- Fixed table row/column selector overlays becoming misaligned after internal table layout changes.
- Selector geometry now reacts to row-height changes caused by text wrapping, inline-image resizing, padding/border changes and merged-cell content.
- Added a `ResizeObserver` on the table and rendered rows.
- Added a `MutationObserver` for table structure and relevant style/span changes.
- Selector geometry updates are coalesced through `requestAnimationFrame()` to avoid excessive recalculation.
- Window resizing and horizontal table scrolling now use the same synchronized geometry update path.
- Observers automatically disconnect when the rendered table/selection layer is removed.

## [0.6.103] - 2026-08-24

### Added

- The main toolbar alignment menu is now contextual for selected inline images.
- With an inline image selected, Align Left, Center and Align Right move the image instead of aligning its containing text or table cell.
- Image selection takes precedence over an underlying table-cell selection.
- Justify is intentionally ignored while an inline image is selected because it has no meaningful image-layout equivalent.

### Fixed

- The inline-image resize overlay is immediately repositioned after changing image alignment, both from the main toolbar and from the Properties panel.
- Toolbar image alignment is persisted through the same `data-align` and cell/text HTML synchronization used by the Properties panel.

## [0.6.102] - 2026-08-24

### Fixed

- Fixed Left / Center / Right alignment of inline images inside table cells.
- Inline-image alignment now resets the complete alignment state before applying the requested position, avoiding stale `float`, `display` or margin styles.
- Inline images now use block layout with explicit left/right auto margins for reliable alignment inside `<td>` / `<th>`.
- Alignment changes are written immediately to the logical table-cell content as well as through the normal synthetic input event.
- Mouse resizing keeps the selected alignment and no longer risks restoring an older layout state.
- The same inline-image alignment logic remains valid in normal text blocks.

## [0.6.101] - 2026-08-24

### Fixed

- Fixed inline-image resize handles not appearing reliably inside table cells.
- Root cause: the 0.6.100 overlay used coordinates relative to the VHD root while its absolute positioning could resolve against a different containing block.
- The resize overlay is now attached to `document.body` and uses `position: fixed` with the image's viewport `getBoundingClientRect()` coordinates.
- The overlay follows page scrolling, ancestor scrolling, horizontal table scrolling and viewport resizing.
- Added listener cleanup when the image is deselected to avoid stale handlers.
- Inline images are now selected on pointer-down as well as click, preventing table-cell pointer gesture handling from delaying the resize UI.
- The overlay uses an editor-level high z-index so table selection/resizing layers cannot cover its handles.

## [0.6.100] - 2026-08-24

### Added

- Added direct mouse resizing for inline images.
- Inline images now display left/right resize handles when selected.
- The resize handles are rendered in an editor-only overlay outside the editable HTML, so they are never persisted in saved content.
- Resizing uses the width of the containing editable area and stores the result in the existing `data-size` percentage.
- The same mechanism works inside normal text blocks and inside table cells.
- Table horizontal scrolling is taken into account when positioning the resize overlay.
- The existing inline-image Properties panel stays synchronized after mouse resizing.

## [0.6.99] - 2026-08-24

### Added

- `Delete` now clears the contents of a logical multi-cell table selection without removing rows, columns, merges or cell formatting.
- Clearing a merged anchor also clears its stored pre-merge content so old text cannot reappear after unmerge.
- Added independent Top, Right, Bottom and Left border-side controls for selected table cells.
- Border-side choices apply independently to every logical cell in a multi-cell selection.
- Disabled sides use CSS `border-*-style:hidden`, which reliably suppresses the shared edge in `border-collapse: collapse` tables.
- Independent border sides are preserved in JSON, exported HTML and HTML import.

### Changed

- `#propertyField()` now supports checkbox controls.
- Single-cell native Delete behavior remains unchanged so normal text editing is not disrupted.

## [0.6.98] - 2026-08-24

### Fixed

- Fixed multi-cell mouse selection still being impossible when the gesture starts from a non-empty cell.
- Removed the 0.6.93 restriction that only armed mouse cell dragging from empty cells.
- Mouse gesture intent is now determined dynamically:
  - dragging inside the starting logical cell keeps native text selection;
  - crossing into another logical cell switches to rectangular cell selection.
- The switch uses the logical-grid hit testing introduced in 0.6.97, so merged cells remain supported.
- Once cell selection begins, any temporary native text selection is cleared.
- Shift + click and row/column/table selectors remain unchanged.

## [0.6.97] - 2026-08-24

### Fixed

- Fixed rectangular mouse selection across logical table cells when merged cells are present.
- Mouse drag selection no longer relies on the `<td>` / `<th>` returned by `elementFromPoint()`.
- The logical row is resolved from rendered table-row geometry.
- The logical column is resolved from VHD's percentage column widths.
- A `rowspan` or `colspan` can therefore no longer hide logical selection targets underneath its visible merged cell.
- This specifically restores multi-cell selection in columns/rows adjacent to or covered by merged cells.
- Native text selection inside non-empty cells remains unchanged.

## [0.6.96] - 2026-08-24

### Fixed

- Fixed horizontal alignment of a single table cell not being persisted.
- Align Left, Center, Right and Justify now write to the selected cell's `properties.textAlign`, even when only one table cell is selected.
- Single-cell alignment now follows the same persisted model as multi-cell alignment.
- The value is therefore retained in JSON, Preview, HTML export and after re-rendering.
- Other rich-text commands continue to use native single-cell text formatting behavior.

## [0.6.95] - 2026-08-24

### Fixed

- Fixed table-cell vertical alignment not being reliably reflected in Preview and public rendering.
- Exported table cells now receive an explicit `vhd-valign-top`, `vhd-valign-middle` or `vhd-valign-bottom` class in addition to their inline `vertical-align`.
- `vhd-content.css` now owns the public vertical-alignment rules and no longer forces all table cells to `top`.
- Preview uses the same public stylesheet, so Preview and live output now follow the same alignment rules.

### Changed

- Selecting a complete row keeps Add row above, Add row below and Remove row enabled.
- Selecting a complete column keeps Add column left, Add column right and Remove column enabled.
- Arbitrary multi-cell rectangular selections still disable ambiguous row/column structural actions.
- Whole-row and whole-column detection uses the existing logical selection bounds and remains compatible with merged-cell-aware structure operations.

## [0.6.94] - 2026-08-24

### Changed

- Increased the editor-only top gutter between the contextual table toolbar and the table from 8px to 12px.
- Added independent per-cell padding.
- A cell or multi-cell selection can override the table-level `cellPadding`.
- Cells without their own `padding` property continue to inherit the global table padding.
- Added vertical alignment to the contextual cell properties panel: Top, Middle and Bottom.
- Padding and vertical alignment apply independently to every selected logical cell.
- Per-cell padding is exported to public HTML and restored during HTML import.

## [0.6.93] - 2026-08-24

### Fixed

- Restored native mouse text selection inside non-empty table cells.
- Dragging across text in a non-empty cell now selects text normally instead of switching to rectangular cell selection.
- Mouse-drag rectangular cell selection is still available when starting from an empty cell.
- Shift + click rectangular selection remains available for all cells.
- Row, column and whole-table selector gutters remain unchanged.

### Changed

- Added an 8px editor-only top gutter between the contextual table toolbar and the table.
- The gutter improves visual separation without affecting exported/public HTML.

## [0.6.92] - 2026-08-24

### Changed

- Redesigned the contextual table toolbar.
- Table action buttons now use white inline SVG icons on a blue background.
- Replaced text glyphs (`↑+`, `↓+`, `−↔`, `←+`, `+→`, `−↕`, `⇔`, `⊞`, `⊟`) with dedicated vector icons.
- Reduced toolbar padding, gaps and button dimensions for a more compact presentation.
- Reduced the numeric column-width field dimensions to match the compact toolbar.
- Hover/focus uses a darker blue and disabled controls use a lighter blue.
- Existing titles and `aria-label` attributes are retained for accessibility.
- SVG icons use `currentColor`, require no external icon library and are never exported to public HTML.

## [0.6.91] - 2026-08-24

### Changed

- Reduced the editor-only table row-selector gutter from 18px to 12px.
- Row-selection remains available in the left margin while the table now sits closer to the surrounding content.
- The whole-table corner selector is aligned with the reduced gutter.
- Public HTML remains unchanged.

## [0.6.90] - 2026-08-24

### Fixed

- Fixed row selectors remaining hidden even though the left selector gutter was visible.
- Root cause: row selector geometry looked only for `:scope > tbody > tr`, while editor-created tables append `<tr>` elements directly to `<table>`.
- Row selectors now use the native `table.rows` collection, which works for both direct `<tr>` children and tables containing `<tbody>`.
- Existing row-selector gutter, column selectors and whole-table selector are unchanged.

## [0.6.89] - 2026-08-24

### Fixed

- Added a dedicated 18px editor-only gutter on the left side of tables.
- Row-selection handles now occupy real layout space inside the table editor instead of relying on negative overflow outside the block.
- This makes row selectors reliably visible and clickable regardless of parent overflow or block clipping.
- The whole-table corner selector is aligned with the new row-selection gutter.
- Public HTML and `vhd-content.css` remain unchanged.

## [0.6.88] - 2026-08-24

### Fixed

- Fixed row-selection handles not appearing reliably in the left margin.
- Row selector positions now use `getBoundingClientRect()` relative to the rendered table instead of table-row `offsetTop` / `offsetHeight`.
- This avoids offset-parent inconsistencies introduced when the selector overlay was moved outside the scrolling wrapper in 0.6.87.
- Column selectors and the whole-table corner selector are unchanged.
- Slightly increased row-selector hover visibility without making the controls permanently visible.

## [0.6.87] - 2026-08-24

### Fixed

- Fixed row/column/table selection handles being clipped by the table scroll container.
- The selection overlay now belongs to the outer table editor and is positioned against the scrolled table coordinates.
- Left-row and top-column selectors can therefore extend outside the table and remain visible.
- Increased the selector hit area slightly while keeping the visible marker discreet.

### Changed

- A row automatically created by pressing `Tab` in the final table cell now inherits the visual formatting of the previous last row.
- Inherited formatting includes independent cell properties such as borders, colors, alignment and vertical alignment.
- Cell content is not copied.
- Structural merge metadata (`rowspan`, `colspan`, `mergedInto` and merge restoration metadata) is never copied into the new row.

## [0.6.86] - 2026-08-24

### Changed

- Replaced the `L`, `C` and `▦` table-selection toolbar buttons with contextual selection margins.
- Hovering just above a column reveals a subtle column selector; click selects the full logical column.
- Hovering just left of a row reveals a subtle row selector; click selects the full logical row.
- Hovering the top-left corner reveals a selector for the entire table.
- Selection controls are editor-only absolutely positioned elements and never enter cell content or public HTML.
- Selectors remain compatible with merged cells and the existing transient rectangular-selection engine.
- Column resize handles remain above the selection layer to prevent interaction conflicts.
- Existing `Tab` / `Shift+Tab` behavior and automatic new-row creation from the final cell are unchanged.

## [0.6.85] - 2026-08-24

### Added

- Added quick whole-row selection from the contextual table toolbar (`L`).
- Added quick whole-column selection (`C`).
- Added quick whole-table selection (`▦`).
- Quick selections use the existing transient rectangular-selection engine, so formatting and cell properties continue to be applied independently to each cell.
- Pressing `Tab` in the logical bottom-right table cell now automatically appends a new row.
- After automatic row creation, focus and caret move to the first cell of the new row.
- Existing native `Tab` and `Shift+Tab` navigation is left untouched for every other cell.
- The bottom-right detection also accounts for a merged cell whose `rowspan` / `colspan` reaches the logical end of the table.

## [0.6.84] - 2026-08-24

### Changed

- Restored row insertion when a table contains merged cells.
- Restored column insertion when a table contains merged cells.
- Inserting a row before a merged area automatically shifts the merge anchor downward.
- Inserting a column before a merged area automatically shifts the merge anchor to the right.
- Inserting a row inside a merged vertical span automatically increases its `rowspan`.
- Inserting a column inside a merged horizontal span automatically increases its `colspan`.
- `mergedInto` coordinates are rebuilt after insertion.
- Existing merged-cell content and independent logical-cell data are preserved.
- Add/remove row and add/remove column operations are now all compatible with merged cells.

## [0.6.83] - 2026-08-24

### Changed

- Restored row deletion when a table contains merged cells.
- Restored column deletion when a table contains merged cells.
- Deleting a row crossing a merged cell automatically reduces its `rowspan`.
- Deleting a column crossing a merged cell automatically reduces its `colspan`.
- If the deleted row or column contains the merge anchor, the merge moves to the next surviving logical cell and keeps the visible merged content.
- Updated `mergedInto` coordinates are rebuilt after deletion so the logical grid remains valid.
- When a merge shrinks back to a single cell, the merge metadata is removed naturally.
- Add-row and add-column actions remain disabled while merged cells exist; only deletion is restored in this version.

## [0.6.82] - 2026-08-24

### Changed

- Empty table rows and cells now keep a visible minimum height in the editor.
- New empty rows are therefore immediately obvious and easy to click.
- Empty merged cells also remain visibly present.
- Added an editor-only non-breaking-space pseudo-element for completely empty editable cells.
- The minimum-height behavior is not exported to public HTML.

## [0.6.81] - 2026-08-24

### Changed

- Merging table cells now keeps all non-empty selected-cell contents visible in the merged cell.
- Contents are concatenated in reading order: left-to-right, then top-to-bottom.
- Each non-empty source content is separated by an HTML line break.
- The user can therefore decide which merged contents to keep, edit, reorganize or delete.
- Original logical-cell contents remain preserved for unmerge.
- The anchor cell stores its pre-merge content in `mergeOriginalContent`.
- Unmerging restores the original anchor content and reveals the untouched original contents of the covered cells.

## [0.6.80] - 2026-08-24

### Added

- Added table-cell merge and unmerge operations to the contextual table toolbar.
- Select a rectangular range of at least two unmerged cells and use `⊞` to merge it.
- Select a merged cell and use `⊟` to separate it again.
- The top-left cell is the visible merge anchor and stores `rowspan` / `colspan`.
- Covered logical cells remain in JSON and are marked with `mergedInto`, preserving their original content and independent properties for later unmerge.
- Unmerging restores the underlying cells and their original content/properties.
- Merged cells export to semantic HTML `rowspan` / `colspan`.
- HTML import reconstructs a complete logical grid from existing `rowspan` / `colspan`.
- Merges spanning from the header row into body rows are rejected to keep table semantics predictable.

### Safety

- Row/column add/remove operations are temporarily disabled while any merged cells exist. Separate merged cells first before changing the table grid. This prevents span coordinates from being invalidated in this first implementation.
- Column width editing and equal-width distribution remain available.

## [0.6.79] - 2026-08-23

### Changed

- Simplified the contextual table-cell border section title to `Bordures`.
- Removed the selected-cell count from the border section heading.
- The border subsection heading now uses a smaller, lighter visual style than the main Properties panel title.

## [0.6.78] - 2026-08-23

### Added

- Added independent border properties for table cells.
- A cell can now store `borderWidth`, `borderStyle` and `borderColor` in its own `properties` object.
- Multi-cell selection applies the same border settings independently to every selected cell; no group is persisted.
- The table properties panel now shows a contextual "Bordures de la cellule" section when table cells are selected.
- With multiple selected cells, the section indicates how many cells will be affected.
- Border styles available: solid, dashed, dotted and none.
- Cell-specific borders are rendered immediately in the editor.
- Cell-specific borders are exported to public HTML and restored by HTML import.
- Cells without explicit border properties continue to inherit the table-level border defaults.

## [0.6.77] - 2026-08-23

### Added

- Added rectangular table-cell selection by mouse drag.
- Pressing and dragging from one cell across the table extends the temporary VHD selection to the cell currently under the pointer.
- A 6px movement threshold preserves normal click/caret behavior for ordinary cell editing.
- Native browser text selection is disabled only after an actual cell-selection drag starts.
- Existing click and Shift + click selection remain available.
- Added direct table-column resizing with draggable separators.
- Resizing changes only the two columns adjacent to the dragged separator and preserves their combined percentage.
- Each adjacent column has a minimum width of 5%.
- Column widths update directly through `<colgroup>` during dragging without a complete editor rerender.
- The numeric width control stays synchronized with direct mouse resizing.
- Dragged widths remain stored in the existing `properties.columnWidths` JSON property.

## [0.6.76] - 2026-08-23

### Fixed

- Multi-cell table selections now remain active while applying several formatting commands successively from the main toolbar.
- Native DOM selection/focus changes generated internally by `execCommand` no longer collapse the VHD logical table selection to a single cell.
- Added an internal `isFormattingTableSelection` guard around multi-cell formatting.
- Table cell focus handlers ignore transient focus changes while a multi-cell format is being applied.
- The logical table selection and active contextual cell are explicitly preserved and restored after each formatting command.
- Property-based multi-cell styles also preserve the same logical selection.

## [0.6.75] - 2026-08-23

### Changed

- Removed text formatting controls from the contextual table toolbar.
- The table toolbar is now dedicated exclusively to table structure and column widths.
- Multi-cell formatting is handled by the main VHD text toolbar instead of duplicating controls.
- When a rectangular multi-cell selection is active, the main toolbar applies compatible commands to every selected cell independently.
- Supported multi-cell commands from the main toolbar include bold, italic, underline, strike-through, superscript, subscript, font family, font size, text color, background color, and horizontal alignment.
- Text/background colors and horizontal alignment remain stored as independent properties on each selected cell.
- Character-level formats and typography are applied independently to each selected cell's HTML content.
- A single active cell keeps the normal rich-text behavior, including normal text-range selection inside that cell.

## [0.6.74] - 2026-08-23

### Added

- Added temporary rectangular multi-cell selection for tables.
- Normal click selects one cell; Shift + click extends the selection from the anchor cell to a rectangular range.
- Selection is editor-only and is never persisted as a group in JSON.
- Every cell keeps its own independent `properties` object.
- Added multi-cell horizontal alignment: left, center, right and justify.
- Added multi-cell vertical alignment: top, middle and bottom.
- Added multi-cell text color and cell background color.
- All selected cells are highlighted in the editor.
- When multiple cells are selected, row/column structure actions and column width controls are disabled to avoid ambiguous operations.
- Per-cell styles are serialized to public HTML and restored by HTML import.

## [0.6.73] - 2026-08-23

### Fixed

- Fixed the central table contextual toolbar becoming invisible in 0.6.72.
- The cause was the table editor's legacy `overflow-x: auto`, which clipped the toolbar after it was moved above the table with a negative `top`.
- `.vhd-table-editor` now allows visible overflow.
- Horizontal scrolling is moved to a dedicated `.vhd-table-scroll` wrapper containing only the table.
- The contextual toolbar can therefore remain at `top: -34px` without being clipped.
- Direct cell editing from 0.6.72 is preserved.

## [0.6.72] - 2026-08-23

### Fixed

- Fixed table cells still being impossible to edit in 0.6.71.
- Removed the intermediary `.vhd-table-cell-content` editing layer.
- `<th>` and `<td>` elements are now directly `contenteditable` again, restoring the reliable editing behavior used by the initial table implementation.
- This is safe because all contextual table controls now live outside the table cells.
- Fixed the contextual table toolbar still appearing too low.
- Removed the extra 30px top padding previously reserved by `.vhd-table-editor`.
- The table toolbar now occupies the already existing block-controls row (`top: -34px`) instead of creating a second vertical control area.

## [0.6.71] - 2026-08-23

### Fixed

- Restored reliable direct editing of table cells after the 0.6.70 contextual toolbar change.
- Clicking anywhere on a table cell now focuses its internal editable content when necessary.
- Clicking directly inside the editable content preserves normal browser caret placement.
- The table cell editable area now fills the cell width and explicitly uses a text cursor.

### Changed

- Moved the central table toolbar higher.
- Reduced the vertical space reserved above tables so the toolbar sits closer to the block controls and wastes less canvas space.
- Reduced the corresponding mobile toolbar spacing.

## [0.6.70] - 2026-08-23

### Changed

- Replaced per-cell contextual popup menus with one compact contextual toolbar centered above the active table.
- The toolbar context follows the cell containing the cursor/focus.
- Row actions automatically target the active row.
- Column actions and width controls automatically target the active column.
- Removed the per-cell `⋮` menu trigger from the rendered editor UI.
- Right-click now selects the contextual cell instead of opening a separate popup.
- Table structure commands and column width controls are grouped in the central toolbar.

### Fixed

- Changing a table column width no longer closes the contextual controls.
- The percentage input now updates `<colgroup>` widths directly without rerendering the complete editor.
- Repeated clicks on the native number input arrows can therefore continuously increase/decrease the selected column width.

## [0.6.69] - 2026-08-23

### Added

- Added percentage-based widths for table columns.
- The contextual cell menu now includes `Largeur de cette colonne (%)`.
- Changing one column width automatically redistributes the remaining width among the other columns so the table always totals 100%.
- Added `Répartir les colonnes également` to restore equal column widths.
- Column widths are stored in table JSON as `properties.columnWidths`.
- Column widths are rendered immediately in the editor using `<colgroup>`.
- Public HTML exports the same `<colgroup>` widths and uses fixed table layout.
- HTML import restores VHD column widths from `<colgroup>`.
- Adding or removing a column resets the table to equal column widths.

## [0.6.68] - 2026-08-23

### Fixed

- Fixed the table contextual `⋮` menu trigger leaking into saved cell content and therefore appearing on public pages.
- Table cell content is now edited inside a dedicated `.vhd-table-cell-content` element.
- Editor-only controls are siblings of the editable content and can no longer become part of `cell.content`.
- Added automatic cleanup of legacy 0.6.67 table cell content containing `.vhd-table-cell-menu-trigger`.
- Added serializer-side cleanup as an additional safeguard for already polluted JSON.
- Added HTML importer cleanup for previously exported table markup containing the editor-only trigger.

## [0.6.67] - 2026-08-23

### Changed

- Moved all structural table actions out of the Properties panel.
- Table row/column structure is now edited through a contextual menu directly in the canvas.
- Right-clicking a cell opens the contextual structure menu.
- A small `⋮` trigger appears on the selected/hovered cell for discoverability and touch use.
- The Properties panel now remains focused on table appearance and configuration only.
- Contextual actions include row above/below/remove and column left/right/remove.
- Remove row/column actions are disabled when the table has only one remaining row/column.

## [0.6.66] - 2026-08-23

### Added

- Added contextual row and column editing based on the selected table cell.
- Add row above / below the current cell.
- Add column left / right of the current cell.
- Remove the current row.
- Remove the current column.
- The current table cell is visually highlighted in the editor.
- Tables always keep at least one row and one column.

### Changed

- Replaced the previous append/remove-last table actions with contextual actions relative to the selected cell.

## [0.6.65] - 2026-08-23

### Added

- Added a new `Table` content block.
- New tables start as 3 × 3 with an optional semantic header row.
- Table cells are directly editable in the canvas and support the existing rich-text toolbar.
- Added table properties for header row, border color/width, cell padding and header background.
- Added controls to add/remove rows and columns.
- Added semantic HTML serialization using `<table>`, `<tr>`, `<th>` and `<td>`.
- Added HTML import support for existing tables and VHD table wrappers.
- Table cell text is included in document word/character statistics.
- Added `table` to `disabledContentBlocks`.

## [0.6.64] - 2026-08-23

### Fixed

- Fixed the drag-handle tooltip showing `undefined` by ensuring the block and zone drag labels are present in translations.

### Changed

- Removed the legacy Up/Down movement buttons from content blocks.
- Removed the legacy Up/Down movement buttons from complete zones.
- Block controls are now reduced to `⋮⋮` (drag) and `×` (remove).
- Zone controls are now reduced to `⋮⋮` (drag) and `×` (remove), plus the first-zone Add Zone control where applicable.
- Drag-and-drop is now the primary movement mechanism, simplifying the editor UI.

## [0.6.63] - 2026-08-23

### Changed

- Increased drag auto-scroll speed for both content blocks and complete zones.
- Minimum edge-scroll speed increased from 5px to 8px per animation frame.
- Maximum edge-scroll speed increased from 28px to 44px per animation frame.
- Progressive acceleration near the viewport edge is preserved.

## [0.6.62] - 2026-08-23

### Added

- Added vertical drag-and-drop for complete zones.
- Each zone now has a dedicated `⋮⋮` drag handle alongside its existing Up, Down and Remove controls.
- Zones can be moved before or after any other zone.
- Added a zone-level insertion indicator and lightweight drag preview.
- Added automatic scrolling near the top/bottom viewport edges while moving zones.
- Zone drag uses Pointer Events and supports mouse, pen and touch.
- Completed zone moves are recorded in Undo/Redo.
- Column structure, widths and all contained blocks move together unchanged.

## [0.6.61] - 2026-08-23

### Fixed

- The editor-only light grey column background is no longer stored as content data by default.
- New columns now use an empty/transparent `backgroundColor` in the project JSON.
- Exported public HTML omits `background-color` when no column background was explicitly selected.
- The editor still displays `#fafbfc` as a visual editing aid through its editor styling.
- Legacy JSON values using the former automatic `#fafbfc` default are migrated to transparent when loaded.

## [0.6.60] - 2026-08-23

### Changed

- Removed the grey background surrounding the editor canvas.
- Removed the 16px canvas padding so content zones now start directly at the editor edge.
- Removed the canvas border radius associated with the former grey surround.

## [0.6.59] - 2026-08-23

### Fixed

- Fixed block drops when moving downward inside the same column.
- The target index was previously decremented a second time even though the dragged source block had already been excluded from the drop-position calculation.
- Downward and upward moves now use the same destination-index coordinate system.

## [0.6.58] - 2026-08-23

### Fixed

- Fixed downward block drag auto-scroll across very tall content.
- The drop target and insertion marker are now recalculated on every auto-scroll animation frame, even when the pointer itself remains stationary.
- Stored the last pointer coordinates during dragging so the destination can follow the scrolling document.

### Changed

- Increased drag auto-scroll speed slightly: maximum speed is now 28px per animation frame instead of 22px.
- Minimum edge-scroll speed increased from 4px to 5px per frame.

## [0.6.57] - 2026-08-23

### Added

- Added automatic scrolling while dragging blocks near the top or bottom edge of the viewport.
- Auto-scroll starts inside a 90px edge zone.
- Scroll speed increases progressively as the pointer approaches the edge.
- Auto-scroll stops immediately when the pointer leaves the edge zone or when dragging ends.
- Fullscreen mode scrolls the editor canvas; normal mode scrolls the document.

## [0.6.56] - 2026-08-23

### Fixed

- Reworked block drag-and-drop after the initial 0.6.55 implementation could freeze during pointer movement.
- Pointer tracking now uses temporary document-level listeners instead of pointer capture on the drag handle.
- Removed full DOM cloning of the dragged block; the drag preview is now a lightweight label.
- Removed the global `body *` cursor override used during dragging.
- Added a 4px movement threshold before a drag actually starts.
- Drop-target detection now iterates direct column children instead of relying on `:scope` selectors.

## [0.6.55] - 2026-08-23

### Added

- Added drag-and-drop reordering for content blocks.
- Each block now has a dedicated `⋮⋮` drag handle.
- Blocks can be moved vertically within a column, between columns, and between zones.
- Added a compact insertion indicator showing the exact drop position.
- Added a translucent drag preview and source-block feedback.
- Implemented with Pointer Events for mouse, pen and touch support.
- Drag operations are recorded in the existing Undo/Redo history.
- Existing Up/Down controls remain available as a precise non-drag alternative.

## [0.6.54] - 2026-08-23

### Added

- Image blocks can now be resized directly in the canvas with left and right drag handles.
- Visual resizing preserves the image aspect ratio and updates the existing Width property.
- Resize handles appear only on hover, focus, selection or while dragging.
- Touch/pointer events are supported, with larger handles on coarse pointer devices.
- Image width is constrained between 5% and 100%.

### Changed

- French label `Couleur de fond du texte` renamed to `Couleur de fond`.

## [0.6.53] - 2026-08-23

### Changed

- Grouped less-frequently used character formatting commands into one compact dropdown.
- The main toolbar now keeps Bold, Italic and Underline directly visible.
- Strike, Superscript, Subscript, Text color and Text background color are available from the new `Mise en forme complémentaire` dropdown.
- Existing `disabledToolbarButtons` keys (`strike`, `superscript`, `subscript`, `textColor`, `backgroundColor`) continue to hide individual commands inside the dropdown.
- The dropdown hides itself automatically if all five commands are disabled.

## [0.6.52] - 2026-08-23

### Fixed

- Paragraph and heading indentation no longer relies on the browser `indent` command, preventing unintended `<blockquote>` creation and citation styling.
- Paragraph and heading indentation now uses `margin-left` in 2rem steps.
- List indentation keeps the browser structural indentation behavior so nested lists remain semantic.

### Changed

- The right-side identity button tooltip and ARIA label now read `À propos de Vanilla HTML Designer` without the version number.
- The version number remains displayed inside the About dialog.

## [0.6.51] - 2026-08-23

### Added

- Added compact Superscript (`x²`) and Subscript (`x₂`) toolbar controls.
- Added Decrease indent and Increase indent commands inside the Alignment dropdown.
- Superscript and Subscript active states are reflected in the toolbar.
- Added `superscript`, `subscript`, `indent` and `outdent` configuration keys for `disabledToolbarButtons`.

## [0.6.50] - 2026-08-23

### Added

- Added Find / Replace toolbar command after Clear formatting.
- Searches Heading, Text and Code blocks across the whole document.
- Added Previous / Next navigation, current replacement and Replace all.
- Added optional case-sensitive search.
- Enter navigates to next result; Shift+Enter navigates to previous result.
- Search results scroll into view and are selected in the editor.
- Added `searchReplace` to `disabledToolbarButtons`.

## [0.6.49] - 2026-08-23

### Changed

- Toolbar visual experiment: icon buttons are now borderless.
- Reduced toolbar button dimensions and spacing.
- Added a light grey toolbar background.
- Hover and active states now use subtle grey/blue backgrounds instead of borders.
- Select and color controls were compacted to match the new toolbar density.

## [0.6.48] - 2026-08-23

### Added

- Added static `HtmlDesigner.renderJson(json)` API.
- Accepts either a VHD JSON string or an already parsed project object.
- Returns the same final HTML generated by the editor serializer without creating a visible editor.
- Invalid JSON or invalid project data produces an explicit error.
- Useful for autosave previews, version comparison and restoration interfaces.

## [0.6.47] - 2026-08-23

### Added

- Added public `editor.setStatus(message, type)` API.
- Status messages are displayed discreetly in the Properties panel under document statistics.
- Supported status types: `info`, `success`, `error`.
- Empty messages hide the status area.
- Status remains visible when selecting rows, columns or blocks.

## [0.6.46] - 2026-08-23

### Added

- Added a dedicated Fullscreen toolbar button immediately after Preview.
- Fullscreen mode expands Vanilla HTML Designer to the entire viewport.
- Pressing `Escape` exits fullscreen mode.
- The page body is prevented from scrolling while fullscreen is active.
- The button automatically changes its tooltip to “Exit fullscreen” while active.
- `fullscreen` is available as a `disabledToolbarButtons` key.

## [0.6.45] - 2026-08-23

### Changed

- Harmonized the editor around a properties-driven interface.
- Image URL, gallery selection and alternative text moved from the canvas to the Properties panel.
- Button text and URL moved from the canvas to the Properties panel.
- Image and Button blocks now display only their visual result in the canvas.
- Spacer height is now configured only from the Properties panel.
- Divider continues to use the Properties panel for all configuration.
- Existing JSON and exported HTML structures remain unchanged.

### Improved

- The central editing canvas is now much closer to the final published rendering.
- Empty Image blocks use a discreet visual placeholder until an image is selected.

## [0.6.44] - 2026-08-22

### Added

- Added `disabledSections` initialization option.
- Individual section/layout presets can now be hidden from the Add section `+` menu.
- Supported keys: `one`, `twoEqual`, `twoWideLeft`, `twoWideRight`, `three`, `four`, `five`, `six`.
- The Add section `+` control is hidden automatically if every layout is disabled.
- Existing loaded sections are preserved.
- Disabled section presets are also rejected by `addRow()`.

## [0.6.43] - 2026-08-22

### Added

- Added `disabledContentBlocks` initialization option for the `+ Add content` menu.
- Individual content block types can now be hidden using stable keys.
- Supported keys: `heading`, `text`, `image`, `button`, `divider`, `spacer`, `code`.
- The Add content `+` control is hidden automatically if every block type is disabled.
- Existing loaded blocks are never removed by this option.
- Disabled block types are also rejected by the internal `addBlock()` method.

## [0.6.42] - 2026-08-22

### Added

- Added `disabledToolbarButtons` initialization option.
- Every toolbar control can be hidden individually using a stable language-independent key.
- The About / Vanilla HTML Designer identity button is intentionally always displayed.
- Toolbar separators are automatically cleaned up when controls are hidden.
- Documented all supported toolbar keys.

## [0.6.41] - 2026-08-22

### Added

- Added permanent document statistics at the top of the Properties panel.
- Displays total word count and character count.
- Counts Heading, Text and Code block contents across the entire document.
- HTML markup inside Heading and Text blocks is excluded from the counts.
- Statistics update live while editing Text, Heading and Code blocks.
- Statistics remain visible regardless of the currently selected row, column or block.

## [0.6.40] - 2026-08-22

### Improved

- Image Gallery dialog now uses a near-fullscreen layout equivalent to `max-width:95vw; height:95vh; margin:2.5vh auto`.
- Gallery width is fixed to 95% of the viewport.
- Gallery height is fixed to 95% of the viewport.
- The embedded gallery iframe expands to fill the available dialog space.

## [0.6.39] - 2026-08-22

### Improved

- Image Gallery modal enlarged to an XL layout comparable to Bootstrap `modal-xl`.
- Maximum gallery width is now 1140 px.
- The dialog remains responsive on smaller screens with a 1 rem margin on each side.

## [0.6.38] - 2026-08-22

### Added

- Button properties now include link opening mode: same window or new tab.
- New-tab buttons export `target="_blank"` with `rel="noopener noreferrer"`.
- Button target is preserved in JSON, HTML export and HTML import.
- The button preview reflects the selected target without navigating while editing.

## [0.6.37] - 2026-08-22

### Fixed

- Paragraph alignment no longer depends on deprecated browser `execCommand('justify…')`.
- Alignment now explicitly targets the paragraph(s) intersecting the current selection.
- Fixed paragraph alignment inside asymmetric layouts such as 1/3 + 2/3 and 2/3 + 1/3.
- Left, center, right and justified alignment are stored directly as `text-align` in the editable HTML.
- Multi-paragraph selections apply alignment to all selected paragraph-level elements.

## [0.6.36] - 2026-08-22

### Fixed

- Preview dialog now closes when clicking on the backdrop outside the modal.
- Properties panel sticky position now includes `stickyToolbarOffset`.
- Properties panel no longer hides partly beneath a fixed application header / sticky toolbar on long documents.
- Properties panel gets a viewport-aware maximum height and its own vertical scrolling when required.

## [0.6.35] - 2026-08-22

### Fixed

- `vhd-content.css` now contains the complete public layout rules for exported VHD content.
- Fixed 1/3 + 2/3 and 2/3 + 1/3 layouts on published pages.
- Added public support for all layout presets: 1, 1/1, 2/1, 1/2, 3, 4, 5 and 6 columns.
- Added responsive one-column stacking below 768 px.
- Added public styles for images, inline images, buttons, dividers, spacers, inline/embedded video, citations and imported tables.
- Row background/padding and column background/padding are now serialized to HTML.
- Text and Heading color, line-height and letter-spacing properties are now serialized to HTML.
- Text and Heading properties are reapplied when the editor renders JSON after reload.

## [0.6.34] - 2026-08-22

### Added

- The editor toolbar is now sticky by default for long documents.
- Added `stickyToolbar: true|false`.
- Added `stickyToolbarOffset` to account for fixed host-application headers.
- Added a subtle bottom border and shadow while the sticky toolbar remains visible.

## [0.6.33] - 2026-08-22

### Added

- Added `src/vhd-content.css` for styling HTML generated by Vanilla HTML Designer on public pages.
- Citation (`blockquote`) presentation is now available independently from the editor stylesheet.
- Preview mode automatically loads `vhd-content.css`.
- Documented the recommended public-page integration.

## [0.6.32] - 2026-08-22

### Improved

- Added a dedicated visual presentation for `<blockquote>` citations.
- Citations now use a left indent, subtle border, light background and inner padding.
- Large decorative opening and closing quotation marks visually identify quoted content.
- The styling applies in the editor, Preview and generated Vanilla HTML Designer content.

## [0.6.31] - 2026-08-22

### Fixed

- Rebuilt divider HTML serialization from the stable 0.6.29 base after the 0.6.30 loading regression.
- Divider blocks now always initialize color, width and style properties.
- Divider styling is exported to HTML.
- Legacy divider JSON without properties is handled safely.
- Imported HTML dividers receive complete default properties.

## [0.6.29] - 2026-08-22

### Fixed

- Image blocks now accept relative image paths such as `/bt-content/1/images/example.webp`.
- The image source field is now a text input with URL input mode instead of HTML `type="url"`, avoiding browser validation that rejected relative paths.
- Absolute `http://` and `https://` image URLs remain supported.

## [0.6.28] - 2026-08-22

### Improved

- Preview mode now automatically loads `/lib/Vanilla-HTML-Designer/src/vhd-code.css`.
- Preview mode now automatically loads `/lib/Vanilla-HTML-Designer/src/vhd-code.js`.
- Code blocks displayed in Preview therefore use the same formatting and copy-to-clipboard controls as public pages.
- Assets are injected only once per page.
- If the code enhancer is already loaded, Preview immediately enhances its newly rendered code blocks.

## [0.6.27] - 2026-08-22

### Fixed

- Code block line breaks are now serialized explicitly as `&#10;` in generated HTML.
- HTML reload converts those entities back to real newline characters through the DOM parser.
- Code block line endings are normalized to LF on import, preserving multiline code consistently across platforms and database round-trips.

## [0.6.26] - 2026-08-22

### Fixed

- Fixed the regression preventing a Heading block from changing level (for example Heading 2 → Heading 3).
- The selected heading level is now captured before restoring the text selection, preventing `selectionchange` from reverting the format selector.
- The selected level is kept visible after the heading DOM element is replaced.

## [0.6.25] - 2026-08-22

### Fixed

- Fixed decimal values in the Line height property for Text and Heading blocks.
- Line height now uses a 0.1 step and accepts values from 0.5 to 5.
- Letter spacing now also accepts decimal values with a 0.1 step.
- Other numeric properties keep their integer step by default.

## [0.6.24] - 2026-08-22

### Added

- Added an “Insert code” button to the text toolbar.
- Added a dedicated editable Code block with safe text serialization to `<pre class="vhd-code"><code>…</code></pre>`.
- Added Code to the standard content-block menu.
- Added HTML import support for Vanilla HTML Designer code blocks.
- Added standalone `src/vhd-code.js` to enhance every code block on a public page.
- Added automatic copy-to-clipboard buttons with secure Clipboard API support and a legacy fallback.
- Added MutationObserver support for code blocks injected after page load.
- Added standalone `src/vhd-code.css`, automatically loaded by `vhd-code.js`.
- Added French and English labels for code insertion.

## [0.6.23] - 2026-08-22

### Added

- Added a GitHub link to the About dialog, directly below “Sans framework”.
- The link opens the Vanilla HTML Designer repository in a new tab.

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
