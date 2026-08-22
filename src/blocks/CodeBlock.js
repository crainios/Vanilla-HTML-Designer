export default function createCodeBlock() {
    return {
        id: `block-${crypto.randomUUID()}`,
        type: 'code',
        code: ''
    };
}
