export default function createTextBlock() {
    return {
        id: `block-${crypto.randomUUID()}`,
        type: 'text',
        properties: {},
        content: '<p></p>'
    };
}
