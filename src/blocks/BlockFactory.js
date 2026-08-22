import createTextBlock from './TextBlock.js';
import createHeadingBlock from './HeadingBlock.js';
import createImageBlock from './ImageBlock.js';
import createButtonBlock from './ButtonBlock.js';
import createDividerBlock from './DividerBlock.js';
import createSpacerBlock from './SpacerBlock.js';

const factories = {
    text: createTextBlock,
    heading: createHeadingBlock,
    image: createImageBlock,
    button: createButtonBlock,
    divider: createDividerBlock,
    spacer: createSpacerBlock
};

export default class BlockFactory {
    static create(type) {
        const factory = factories[type];

        if (!factory) {
            throw new Error(`Unknown block type: ${type}`);
        }

        return factory();
    }

    static get types() {
        return Object.keys(factories);
    }
}
