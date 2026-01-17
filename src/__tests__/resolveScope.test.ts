import { describe, it, expect } from 'vitest';
import { ProxyDiContainer, ResolveScope, resolveAll, injectAll, injectable } from '../index';

class Plugin {
    constructor(public readonly name: string) {}
}

@injectable('scopeTestAuto')
class ScopeTestAuto {
    name = 'ScopeTestAuto';
}

class Manager {
    getPlugins() {
        return resolveAll(this, 'plugin', ResolveScope.All);
    }
}

describe('ResolveScope', () => {
    it('Parent only - resolves from parent but not current or children', () => {
        const grandparent = new ProxyDiContainer();
        grandparent.register(new Plugin('Grandparent'), 'plugin');

        const parent = grandparent.createChildContainer();
        parent.register(new Plugin('Parent'), 'plugin');

        const current = parent.createChildContainer();
        current.register(new Plugin('Current'), 'plugin');
        const manager = current.register(new Manager(), 'manager');

        const child = current.createChildContainer();
        child.register(new Plugin('Child'), 'plugin');

        const plugins = resolveAll<Plugin>(manager, 'plugin', ResolveScope.Parent);

        expect(plugins.length).equal(1);
        expect(plugins[0].name).equal('Parent');
    });

    it('Current only - resolves from current but not parent or children', () => {
        const parent = new ProxyDiContainer();
        parent.register(new Plugin('Parent'), 'plugin');

        const current = parent.createChildContainer();
        current.register(new Plugin('Current'), 'plugin');
        const manager = current.register(new Manager(), 'manager');

        const child = current.createChildContainer();
        child.register(new Plugin('Child'), 'plugin');

        const plugins = resolveAll<Plugin>(manager, 'plugin', ResolveScope.Current);

        expect(plugins.length).equal(1);
        expect(plugins[0].name).equal('Current');
    });

    it('Children only - resolves from children but not parent or current', () => {
        const parent = new ProxyDiContainer();
        parent.register(new Plugin('Parent'), 'plugin');

        const current = parent.createChildContainer();
        current.register(new Plugin('Current'), 'plugin');
        const manager = current.register(new Manager(), 'manager');

        const child1 = current.createChildContainer();
        child1.register(new Plugin('Child1'), 'plugin');

        const child2 = current.createChildContainer();
        child2.register(new Plugin('Child2'), 'plugin');

        const plugins = resolveAll<Plugin>(manager, 'plugin', ResolveScope.Children);

        expect(plugins.length).equal(2);
        const names = plugins.map((p) => p.name).sort();
        expect(names).toEqual(['Child1', 'Child2']);
    });

    it('Parent | Current - resolves from parent and current but not children', () => {
        const parent = new ProxyDiContainer();
        parent.register(new Plugin('Parent'), 'plugin');

        const current = parent.createChildContainer();
        current.register(new Plugin('Current'), 'plugin');
        const manager = current.register(new Manager(), 'manager');

        const child = current.createChildContainer();
        child.register(new Plugin('Child'), 'plugin');

        const plugins = resolveAll<Plugin>(
            manager,
            'plugin',
            ResolveScope.Parent | ResolveScope.Current
        );

        expect(plugins.length).equal(2);
        const names = plugins.map((p) => p.name).sort();
        expect(names).toEqual(['Current', 'Parent']);
    });

    it('Parent | Children - resolves from parent and children but not current', () => {
        const parent = new ProxyDiContainer();
        parent.register(new Plugin('Parent'), 'plugin');

        const current = parent.createChildContainer();
        current.register(new Plugin('Current'), 'plugin');
        const manager = current.register(new Manager(), 'manager');

        const child = current.createChildContainer();
        child.register(new Plugin('Child'), 'plugin');

        const plugins = resolveAll<Plugin>(
            manager,
            'plugin',
            ResolveScope.Parent | ResolveScope.Children
        );

        expect(plugins.length).equal(2);
        const names = plugins.map((p) => p.name).sort();
        expect(names).toEqual(['Child', 'Parent']);
    });

    it('Current | Children - resolves from current and children but not parent', () => {
        const parent = new ProxyDiContainer();
        parent.register(new Plugin('Parent'), 'plugin');

        const current = parent.createChildContainer();
        current.register(new Plugin('Current'), 'plugin');
        const manager = current.register(new Manager(), 'manager');

        const child = current.createChildContainer();
        child.register(new Plugin('Child'), 'plugin');

        const plugins = resolveAll<Plugin>(
            manager,
            'plugin',
            ResolveScope.Current | ResolveScope.Children
        );

        expect(plugins.length).equal(2);
        const names = plugins.map((p) => p.name).sort();
        expect(names).toEqual(['Child', 'Current']);
    });

    it('All (explicit) - resolves from all levels', () => {
        const parent = new ProxyDiContainer();
        parent.register(new Plugin('Parent'), 'plugin');

        const current = parent.createChildContainer();
        current.register(new Plugin('Current'), 'plugin');
        const manager = current.register(new Manager(), 'manager');

        const child = current.createChildContainer();
        child.register(new Plugin('Child'), 'plugin');

        const plugins = resolveAll<Plugin>(manager, 'plugin', ResolveScope.All);

        expect(plugins.length).equal(3);
        const names = plugins.map((p) => p.name).sort();
        expect(names).toEqual(['Child', 'Current', 'Parent']);
    });

    it('Children (default) - resolves from children when scope not specified', () => {
        const parent = new ProxyDiContainer();
        parent.register(new Plugin('Parent'), 'plugin');

        const current = parent.createChildContainer();
        current.register(new Plugin('Current'), 'plugin');
        const manager = current.register(new Manager(), 'manager');

        const child = current.createChildContainer();
        child.register(new Plugin('Child'), 'plugin');

        const plugins = resolveAll<Plugin>(manager, 'plugin');

        expect(plugins.length).equal(1);
        const names = plugins.map((p) => p.name).sort();
        expect(names).toEqual(['Child']);
    });

    it('Throws error when scope is 0', () => {
        const container = new ProxyDiContainer();
        const manager = container.register(new Manager(), 'manager');

        expect(() => {
            resolveAll(manager, 'plugin', 0 as any);
        }).toThrowError('ResolveScope must have at least one flag set');
    });

    it('@injectAll with scope parameter', () => {
        class PluginManager {
            @injectAll('plugin', ResolveScope.Current | ResolveScope.Children)
            plugins: Plugin[];
        }

        const parent = new ProxyDiContainer();
        parent.register(new Plugin('Parent'), 'plugin');

        const current = parent.createChildContainer();
        current.register(new Plugin('Current'), 'plugin');
        const manager = current.register(new PluginManager(), 'manager');

        const child = current.createChildContainer();
        child.register(new Plugin('Child'), 'plugin');

        expect(manager.plugins.length).equal(2);
        const names = manager.plugins.map((p) => p.name).sort();
        expect(names).toEqual(['Child', 'Current']);
    });

    describe('isKnown() with scope', () => {
        it('isKnown with Children scope - finds in direct child', () => {
            const parent = new ProxyDiContainer();
            const child = parent.createChildContainer();
            child.register(new Plugin('Child'), 'plugin');

            expect(parent.isKnown('plugin', ResolveScope.Children)).toBe(true);
            expect(parent.isKnown('plugin', ResolveScope.Current)).toBe(false);
        });

        it('isKnown with Children scope - finds in nested grandchild', () => {
            const root = new ProxyDiContainer();
            const child = root.createChildContainer();
            const grandchild = child.createChildContainer();
            grandchild.register(new Plugin('Grandchild'), 'plugin');

            expect(root.isKnown('plugin', ResolveScope.Children)).toBe(true);
            expect(child.isKnown('plugin', ResolveScope.Children)).toBe(true);
        });

        it('isKnown with Children scope - returns false when not found', () => {
            const parent = new ProxyDiContainer();
            const child = parent.createChildContainer();

            expect(parent.isKnown('plugin', ResolveScope.Children)).toBe(false);
        });

        it('isKnown default scope is Current | Parent', () => {
            const parent = new ProxyDiContainer();
            parent.register(new Plugin('Parent'), 'plugin');
            const child = parent.createChildContainer();

            expect(child.isKnown('plugin')).toBe(true);
        });
    });

    describe('resolve() with scope', () => {
        it('resolve with Children scope - resolves from direct child', () => {
            const parent = new ProxyDiContainer();
            const child = parent.createChildContainer();
            child.register(new Plugin('Child'), 'plugin');

            const plugin = parent.resolve<Plugin>('plugin', ResolveScope.Children);
            expect(plugin.name).toBe('Child');
        });

        it('resolve with Children scope - resolves from nested grandchild', () => {
            const root = new ProxyDiContainer();
            const child = root.createChildContainer();
            const grandchild = child.createChildContainer();
            grandchild.register(new Plugin('Grandchild'), 'plugin');

            const plugin = root.resolve<Plugin>('plugin', ResolveScope.Children);
            expect(plugin.name).toBe('Grandchild');
        });

        it('resolve with Children scope - throws when not found', () => {
            const parent = new ProxyDiContainer();
            const child = parent.createChildContainer();

            expect(() => parent.resolve('plugin', ResolveScope.Children)).toThrowError(
                "Can't resolve unknown dependency"
            );
        });

        it('resolve default scope is Current | Parent', () => {
            const parent = new ProxyDiContainer();
            parent.register(new Plugin('Parent'), 'plugin');
            const child = parent.createChildContainer();

            const plugin = child.resolve<Plugin>('plugin');
            expect(plugin.name).toBe('Parent');
        });

        it('resolve with Current scope only', () => {
            const parent = new ProxyDiContainer();
            parent.register(new Plugin('Parent'), 'plugin');
            const child = parent.createChildContainer();
            child.register(new Plugin('Child'), 'plugin');

            const plugin = child.resolve<Plugin>('plugin', ResolveScope.Current);
            expect(plugin.name).toBe('Child');
        });

        it('resolve with Current scope - throws when not in current', () => {
            const parent = new ProxyDiContainer();
            parent.register(new Plugin('Parent'), 'plugin');
            const child = parent.createChildContainer();

            expect(() => child.resolve('plugin', ResolveScope.Current)).toThrowError(
                "Can't resolve unknown dependency"
            );
        });

        it('resolve with Parent scope - finds in grandparent recursively', () => {
            const grandparent = new ProxyDiContainer();
            grandparent.register(new Plugin('Grandparent'), 'plugin');

            const parent = grandparent.createChildContainer();
            const child = parent.createChildContainer();

            const plugin = child.resolve<Plugin>('plugin');
            expect(plugin.name).toBe('Grandparent');
        });

        it('resolve with All scope - falls through Children to @injectable', () => {
            const parent = new ProxyDiContainer();
            const child = parent.createChildContainer();
            // Child exists but has no 'scopeTestAuto' dependency
            // @injectable ScopeTestAuto class should be resolved after checking Children

            const auto = parent.resolve<ScopeTestAuto>('scopeTestAuto', ResolveScope.All);
            expect(auto.name).toBe('ScopeTestAuto');
        });
    });
});
