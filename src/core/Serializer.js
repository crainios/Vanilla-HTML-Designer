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

function serializeBlock(block) {
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

            const style = [
                'display:inline-block',
                `background-color:${escapeAttribute(backgroundColor)}`,
                `color:${escapeAttribute(color)}`,
                `border-radius:${borderRadius}px`,
                `padding:${paddingVertical}px ${paddingHorizontal}px`,
                'text-decoration:none'
            ].join(';');

            return `<p class="vhd-button-wrap" style="text-align:${escapeAttribute(align)}"><a class="vhd-button" href="${escapeAttribute(block.url || '#')}" style="${style}">${escapeText(block.text || 'Button')}</a></p>`;
        }

        case 'divider':
            return '<hr class="vhd-divider">';

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
            const columns = row.columns.map(column => {
                const blocks = column.blocks.map(serializeBlock).join('\n');
                return `<div class="vhd-col" style="--vhd-span:${column.width}">${blocks}</div>`;
            }).join('\n');

            const gridUnits = row.columns.reduce((total, column) => total + column.width, 0);
            return `<div class="vhd-row" style="--vhd-grid-units:${gridUnits}">${columns}</div>`;
        }).join('\n');

        return `<div class="vhd-content">${html}</div>`;
    }
}
