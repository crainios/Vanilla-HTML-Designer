const MAX_COLUMNS = 6;

const PRESETS = {
    one: [1],
    twoEqual: [1, 1],
    twoWideLeft: [2, 1],
    twoWideRight: [1, 2],
    three: [1, 1, 1],
    four: [1, 1, 1, 1],
    five: [1, 1, 1, 1, 1],
    six: [1, 1, 1, 1, 1, 1]
};

function createId(prefix) {
    return `${prefix}-${crypto.randomUUID()}`;
}

export default class Grid {
    static get maxColumns() {
        return MAX_COLUMNS;
    }

    static get presets() {
        return structuredClone(PRESETS);
    }

    static isValidWidths(widths) {
        return Array.isArray(widths)
            && widths.length > 0
            && widths.length <= MAX_COLUMNS
            && widths.every(width => Number.isInteger(width) && width > 0);
    }

    static createRow(widths) {
        if (!Grid.isValidWidths(widths)) {
            throw new Error('Invalid row layout.');
        }

        return {
            id: createId('row'),
            type: 'row',
            properties: {
                backgroundColor: '#ffffff',
                paddingTop: 0,
                paddingBottom: 0
            },
            columns: widths.map(width => ({
                id: createId('col'),
                width,
                properties: {
                    backgroundColor: '#fafbfc',
                    padding: 10
                },
                blocks: []
            }))
        };
    }

    static createPreset(name) {
        const widths = PRESETS[name];

        if (!widths) {
            throw new Error(`Unknown row layout: ${name}`);
        }

        return Grid.createRow(widths);
    }
}
