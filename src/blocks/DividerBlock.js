export default function createDividerBlock() {
    return {
        id: `block-${crypto.randomUUID()}`,
        type: 'divider'
    };
}
