export default function createHeadingBlock() {
    return {
        id: `block-${crypto.randomUUID()}`,
        type: 'heading',
        properties: {},
        level: 2,
        content: 'Heading'
    };
}
