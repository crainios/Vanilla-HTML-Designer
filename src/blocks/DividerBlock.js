export default function createDividerBlock() {
    return {
        id: `block-${crypto.randomUUID()}`,
        type: 'divider',
        properties: {
            color: '#9ca3af',
            width: 1,
            style: 'solid'
        }
    };
}
