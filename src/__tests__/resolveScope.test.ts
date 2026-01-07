import { describe, it, expect } from 'vitest';
import { ProxyDiContainer, ResolveScope, resolveAll, injectAll } from '../index';

class Plugin {
    constructor(public readonly name: string) {}
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
});
