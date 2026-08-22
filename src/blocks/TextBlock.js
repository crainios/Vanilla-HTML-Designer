export default function createTextBlock() {
    return {
        id: `block-${crypto.randomUUID()}`,
        type: 'text',
        properties: {
            color: '#1f2937',
            lineHeight: 1.5,
            letterSpacing: 0
        },
        content: '<p>Text</p>'
    };
}
