function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function inlineMarkdown(value = '') {
    const code = [];
    let html = escapeHtml(value).replace(/`([^`]+)`/g, (_, content) => {
        const token = `\u0000CODE${code.length}\u0000`;
        code.push(`<code>${content}</code>`);
        return token;
    });

    html = html
        .replace(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g,
            (_, alt, source, title) => `<img src="${source}" alt="${alt}"${title ? ` title="${title}"` : ''}>`)
        .replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g,
            (_, label, url, title) => `<a href="${url}"${title ? ` title="${title}"` : ''}>${label}</a>`)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        .replace(/~~([^~]+)~~/g, '<s>$1</s>')
        .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
        .replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');

    return html.replace(/\u0000CODE(\d+)\u0000/g, (_, index) => code[Number(index)] ?? '');
}

function isTableSeparator(line = '') {
    return /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function tableCells(line = '') {
    return line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
}

function listMatch(line = '') {
    const unordered = line.match(/^\s*[-+*]\s+(.+)$/);
    if (unordered) {
        return { type: 'ul', content: unordered[1] };
    }

    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    return ordered ? { type: 'ol', content: ordered[1] } : null;
}

/**
 * Convert the portable Markdown constructs commonly emitted by documentation
 * and publishing tools. The result must still pass through HtmlSanitizer.
 */
export function markdownToHtml(value = '') {
    const lines = String(value).replace(/\r\n?/g, '\n').split('\n');
    const output = [];
    let index = 0;

    while (index < lines.length) {
        const line = lines[index];

        if (!line.trim()) {
            index += 1;
            continue;
        }

        const fence = line.match(/^\s*```([^`]*)$/);
        if (fence) {
            const content = [];
            index += 1;
            while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
                content.push(lines[index]);
                index += 1;
            }
            index += index < lines.length ? 1 : 0;
            const language = fence[1].trim().replace(/[^a-z0-9_-]/gi, '');
            const className = language ? ` class="language-${language}"` : '';
            output.push(`<pre><code${className}>${escapeHtml(content.join('\n'))}</code></pre>`);
            continue;
        }

        const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
        if (heading) {
            const level = heading[1].length;
            output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
            index += 1;
            continue;
        }

        if (/^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line)) {
            output.push('<hr>');
            index += 1;
            continue;
        }

        if (index + 1 < lines.length && line.includes('|') && isTableSeparator(lines[index + 1])) {
            const headers = tableCells(line);
            const rows = [];
            index += 2;
            while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
                rows.push(tableCells(lines[index]));
                index += 1;
            }
            output.push(
                '<table><thead><tr>',
                ...headers.map(cell => `<th>${inlineMarkdown(cell)}</th>`),
                '</tr></thead><tbody>',
                ...rows.map(row => `<tr>${headers.map((_, column) => `<td>${inlineMarkdown(row[column] ?? '')}</td>`).join('')}</tr>`),
                '</tbody></table>'
            );
            continue;
        }

        if (/^\s*>/.test(line)) {
            const quote = [];
            while (index < lines.length && /^\s*>/.test(lines[index])) {
                quote.push(lines[index].replace(/^\s*>\s?/, ''));
                index += 1;
            }
            output.push(`<blockquote><p>${quote.map(inlineMarkdown).join('<br>')}</p></blockquote>`);
            continue;
        }

        const firstListItem = listMatch(line);
        if (firstListItem) {
            const type = firstListItem.type;
            const items = [];
            while (index < lines.length) {
                const item = listMatch(lines[index]);
                if (!item || item.type !== type) {
                    break;
                }
                items.push(`<li>${inlineMarkdown(item.content)}</li>`);
                index += 1;
            }
            output.push(`<${type}>${items.join('')}</${type}>`);
            continue;
        }

        const paragraph = [line.trim()];
        index += 1;
        while (
            index < lines.length
            && lines[index].trim()
            && !/^\s{0,3}#{1,6}\s+/.test(lines[index])
            && !/^\s*>/.test(lines[index])
            && !/^\s*```/.test(lines[index])
            && !listMatch(lines[index])
            && !(index + 1 < lines.length && lines[index].includes('|') && isTableSeparator(lines[index + 1]))
        ) {
            paragraph.push(lines[index].trim());
            index += 1;
        }
        output.push(`<p>${paragraph.map(inlineMarkdown).join('<br>')}</p>`);
    }

    return output.join('');
}
