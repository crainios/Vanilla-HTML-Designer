# API

## Constructor

```javascript
const editor = new HtmlDesigner(selectorOrElement, options);
```

Options:

- `translations`: partial or complete translation object.
- `onImageSelect`: async callback returning `{ src, alt, title }`. When `title` is omitted or empty, the `alt` value is used by default.

## getData()

Returns a deep copy of the editable project.

## getHtml()

Returns generic web HTML generated from the current project.

## load(project)

Loads a project object.

## undo()

Restores the previous project state.

## redo()

Restores the next project state.
