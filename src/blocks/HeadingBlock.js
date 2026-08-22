export default function createHeadingBlock() {
    return {
        id: `block-${crypto.randomUUID()}`,
        type: 'heading',
        properties: {
            color: '#1f2937',
            lineHeight: 1.2,
            letterSpacing: 0
        },
        level: 2,
        content: 'Heading'
    };
}
