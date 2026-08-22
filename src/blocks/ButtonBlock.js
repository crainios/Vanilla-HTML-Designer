export default function createButtonBlock() {
    return {
        id: `block-${crypto.randomUUID()}`,
        type: 'button',
        properties: {
            backgroundColor: '#2563eb',
            color: '#ffffff',
            borderRadius: 5,
            paddingHorizontal: 16,
            paddingVertical: 10,
            align: 'left'
        },
        text: 'Button',
        url: '#',
        align: 'left'
    };
}
