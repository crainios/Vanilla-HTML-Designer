export default function createTableBlock() {
    return {
        id: `block-${crypto.randomUUID()}`,
        type: 'table',
        rows: [
            [{ content: 'Colonne 1', properties: {} }, { content: 'Colonne 2', properties: {} }, { content: 'Colonne 3', properties: {} }],
            [{ content: '', properties: {} }, { content: '', properties: {} }, { content: '', properties: {} }],
            [{ content: '', properties: {} }, { content: '', properties: {} }, { content: '', properties: {} }]
        ],
        properties: {
            header: true,
            columnWidths: [33.33, 33.33, 33.34],
            borderColor: '#d8dde5',
            borderWidth: 1,
            cellPadding: 8,
            headerBackground: '#f3f4f6'
        }
    };
}
