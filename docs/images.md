# Images and gallery

VHD supports native Image content blocks and images inserted inside editable text. Both
can use the host application's media gallery.

## Gallery URL

Provide a fixed URL:

```js
window.editor = new HtmlDesigner('#htmlDesigner', {
    imageGalleryUrl: '/media/gallery.php'
});
```

The value may also be a function or an asynchronous function:

```js
imageGalleryUrl: () => (
    `/media/gallery.php?article=${document.querySelector('#article_id').value}`
)
```

The toolbar image command and the Image block's **Choose image** button open the gallery
inside the VHD dialog.

## Returning a selected image

The gallery calls the public editor API:

```js
window.parent.editor.insertImage({
    src: '/uploads/photo.jpg',
    alt: 'Mountain landscape',
    title: 'Mountain landscape'
});
```

`src` is required. `alt` and `title` are editable afterwards. When `title` is missing or
empty, VHD uses the `alt` value as its default.

The image is inserted at the saved text cursor when the gallery was opened for an inline
image. Otherwise it updates the Image block that opened the gallery. The dialog closes
after insertion and may also be closed explicitly:

```js
editor.closeImageGallery();
```

## Callback integration

Applications without a gallery page can use `onImageSelect`:

```js
const editor = new HtmlDesigner('#htmlDesigner', {
    async onImageSelect() {
        return {
            src: '/uploads/photo.jpg',
            alt: 'Mountain landscape',
            title: 'Mountain landscape'
        };
    }
});
```

The callback remains the fallback when `imageGalleryUrl` is not configured.

## Image properties

Native Image blocks expose the source, alternative text, title, width and presentation
settings in Properties. The **Choose image** action is visually emphasised as the primary
way to select media.

Click an existing inline image to expose its **Image in text** properties:

- alignment: left, centre or right;
- integer width from 1 to 100%;
- space around the image;
- alternative text;
- title.

Mouse resizing stores an integer percentage. Left- and right-aligned images allow text to
flow around them; a centred image becomes a centred block inside the text flow.

## Public rendering

Load the public stylesheet wherever exported HTML is displayed:

```html
<link rel="stylesheet" href="/Vanilla-HTML-Designer/src/vhd-content.css">
```
