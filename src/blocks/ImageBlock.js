export default function createImageBlock() {
    return {
        id: `block-${crypto.randomUUID()}`,
        type: 'image',
        properties: {
            width: 100,
            align: 'center',
            borderRadius: 4
        },
        src: '',
        alt: '',
        title: '',
        caption: ''
    };
}
