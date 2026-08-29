function parseVersion(value) {
    const match = String(value ?? '').match(/^(\d+)\.(\d+)\.(\d+)/);

    if (!match) {
        return null;
    }

    return match.slice(1).map(Number);
}

function compareVersions(left, right) {
    for (let index = 0; index < 3; index += 1) {
        const difference = (left[index] ?? 0) - (right[index] ?? 0);

        if (difference !== 0) {
            return difference;
        }
    }

    return 0;
}

function satisfiesRequirement(currentVersion, requirement) {
    if (!requirement) {
        return true;
    }

    const current = parseVersion(currentVersion);

    if (!current) {
        return true;
    }

    const expression = String(requirement).trim();
    const minimumMatch = expression.match(/^>=\s*(\d+\.\d+\.\d+)/);

    if (minimumMatch) {
        const minimum = parseVersion(minimumMatch[1]);
        return minimum ? compareVersions(current, minimum) >= 0 : true;
    }

    const exact = parseVersion(expression);

    if (exact) {
        return compareVersions(current, exact) === 0;
    }

    console.warn(
        `Vanilla HTML Designer: unsupported plugin version requirement "${expression}".`
    );

    return true;
}

export default class PluginManager {
    constructor(host, version) {
        this.host = host;
        this.version = version;
        this.plugins = new Map();
    }

    #validate(plugin) {
        if (!plugin || typeof plugin !== 'object') {
            throw new TypeError(
                'Vanilla HTML Designer: a plugin must export an object.'
            );
        }

        const name = String(plugin.name ?? '').trim();

        if (!name) {
            throw new Error(
                'Vanilla HTML Designer: a plugin must define a unique name.'
            );
        }

        if (typeof plugin.setup !== 'function') {
            throw new Error(
                `Vanilla HTML Designer: plugin "${name}" must define setup(vhd).`
            );
        }

        if (
            plugin.requires
            && !satisfiesRequirement(this.version, plugin.requires)
        ) {
            throw new Error(
                `Vanilla HTML Designer: plugin "${name}" requires VHD ${plugin.requires}, current version is ${this.version}.`
            );
        }

        return name;
    }

    #createApi(pluginName) {
        const host = this.host;

        return Object.freeze({
            version: this.version,
            plugin: pluginName,

            on(event, callback) {
                return host.on(event, callback);
            },

            off(event, callback) {
                return host.off(event, callback);
            },

            getData() {
                return host.getData();
            },

            getHtml() {
                return host.getHtml();
            },

            insertAtCursor(content, options = {}) {
                return host.insertAtCursor(content, options);
            },

            setStatus(message = '', type = 'info') {
                return host.setStatus(message, type);
            },

            registerToolbarButton(definition) {
                return host.registerToolbarButton({
                    ...definition,
                    plugin: pluginName
                });
            },

            registerBlock(definition) {
                return host.registerBlock({
                    ...definition,
                    plugin: pluginName
                });
            }
        });
    }

    use(plugin) {
        const name = this.#validate(plugin);

        if (this.plugins.has(name)) {
            throw new Error(
                `Vanilla HTML Designer: plugin "${name}" is already loaded.`
            );
        }

        const record = {
            name,
            version: String(plugin.version ?? ''),
            requires: String(plugin.requires ?? ''),
            author: String(plugin.author ?? ''),
            license: String(plugin.license ?? ''),
            plugin
        };

        this.plugins.set(name, record);

        try {
            plugin.setup(this.#createApi(name));
        } catch (error) {
            this.plugins.delete(name);
            throw error;
        }

        this.host._emitPluginEvent('plugin:loaded', {
            name,
            version: record.version
        });

        return record;
    }

    list() {
        return [...this.plugins.values()].map(record => ({
            name: record.name,
            version: record.version,
            requires: record.requires,
            author: record.author,
            license: record.license
        }));
    }

    has(name) {
        return this.plugins.has(String(name));
    }
}
