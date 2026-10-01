# Table editing

Tables are native VHD content blocks. Their structure remains separate from ordinary text
while every header and data cell is directly editable.

## Creating and editing a table

Add a Table from the content `+` menu. New tables begin with a simple editable grid. The
contextual table toolbar follows the active cell and provides structural operations:

- add or remove a row;
- add or remove a column;
- select a row, column or the complete table;
- merge a rectangular cell selection;
- unmerge a merged cell;
- set column widths.

Pressing `Tab` in the final cell creates a new row and carries forward the useful row
formatting.

## Selection

Drag across cells to create a rectangular multi-cell selection. A drag that begins inside
non-empty cell text remains a normal text selection; a drag beginning from the cell
selection area selects cells.

The main VHD toolbar formats all cells in an active rectangular selection. Compatible
commands include character formatting, colours, font family, font size and horizontal
alignment. The cell selection remains active while several commands are applied.

Press `Delete` to clear the selected cells without deleting their structure or independent
borders.

## Merged cells

Only a valid rectangular selection of unmerged cells can be merged. Non-empty source cell
contents are retained in the resulting cell. Row and column additions and removals remain
available when merged cells are present and adjust spans safely.

## Cell presentation

Selected cells expose properties for:

- border colour, width and style on each side;
- padding;
- horizontal alignment;
- vertical alignment.

Column widths are percentage-based and can be changed numerically or by dragging column
boundaries. The logical table grid accounts for `rowspan` and `colspan` during selection,
resizing and structural operations.

## Images in tables

Inline images inside a table cell use the same Image in text properties and mouse-resize
overlay as images in ordinary Text content. Alignment and percentage width are stored in
the cell content and preserved in exported HTML.

## Public rendering

Table content is included in normal VHD HTML export. Load `src/vhd-content.css` on the
public page for layout and presentation rules.
