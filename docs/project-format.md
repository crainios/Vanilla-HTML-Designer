# Project JSON format

## Root

```json
{
  "version": 1,
  "rows": []
}
```

## Row

A row contains between 1 and 6 columns. Column widths are relative integer proportions.

```json
{
  "id": "row-...",
  "type": "row",
  "columns": []
}
```

## Column

```json
{
  "id": "col-...",
  "width": 1,
  "blocks": []
}
```

## Blocks

Native block types:

- `heading`
- `text`
- `image`
- `button`
- `divider`
- `spacer`
- `table`
- `raw-html`

The JSON project remains the canonical editable representation. Generated HTML is an export, not the source format.
