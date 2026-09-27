export default function createRawHtmlBlock() {
    return {
        id: `block-${crypto.randomUUID()}`,
        type: 'raw-html',
        properties: {},
        html: ''
    };
}
