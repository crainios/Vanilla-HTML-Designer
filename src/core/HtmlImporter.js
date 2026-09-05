import Grid from '../layout/Grid.js';
import BlockFactory from '../blocks/BlockFactory.js';

const FORBIDDEN_ELEMENTS = new Set([
    'script', 'style', 'object', 'embed', 'applet', 'base', 'meta', 'link'
]);

const SAFE_IFRAME_HOSTS = new Set([
    'www.youtube.com',
    'youtube.com',
    'www.youtube-nocookie.com',
    'youtube-nocookie.com',
    'player.vimeo.com',
    'www.dailymotion.com',
    'dailymotion.com'
]);

function sanitizeUrl(value, element, attribute) {
    const url = String(value || '').trim();

    if (!url) {
        return '';
    }

    if (url.startsWith('#') || url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
        return url;
    }

    try {
        const parsed = new URL(url, window.location.href);

        if (!['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
            if (attribute === 'src' && parsed.protocol === 'data:' && element.tagName === 'IMG') {
                return url;
            }

            return '';
        }

        return url;
    } catch {
        return '';
    }
}

function sanitizeStyle(value) {
    const style = String(value || '');

    if (
        /expression\s*\(/i.test(style)
        || /javascript\s*:/i.test(style)
        || /behavior\s*:/i.test(style)
        || /-moz-binding\s*:/i.test(style)
    ) {
        return '';
    }

    return style;
}

function sanitizeTree(root) {
    const elements = Array.from(root.querySelectorAll('*'));

    for (const element of elements) {
        const tag = element.tagName.toLowerCase();

        if (FORBIDDEN_ELEMENTS.has(tag)) {
            element.remove();
            continue;
        }

        if (tag === 'iframe') {
            try {
                const src = new URL(element.getAttribute('src') || '', window.location.href);

                if (!SAFE_IFRAME_HOSTS.has(src.hostname.toLowerCase())) {
                    element.remove();
                    continue;
                }
            } catch {
                element.remove();
                continue;
            }
        }

        for (const attribute of Array.from(element.attributes)) {
            const name = attribute.name.toLowerCase();

            if (name.startsWith('on')) {
                element.removeAttribute(attribute.name);
                continue;
            }

            if (name === 'style') {
                const safeStyle = sanitizeStyle(attribute.value);

                if (safeStyle) {
                    element.setAttribute('style', safeStyle);
                } else {
                    element.removeAttribute('style');
                }

                continue;
            }

            if (name === 'href' || name === 'src' || name === 'action' || name === 'formaction') {
                const safeUrl = sanitizeUrl(attribute.value, element, name);

                if (safeUrl) {
                    element.setAttribute(attribute.name, safeUrl);
                } else {
                    element.removeAttribute(attribute.name);
                }
            }
        }
    }

    return root;
}

function parseNumber(value, fallback = 0) {
    const number = Number.parseFloat(String(value ?? ''));

    return Number.isFinite(number) ? number : fallback;
}

function parsePixels(value, fallback = 0) {
    return parseNumber(String(value ?? '').replace('px', ''), fallback);
}

function createTextBlock(content) {
    const block = BlockFactory.create('text');
    block.content = content;
    return block;
}

function createHeadingBlock(element) {
    const block = BlockFactory.create('heading');
    block.level = Number(element.tagName.slice(1)) || 2;
    block.content = element.innerHTML;

    if (['left', 'center', 'right', 'justify'].includes(element.style.textAlign)) {
        block.properties.textAlign = element.style.textAlign;
    }

    return block;
}

function createImageBlock(element) {
    const image = element.tagName === 'IMG'
        ? element
        : element.querySelector('img');

    if (!image) {
        return null;
    }

    const block = BlockFactory.create('image');
    block.src = image.getAttribute('src') || '';
    block.alt = image.getAttribute('alt') || '';
    block.title = image.getAttribute('title') || '';

    const caption = element.tagName === 'FIGURE'
        ? element.querySelector('figcaption')
        : null;

    block.caption = caption?.textContent?.trim() || '';

    const width = parseNumber(image.style.width, 100);
    if (width > 0 && width <= 100 && image.style.width.includes('%')) {
        block.properties.width = width;
    }

    if (image.style.borderRadius) {
        block.properties.borderRadius = parsePixels(image.style.borderRadius, 4);
    }

    const marginLeft = image.style.marginLeft;
    const marginRight = image.style.marginRight;

    if (marginLeft === 'auto' && marginRight === '0px') {
        block.properties.align = 'right';
    } else if (marginLeft === '0px' && marginRight === 'auto') {
        block.properties.align = 'left';
    } else if (marginLeft === 'auto' && marginRight === 'auto') {
        block.properties.align = 'center';
    }

    return block;
}

function createDividerBlock(element) {
    const block = BlockFactory.create('divider');
    block.properties ??= {
        color: '#9ca3af',
        width: 1,
        style: 'solid'
    };

    if (element.style.borderTopColor) {
        block.properties.color = element.style.borderTopColor;
    }

    if (element.style.borderTopWidth) {
        block.properties.width = parsePixels(element.style.borderTopWidth, 1);
    }

    if (element.style.borderTopStyle) {
        block.properties.style = element.style.borderTopStyle;
    }

    return block;
}

function createSpacerBlock(element) {
    const block = BlockFactory.create('spacer');
    block.height = Math.max(0, parsePixels(element.style.height, 32));
    return block;
}


function createButtonBlock(element) {
    const link = element.matches('a.vhd-button')
        ? element
        : element.querySelector('a.vhd-button');

    if (!link) {
        return null;
    }

    const block = BlockFactory.create('button');
    block.text = link.textContent || '';
    block.url = link.getAttribute('href') || '#';
    block.properties.target = link.getAttribute('target') === '_blank'
        ? '_blank'
        : '_self';

    if (link.style.backgroundColor) {
        block.properties.backgroundColor = link.style.backgroundColor;
    }

    if (link.style.color) {
        block.properties.color = link.style.color;
    }

    if (link.style.borderRadius) {
        block.properties.borderRadius = parsePixels(link.style.borderRadius, 5);
    }

    if (link.style.paddingLeft) {
        block.properties.paddingHorizontal = parsePixels(link.style.paddingLeft, 16);
    }

    if (link.style.paddingTop) {
        block.properties.paddingVertical = parsePixels(link.style.paddingTop, 10);
    }

    const wrapper = element.closest?.('.vhd-button-wrap') || element;

    if (wrapper.style?.textAlign) {
        block.properties.align = wrapper.style.textAlign;
    }

    return block;
}

function cleanImportedTableCell(cell) {
    const clone = cell.cloneNode(true);

    clone.querySelectorAll('.vhd-table-cell-menu-trigger')
        .forEach(element => element.remove());

    return clone.innerHTML;
}

function createTableBlock(element) {
    const block = BlockFactory.create('table');
    const table = element.matches('table')
        ? element
        : element.querySelector('table');

    if (!table) {
        return null;
    }

    const rowElements = Array.from(table.rows ?? []);

    if (!rowElements.length) {
        return block;
    }

    const logicalRows = [];

    const createImportedCell = cell => ({
        content: cleanImportedTableCell(cell),
        properties: {
            ...(cell.style.textAlign
                ? { textAlign: cell.style.textAlign }
                : {}),
            ...(cell.style.verticalAlign
                ? { verticalAlign: cell.style.verticalAlign }
                : {}),
            ...(cell.style.color
                ? { color: cell.style.color }
                : {}),
            ...(cell.style.backgroundColor
                ? { backgroundColor: cell.style.backgroundColor }
                : {}),
            ...(cell.style.borderWidth
                ? {
                    borderWidth:
                        Number.parseFloat(cell.style.borderWidth) || 0
                }
                : {}),
            ...(cell.style.borderStyle
                ? { borderStyle: cell.style.borderStyle }
                : {}),
            ...(cell.style.borderColor
                ? { borderColor: cell.style.borderColor }
                : {}),
            ...(cell.style.borderTopStyle === 'hidden'
                ? { borderTopEnabled: false }
                : {}),
            ...(cell.style.borderRightStyle === 'hidden'
                ? { borderRightEnabled: false }
                : {}),
            ...(cell.style.borderBottomStyle === 'hidden'
                ? { borderBottomEnabled: false }
                : {}),
            ...(cell.style.borderLeftStyle === 'hidden'
                ? { borderLeftEnabled: false }
                : {}),
            ...(cell.style.padding
                ? {
                    padding:
                        Number.parseFloat(cell.style.padding) || 0
                }
                : {})
        }
    });

    rowElements.forEach((row, rowIndex) => {
        logicalRows[rowIndex] ??= [];
        let columnIndex = 0;

        for (const cellElement of Array.from(row.cells ?? [])) {
            while (logicalRows[rowIndex][columnIndex]) {
                columnIndex += 1;
            }

            const cell = createImportedCell(cellElement);
            const rowSpan = Math.max(
                1,
                Number(cellElement.rowSpan || 1)
            );
            const colSpan = Math.max(
                1,
                Number(cellElement.colSpan || 1)
            );

            if (rowSpan > 1) {
                cell.properties.rowspan = rowSpan;
            }

            if (colSpan > 1) {
                cell.properties.colspan = colSpan;
            }

            logicalRows[rowIndex][columnIndex] = cell;

            for (
                let targetRow = rowIndex;
                targetRow < rowIndex + rowSpan;
                targetRow += 1
            ) {
                logicalRows[targetRow] ??= [];

                for (
                    let targetColumn = columnIndex;
                    targetColumn < columnIndex + colSpan;
                    targetColumn += 1
                ) {
                    if (
                        targetRow === rowIndex
                        && targetColumn === columnIndex
                    ) {
                        continue;
                    }

                    logicalRows[targetRow][targetColumn] = {
                        content: '',
                        properties: {
                            mergedInto: {
                                row: rowIndex,
                                column: columnIndex
                            }
                        }
                    };
                }
            }

            columnIndex += colSpan;
        }
    });

    const logicalColumnCount = Math.max(
        1,
        ...logicalRows.map(row => row.length)
    );

    block.rows = logicalRows.map(row =>
        Array.from(
            { length: logicalColumnCount },
            (_, columnIndex) =>
                row[columnIndex]
                || { content: '', properties: {} }
        )
    );

    block.properties.header =
        Array.from(rowElements[0]?.cells ?? [])
            .some(cell => cell.tagName === 'TH');

    const columnCount = block.rows?.[0]?.length ?? 0;
    const cols = Array.from(
        table.querySelectorAll(':scope > colgroup > col')
    );

    if (columnCount > 0 && cols.length === columnCount) {
        const widths = cols.map(col =>
            Number.parseFloat(col.style.width)
        );

        if (
            widths.every(value => Number.isFinite(value) && value > 0)
        ) {
            const total = widths.reduce((sum, value) => sum + value, 0);

            block.properties.columnWidths = total > 0
                ? widths.map(value => (value / total) * 100)
                : widths;
        }
    }

    const firstCell = rowElements[0]?.cells?.[0];

    if (firstCell) {
        if (firstCell.style.borderColor) {
            block.properties.borderColor = firstCell.style.borderColor;
        }

        if (firstCell.style.borderWidth) {
            block.properties.borderWidth =
                Number.parseFloat(firstCell.style.borderWidth) || 1;
        }

        if (firstCell.style.padding) {
            block.properties.cellPadding =
                Number.parseFloat(firstCell.style.padding) || 8;
        }

        if (
            block.properties.header
            && firstCell.style.backgroundColor
        ) {
            block.properties.headerBackground =
                firstCell.style.backgroundColor;
        }
    }

    return block;
}

function isStandaloneImage(element) {
    if (element.tagName === 'IMG') {
        return true;
    }

    if (element.tagName !== 'FIGURE') {
        return false;
    }

    const children = Array.from(element.children);

    return children.some(child => child.tagName === 'IMG')
        && children.every(child => ['IMG', 'FIGCAPTION'].includes(child.tagName));
}

function isWhitespaceText(node) {
    return node.nodeType === Node.TEXT_NODE && !node.textContent.trim();
}

function tryImportPluginBlock(element) {
    for (const type of BlockFactory.pluginTypes) {
        const definition = BlockFactory.get(type);

        if (
            !definition?.canImport
            || !definition?.importer
        ) {
            continue;
        }

        let matches = false;

        try {
            matches = Boolean(
                definition.canImport(element.cloneNode(true))
            );
        } catch (error) {
            console.error(
                `Vanilla HTML Designer: plugin block "${type}" canImport() failed.`,
                error
            );
            continue;
        }

        if (!matches) {
            continue;
        }

        try {
            const imported = definition.importer(
                element.cloneNode(true)
            );

            if (!imported || typeof imported !== 'object') {
                console.warn(
                    `Vanilla HTML Designer: plugin block "${type}" import() must return an object.`
                );
                return null;
            }

            const block = structuredClone(imported);
            block.type = type;

            return block;
        } catch (error) {
            console.error(
                `Vanilla HTML Designer: plugin block "${type}" import() failed.`,
                error
            );
            return null;
        }
    }

    return null;
}

function nodesToBlocks(nodes) {
    const blocks = [];
    let textBuffer = [];

    const flushText = () => {
        if (!textBuffer.length) {
            return;
        }

        const container = document.createElement('div');

        for (const node of textBuffer) {
            container.append(node.cloneNode(true));
        }

        const html = container.innerHTML.trim();

        if (html) {
            blocks.push(createTextBlock(html));
        }

        textBuffer = [];
    };

    for (const node of nodes) {
        if (isWhitespaceText(node)) {
            continue;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            textBuffer.push(node);
            continue;
        }

        const element = node;
        const tag = element.tagName.toLowerCase();

        const pluginBlock = tryImportPluginBlock(element);

        if (pluginBlock) {
            flushText();
            blocks.push(pluginBlock);
            continue;
        }

        if (/^h[1-6]$/.test(tag)) {
            flushText();
            blocks.push(createHeadingBlock(element));
            continue;
        }

        if (
            tag === 'table'
            || element.classList.contains('vhd-table-wrap')
        ) {
            flushText();
            const table = createTableBlock(element);

            if (table) {
                blocks.push(table);
            }

            continue;
        }

        if (isStandaloneImage(element) || element.classList.contains('vhd-image')) {
            flushText();
            const image = createImageBlock(element);

            if (image) {
                blocks.push(image);
            }

            continue;
        }

        if (tag === 'hr' || element.classList.contains('vhd-divider')) {
            flushText();
            blocks.push(createDividerBlock(element));
            continue;
        }

        if (element.classList.contains('vhd-spacer')) {
            flushText();
            blocks.push(createSpacerBlock(element));
            continue;
        }

        if (
            element.classList.contains('vhd-button-wrap')
            || element.matches('a.vhd-button')
        ) {
            const button = createButtonBlock(element);

            if (button) {
                flushText();
                blocks.push(button);
                continue;
            }
        }

        if (element.classList.contains('vhd-text')) {
            flushText();

            if (element.innerHTML.trim()) {
                blocks.push(createTextBlock(element.innerHTML));
            }

            continue;
        }

        textBuffer.push(element);
    }

    flushText();

    return blocks;
}

function parseVhdProject(container) {
    const rowElements = Array.from(container.children)
        .filter(element => element.classList.contains('vhd-row'));

    if (!rowElements.length) {
        return null;
    }

    const rows = [];

    for (const rowElement of rowElements) {
        const columnElements = Array.from(rowElement.children)
            .filter(element => element.classList.contains('vhd-col'));

        if (!columnElements.length) {
            continue;
        }

        const widths = columnElements.map(columnElement => {
            const inline = columnElement.style.getPropertyValue('--vhd-span');
            const parsed = Number.parseInt(inline, 10);
            return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
        });

        if (!Grid.isValidWidths(widths)) {
            continue;
        }

        const row = Grid.createRow(widths);

        columnElements.forEach((columnElement, index) => {
            row.columns[index].blocks = nodesToBlocks(Array.from(columnElement.childNodes));

            if (!row.columns[index].blocks.length) {
                row.columns[index].blocks.push(createTextBlock('<p></p>'));
            }
        });

        rows.push(row);
    }

    return rows.length
        ? { version: 1, rows }
        : null;
}

export default class HtmlImporter {
    static fromHtml(html) {
        const source = String(html ?? '').trim();

        if (!source) {
            return null;
        }

        const parser = new DOMParser();
        const documentHtml = parser.parseFromString(source, 'text/html');
        sanitizeTree(documentHtml.body);

        const vhdContent = documentHtml.body.querySelector(':scope > .vhd-content')
            || documentHtml.body.querySelector('.vhd-content');

        if (vhdContent) {
            const project = parseVhdProject(vhdContent);

            if (project) {
                return project;
            }
        }

        const row = Grid.createPreset('one');
        row.columns[0].blocks = nodesToBlocks(Array.from(documentHtml.body.childNodes));

        if (!row.columns[0].blocks.length) {
            row.columns[0].blocks.push(createTextBlock('<p></p>'));
        }

        return {
            version: 1,
            rows: [row]
        };
    }
}
