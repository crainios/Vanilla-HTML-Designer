export default function createSpacerBlock() {
    return {
        id: `block-${crypto.randomUUID()}`,
        type: 'spacer',
        height: 32
    };
}
