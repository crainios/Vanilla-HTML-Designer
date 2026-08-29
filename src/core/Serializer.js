import BlockFactory from '../blocks/BlockFactory.js';

function escapeAttribute(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

function escapeText(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}


function cleanTableCellContent(value = '') {
    return String(value)
        .replace(
            /<button\b[^>]*class=(["'])[^"']*\bvhd-table-cell-menu-trigger\b[^"']*\1[^>]*>[\s\S]*?<\/button>/gi,
            ''
        );
}

function serializeBlock(block) {
    const definition = BlockFactory.get(block?.type);

    if (definition && !definition.native) {
        const html = definition.serialize({
            block: structuredClone(block)
        });

        if (typeof html !== 'string') {
            console.warn(
                `Vanilla HTML Designer: plugin block "${block.type}" serialize() must return a string.`
            );
            return '';
        }

        return html;
    }

    switch (block.type) {
        case 'heading': {
            const level = Math.min(6, Math.max(1, Number(block.level) || 2));
            return `<h${level}>${block.content ?? ''}</h${level}>`;
        }

        case 'text':
            return `<div class="vhd-text">${block.content ?? ''}</div>`;

        case 'image': {
            if (!block.src) {
                return '';
            }

            const properties = block.properties ?? {};
            const width = Math.min(100, Math.max(1, Number(properties.width ?? 100)));
            const align = ['left', 'center', 'right'].includes(properties.align)
                ? properties.align
                : 'center';
            const borderRadius = Math.max(0, Number(properties.borderRadius ?? 4));

            const margins = align === 'left'
                ? 'margin-left:0;margin-right:auto'
                : align === 'right'
                    ? 'margin-left:auto;margin-right:0'
                    : 'margin-left:auto;margin-right:auto';

            const imageStyle = [
                'display:block',
                'max-width:100%',
                'height:auto',
                `width:${width}%`,
                `border-radius:${borderRadius}px`,
                margins
            ].join(';');

            const caption = block.caption
                ? `<figcaption>${escapeText(block.caption)}</figcaption>`
                : '';

            return `<figure class="vhd-image"><img src="${escapeAttribute(block.src)}" alt="${escapeAttribute(block.alt)}" style="${imageStyle}">${caption}</figure>`;
        }

        case 'button': {
            const properties = block.properties ?? {};
            const align = properties.align || block.align || 'left';
            const backgroundColor = properties.backgroundColor || '#2563eb';
            const color = properties.color || '#ffffff';
            const borderRadius = Math.max(0, Number(properties.borderRadius ?? 5));
            const paddingHorizontal = Math.max(0, Number(properties.paddingHorizontal ?? 16));
            const paddingVertical = Math.max(0, Number(properties.paddingVertical ?? 10));
            const opensInNewTab = properties.target === '_blank';

            const style = [
                'display:inline-block',
                `background-color:${escapeAttribute(backgroundColor)}`,
                `color:${escapeAttribute(color)}`,
                `border-radius:${borderRadius}px`,
                `padding:${paddingVertical}px ${paddingHorizontal}px`,
                'text-decoration:none'
            ].join(';');

            const targetAttributes = opensInNewTab
                ? ' target="_blank" rel="noopener noreferrer"'
                : '';

            return `<p class="vhd-button-wrap" style="text-align:${escapeAttribute(align)}"><a class="vhd-button" href="${escapeAttribute(block.url || '#')}"${targetAttributes} style="${style}">${escapeText(block.text || 'Button')}</a></p>`;
        }

        case 'table': {
            const properties = block.properties ?? {};
            const hasHeader = properties.header !== false;
            const borderColor = properties.borderColor || '#d8dde5';
            const borderWidth = Math.max(0, Number(properties.borderWidth ?? 1));
            const cellPadding = Math.max(0, Number(properties.cellPadding ?? 8));
            const headerBackground = properties.headerBackground || '#f3f4f6';

            const columnCount = Math.max(
                1,
                block.rows?.[0]?.length ?? 1
            );
            let columnWidths = Array.isArray(properties.columnWidths)
                ? properties.columnWidths
                    .slice(0, columnCount)
                    .map(value => Number(value))
                : [];

            if (
                columnWidths.length !== columnCount
                || columnWidths.some(value => !Number.isFinite(value) || value <= 0)
            ) {
                const base = 100 / columnCount;
                columnWidths = Array.from(
                    { length: columnCount },
                    (_, index) => index === columnCount - 1
                        ? 100 - (base * (columnCount - 1))
                        : base
                );
            }

            const widthTotal = columnWidths.reduce(
                (sum, value) => sum + value,
                0
            );

            if (widthTotal > 0 && Math.abs(widthTotal - 100) > 0.01) {
                columnWidths = columnWidths.map(
                    value => (value / widthTotal) * 100
                );
            }

            const colgroup = `<colgroup>${columnWidths
                .map(width => `<col style="width:${Number(width.toFixed(4))}%">`)
                .join('')}</colgroup>`;

            const rows = (block.rows ?? []).map((row, rowIndex) => {
                const cells = (row ?? []).map(cell => {
                    const cellProperties = cell?.properties ?? {};

                    if (cellProperties.mergedInto) {
                        return '';
                    }

                    const isHeader = hasHeader && rowIndex === 0;
                    const tag = isHeader ? 'th' : 'td';
                    const cellBackground =
                        cellProperties.backgroundColor
                        || (isHeader ? headerBackground : '');
                    const cellBorderWidth = Math.max(
                        0,
                        Number(
                            cellProperties.borderWidth
                            ?? borderWidth
                        )
                    );
                    const cellBorderStyle = [
                        'solid',
                        'dashed',
                        'dotted',
                        'none'
                    ].includes(cellProperties.borderStyle)
                        ? cellProperties.borderStyle
                        : 'solid';
                    const cellBorderColor =
                        cellProperties.borderColor
                        || borderColor;
                    const cellSpecificPadding = Math.max(
                        0,
                        Number(
                            cellProperties.padding
                            ?? cellPadding
                        )
                    );
                    const style = [
                        `border-width:${cellBorderWidth}px`,
                        `border-style:${escapeAttribute(cellBorderStyle)}`,
                        `border-color:${escapeAttribute(cellBorderColor)}`,
                        ...(cellProperties.borderTopEnabled === false
                            ? ['border-top-style:hidden']
                            : []),
                        ...(cellProperties.borderRightEnabled === false
                            ? ['border-right-style:hidden']
                            : []),
                        ...(cellProperties.borderBottomEnabled === false
                            ? ['border-bottom-style:hidden']
                            : []),
                        ...(cellProperties.borderLeftEnabled === false
                            ? ['border-left-style:hidden']
                            : []),
                        `padding:${cellSpecificPadding}px`,
                        `text-align:${escapeAttribute(cellProperties.textAlign || 'left')}`,
                        `vertical-align:${escapeAttribute(cellProperties.verticalAlign || 'top')}`,
                        ...(cellProperties.color
                            ? [`color:${escapeAttribute(cellProperties.color)}`]
                            : []),
                        ...(cellBackground
                            ? [`background-color:${escapeAttribute(cellBackground)}`]
                            : [])
                    ].join(';');

                    const scope = isHeader ? ' scope="col"' : '';
                    const verticalAlign = [
                        'top',
                        'middle',
                        'bottom'
                    ].includes(cellProperties.verticalAlign)
                        ? cellProperties.verticalAlign
                        : 'top';
                    const verticalClass =
                        ` class="vhd-valign-${verticalAlign}"`;
                    const rowSpan = Math.max(
                        1,
                        Number(cellProperties.rowspan ?? 1)
                    );
                    const colSpan = Math.max(
                        1,
                        Number(cellProperties.colspan ?? 1)
                    );
                    const spanAttributes = [
                        ...(rowSpan > 1
                            ? [` rowspan="${rowSpan}"`]
                            : []),
                        ...(colSpan > 1
                            ? [` colspan="${colSpan}"`]
                            : [])
                    ].join('');
                    const content = cleanTableCellContent(cell?.content ?? '');

                    return `<${tag}${scope}${verticalClass}${spanAttributes} style="${style}">${content}</${tag}>`;
                }).join('');

                return `<tr>${cells}</tr>`;
            }).join('');

            return `<div class="vhd-table-wrap"><table class="vhd-table" style="table-layout:fixed">${colgroup}<tbody>${rows}</tbody></table></div>`;
        }

        case 'divider': {
            const divider = block.properties || {};
            const dividerColor = divider.color || '#9ca3af';
            const dividerWidth = Number.isFinite(Number(divider.width))
                ? Math.max(1, Number(divider.width))
                : 1;
            const dividerStyle = ['solid', 'dashed', 'dotted'].includes(divider.style)
                ? divider.style
                : 'solid';

            const dividerCss = [
                'border:0',
                `border-top-width:${dividerWidth}px`,
                `border-top-style:${dividerStyle}`,
                `border-top-color:${escapeAttribute(dividerColor)}`
            ].join(';');

            return `<hr class="vhd-divider" style="${dividerCss}">`;
        }

        case 'spacer': {
            const height = Math.max(0, Math.min(500, Number(block.height) || 0));
            return `<div class="vhd-spacer" style="height:${height}px" aria-hidden="true"></div>`;
        }

        default:
            return '';
    }
}

export default class Serializer {
    static toHtml(project) {
        const rows = project?.rows ?? [];

        const html = rows.map(row => {
            const rowProperties = row.properties ?? {};
            const rowBackground = rowProperties.backgroundColor || '#ffffff';
            const rowPaddingTop = Math.max(0, Number(rowProperties.paddingTop ?? 0));
            const rowPaddingBottom = Math.max(0, Number(rowProperties.paddingBottom ?? 0));

            const columns = row.columns.map(column => {
                const columnProperties = column.properties ?? {};
                const columnBackground = String(
                    columnProperties.backgroundColor || ''
                ).trim();
                const columnPadding = Math.max(0, Number(columnProperties.padding ?? 10));
                const blocks = column.blocks.map(serializeBlock).join('\n');

                const columnStyle = [
                    `--vhd-span:${column.width}`,
                    ...(columnBackground
                        ? [`background-color:${escapeAttribute(columnBackground)}`]
                        : []),
                    `padding:${Number.isFinite(columnPadding) ? columnPadding : 10}px`
                ].join(';');

                return `<div class="vhd-col" style="${columnStyle}">${blocks}</div>`;
            }).join('\n');

            const gridUnits = row.columns.reduce((total, column) => total + column.width, 0);
            const rowStyle = [
                `--vhd-grid-units:${gridUnits}`,
                `background-color:${escapeAttribute(rowBackground)}`,
                `padding-top:${Number.isFinite(rowPaddingTop) ? rowPaddingTop : 0}px`,
                `padding-bottom:${Number.isFinite(rowPaddingBottom) ? rowPaddingBottom : 0}px`
            ].join(';');

            return `<div class="vhd-row" style="${rowStyle}">${columns}</div>`;
        }).join('\n');

        return `<div class="vhd-content">${html}</div>`;
    }
}
