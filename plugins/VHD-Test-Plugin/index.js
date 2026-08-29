const TestPlugin = {
    name: 'vhd-test-plugin',
    version: '0.5.0',
    requires: '>=0.7.4',
    author: 'Vanilla HTML Designer',
    license: 'MIT',

    setup(vhd) {
        vhd.registerToolbarButton({
            id: 'insert-test',
            label: 'Insérer un contenu de test',
            text: 'T',

            action() {
                const inserted = vhd.insertAtCursor(
                    '<strong>Plugin VHD actif</strong>',
                    { html: true }
                );

                vhd.setStatus(
                    inserted
                        ? 'Le plugin de test a inséré son contenu.'
                        : 'Placez le curseur dans une zone de texte avant de tester le plugin.',
                    inserted ? 'success' : 'info'
                );
            }
        });

        vhd.registerBlock({
            type: 'test-note',
            label: 'Note plugin',

            create() {
                return {
                    type: 'test-note',
                    content: 'Ceci est un bloc ajouté par un plugin.',
                    properties: {
                        url: 'https://example.com',
                        backgroundColor: '#fff7d6',
                        padding: 12,
                        variant: 'info',
                        rounded: true
                    }
                };
            },

            properties: [
                {
                    type: 'group',
                    label: 'Contenu',
                    description: 'Contenu éditorial et lien associé.',
                    fields: [
                        {
                            key: 'content',
                            label: 'Texte',
                            type: 'textarea',
                            rows: 4
                        },
                        {
                            key: 'properties.url',
                            label: 'URL',
                            type: 'url',
                            placeholder: 'https://example.com'
                        }
                    ]
                },
                {
                    type: 'group',
                    label: 'Présentation',
                    fields: [
                        {
                            key: 'properties.backgroundColor',
                            label: 'Couleur de fond',
                            type: 'color'
                        },
                        {
                            key: 'properties.padding',
                            label: 'Marge intérieure',
                            type: 'number',
                            min: 0,
                            max: 60,
                            step: 1
                        },
                        {
                            key: 'properties.variant',
                            label: 'Type',
                            type: 'select',
                            options: [
                                ['info', 'Information'],
                                ['warning', 'Attention'],
                                ['danger', 'Danger']
                            ]
                        },
                        {
                            key: 'properties.rounded',
                            label: 'Coins arrondis',
                            type: 'checkbox'
                        }
                    ]
                }
            ],

            render({ block, update }) {
                const p = block.properties || {};
                const note = document.createElement('div');

                note.style.padding = `${p.padding ?? 12}px`;
                note.style.borderRadius =
                    p.rounded === false ? '0' : '6px';
                note.style.background =
                    p.backgroundColor || '#fff7d6';

                const text = document.createElement('div');
                text.contentEditable = 'true';
                text.textContent = block.content || '';
                text.style.outline = 'none';

                text.addEventListener('input', () => {
                    update(
                        { content: text.textContent },
                        { render: false }
                    );
                });

                note.append(text);

                if (p.url) {
                    const link = document.createElement('a');
                    link.href = p.url;
                    link.textContent = p.url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.style.display = 'block';
                    link.style.marginTop = '8px';
                    link.addEventListener(
                        'click',
                        event => event.preventDefault()
                    );
                    note.append(link);
                }

                return note;
            },

            serialize({ block }) {
                const p = block.properties || {};

                const esc = value => String(value ?? '')
                    .replaceAll('&', '&amp;')
                    .replaceAll('"', '&quot;')
                    .replaceAll('<', '&lt;')
                    .replaceAll('>', '&gt;');

                const padding = Number(p.padding ?? 12);
                const radius = p.rounded === false ? 0 : 6;
                const variant = esc(p.variant || 'info');
                const background = esc(
                    p.backgroundColor || '#fff7d6'
                );
                const url = esc(p.url || '');

                return `<div class="vhd-test-note" data-vhd-variant="${variant}" data-vhd-rounded="${p.rounded === false ? '0' : '1'}" data-vhd-url="${url}" style="padding:${padding}px;border-radius:${radius}px;background:${background}">${esc(block.content)}</div>`;
            },

            canImport(element) {
                return element.matches('.vhd-test-note');
            },

            import(element) {
                const style = element.style;

                return {
                    type: 'test-note',
                    content: element.textContent || '',
                    properties: {
                        url:
                            element.dataset.vhdUrl || '',
                        backgroundColor:
                            style.backgroundColor || '#fff7d6',
                        padding:
                            Number.parseFloat(style.padding) || 12,
                        variant:
                            element.dataset.vhdVariant || 'info',
                        rounded:
                            element.dataset.vhdRounded !== '0'
                    }
                };
            }
        });
    }
};

export default TestPlugin;
