const FORBIDDEN_ELEMENTS = new Set([
    'script',
    'style',
    'object',
    'embed',
    'applet',
    'base',
    'meta',
    'link',
    'template',
    'form',
    'input',
    'button',
    'select',
    'option',
    'textarea'
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

const URL_ATTRIBUTES = new Set([
    'href',
    'src',
    'poster',
    'action',
    'formaction',
    'xlink:href'
]);

const FORBIDDEN_STYLE_PROPERTIES = new Set([
    'position',
    'z-index',
    'inset',
    'inset-block',
    'inset-inline',
    'top',
    'right',
    'bottom',
    'left'
]);

function baseUrl() {
    return globalThis.location?.href || 'https://localhost/';
}

function sanitizeUrl(value, element, attribute) {
    const url = String(value || '').trim();

    if (!url) {
        return '';
    }

    if (
        url.startsWith('#')
        || url.startsWith('/')
        || url.startsWith('./')
        || url.startsWith('../')
    ) {
        return url;
    }

    try {
        const parsed = new URL(url, baseUrl());

        if (['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
            return url;
        }

        if (
            attribute === 'src'
            && parsed.protocol === 'data:'
            && element.tagName === 'IMG'
            && /^data:image\/(?:png|gif|jpe?g|webp|avif);/i.test(url)
        ) {
            return url;
        }
    } catch {
        return '';
    }

    return '';
}

function sanitizeStyle(element) {
    for (const property of Array.from(element.style)) {
        const value = element.style.getPropertyValue(property);

        if (
            FORBIDDEN_STYLE_PROPERTIES.has(property.toLowerCase())
            || /(?:expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding\s*:|url\s*\()/i.test(value)
        ) {
            element.style.removeProperty(property);
        }
    }

    if (!element.getAttribute('style')?.trim()) {
        element.removeAttribute('style');
    }
}

export function sanitizeHtml(value = '') {
    if (typeof DOMParser !== 'function') {
        return '';
    }

    const parser = new DOMParser();
    const documentHtml = parser.parseFromString(
        String(value),
        'text/html'
    );
    const elements = Array.from(documentHtml.body.querySelectorAll('*'));

    for (const element of elements) {
        const tag = element.tagName.toLowerCase();

        if (FORBIDDEN_ELEMENTS.has(tag)) {
            element.remove();
            continue;
        }

        if (tag === 'iframe') {
            try {
                const source = new URL(
                    element.getAttribute('src') || '',
                    baseUrl()
                );

                if (!SAFE_IFRAME_HOSTS.has(source.hostname.toLowerCase())) {
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

            if (
                name.startsWith('on')
                || [
                    'srcdoc',
                    'srcset',
                    'ping',
                    'autofocus',
                    'contenteditable',
                    'nonce'
                ].includes(name)
            ) {
                element.removeAttribute(attribute.name);
                continue;
            }

            if (name === 'style') {
                sanitizeStyle(element);
                continue;
            }

            if (URL_ATTRIBUTES.has(name)) {
                const safeUrl = sanitizeUrl(attribute.value, element, name);

                if (safeUrl) {
                    element.setAttribute(attribute.name, safeUrl);
                } else {
                    element.removeAttribute(attribute.name);
                }
            }
        }

        if (element.tagName === 'A' && element.target === '_blank') {
            element.rel = 'noopener noreferrer';
        }
    }

    return documentHtml.body.innerHTML;
}
