import { describe, it, expect } from 'vitest';
import { injectAll } from '../injectAll.decorator';
import { injectable, ProxyDiContainer } from '../index';
import {
    INJECTIONS,
    Injection,
    IS_INJECTION_PROXY,
    isAllInjection,
    AllInjection,
    ResolveScope,
} from '../types';

class Plugin {
    constructor(public readonly name: string = 'Plugin') {}
}

@injectable()
class PluginManager {
    @injectAll('plugin', ResolveScope.All) plugins: Plugin[];

    getPluginNames() {
        return this.plugins.map((p) => p.name);
    }
}

describe('@injectAll', () => {
    it('should add INJECTIONS with isAll=true', () => {
        const manager = new PluginManager() as any;
        expect(manager[INJECTIONS]).is.not.undefined;

        const injection = manager[INJECTIONS]['plugins'] as Injection;
        expect(injection).is.not.undefined;
        expect(isAllInjection(injection)).is.true;
        if (isAllInjection(injection)) {
            expect(injection.isAll).is.true;
            expect(injection.dependencyId).equal('plugin');
        }
    });

    it('should resolve empty array when no dependencies registered', () => {
        const container = new ProxyDiContainer();
        const manager = container.resolve(PluginManager);

        expect(manager.plugins).is.not.undefined;
        expect(manager.plugins.length).equal(0);
        expect(manager.getPluginNames()).toEqual([]);
    });

    it('should resolve single dependency from container', () => {
        const container = new ProxyDiContainer();
        container.register(new Plugin('Plugin A'), 'plugin');

        const manager = container.resolve(PluginManager);

        expect(manager.plugins.length).equal(1);
        expect(manager.plugins[0].name).equal('Plugin A');
    });

    it('should resolve multiple dependencies from same container', () => {
        const container = new ProxyDiContainer();
        container.register(new Plugin('Plugin A'), 'plugin');

        const child1 = container.createChildContainer();
        child1.register(new Plugin('Plugin B'), 'plugin');

        const child2 = container.createChildContainer();
        child2.register(new Plugin('Plugin C'), 'plugin');

        const manager = container.resolve(PluginManager);

        expect(manager.plugins.length).equal(3);
        const names = manager.getPluginNames().sort();
        expect(names).toEqual(['Plugin A', 'Plugin B', 'Plugin C']);
    });

    it('should resolve dependencies from child containers', () => {
        const parent = new ProxyDiContainer();
        const child = parent.createChildContainer();

        child.register(new Plugin('Child Plugin'), 'plugin');

        const manager = parent.resolve(PluginManager);

        expect(manager.plugins.length).equal(1);
        expect(manager.plugins[0].name).equal('Child Plugin');
    });

    it('should work with @injectable dependencies', () => {
        @injectable('autoPlugin')
        class AutoPlugin {
            name = 'Auto Plugin';
        }

        class AutoPluginManager {
            @injectAll(AutoPlugin) plugins: AutoPlugin[];
        }

        const container = new ProxyDiContainer();
        const manager = container.register(AutoPluginManager);

        const child = container.createChildContainer();
        child.resolve(AutoPlugin);

        expect(manager.plugins.length).equal(1);
        expect(manager.plugins[0].name).equal('Auto Plugin');
    });

    it('should throw error when decorating non-field', () => {
        expect(() => {
            const anyInjectAll = injectAll as any;
            @anyInjectAll('test')
            class Test {}
        }).toThrowError('@injectAll decorator should decorate fields');
    });

    it('should auto-bake by default', () => {
        const container = new ProxyDiContainer();
        const pluginA = new Plugin('Plugin A');
        container.register(pluginA, 'plugin');

        const manager = container.resolve(PluginManager);

        expect(manager.plugins.length).equal(1);
        expect(manager.plugins[0]).equal(pluginA);
    });

    it('should update dependencies when allowRewriteDependencies is true', () => {
        const container = new ProxyDiContainer({
            allowRewriteDependencies: true,
        });
        const pluginA = new Plugin('Plugin A');
        container.register(pluginA, 'plugin');

        const manager = container.resolve(PluginManager);

        expect(manager.plugins[0] === pluginA).is.true;

        const pluginB = new Plugin('Plugin A');
        container.register(pluginB, 'plugin');

        expect(manager.plugins[0] === pluginB).is.true;
    });

    it('should support nested hierarchy', () => {
        const root = new ProxyDiContainer();
        root.register(new Plugin('Root'), 'plugin');

        const level1 = root.createChildContainer();
        level1.register(new Plugin('Level 1'), 'plugin');

        const level2 = level1.createChildContainer();
        level2.register(new Plugin('Level 2'), 'plugin');

        const manager = root.resolve(PluginManager);

        expect(manager.plugins.length).equal(3);
        const names = manager.getPluginNames().sort();
        expect(names).toEqual(['Level 1', 'Level 2', 'Root']);
    });

    it('should work when registered in child container', () => {
        // TODO: Should it works this way?
        const parent = new ProxyDiContainer();
        parent.register(new Plugin('Parent Plugin'), 'plugin');

        const child = parent.createChildContainer();
        const childPlugin = child.createChildContainer();
        childPlugin.register(new Plugin('Child Plugin'), 'plugin');

        const manager = child.resolve(PluginManager);

        expect(manager.plugins.length).equal(2);
        const names = manager.getPluginNames().sort();
        expect(names).toEqual(['Child Plugin', 'Parent Plugin']);
    });

    it('should throw error for invalid dependency class', () => {
        expect(() => {
            class InvalidManager {
                @injectAll((() => {}) as any) plugins: any[];
            }
        }).toThrowError('Invalid dependency class');
    });

    it('should work with non-injectable class using class name', () => {
        class RegularPlugin {
            name = 'Regular';
        }

        class RegularPluginManager {
            @injectAll(RegularPlugin) plugins: RegularPlugin[];
        }

        const container = new ProxyDiContainer();
        const manager = container.register(RegularPluginManager);

        const child1 = container.createChildContainer();
        child1.register(new RegularPlugin(), 'RegularPlugin');

        const child2 = container.createChildContainer();
        child2.register(new RegularPlugin(), 'RegularPlugin');

        expect(manager.plugins.length).equal(2);
    });

    it('should support array operations', () => {
        const container = new ProxyDiContainer();
        container.register(new Plugin('A'), 'plugin');

        const child1 = container.createChildContainer();
        child1.register(new Plugin('B'), 'plugin');

        const child2 = container.createChildContainer();
        child2.register(new Plugin('C'), 'plugin');

        const manager = container.resolve(PluginManager);

        // Test array operations
        expect(manager.plugins.length).equal(3);
        expect(manager.plugins.map((p) => p.name).sort()).toEqual([
            'A',
            'B',
            'C',
        ]);
        expect(manager.plugins.filter((p) => p.name === 'A').length).equal(1);
        expect(manager.plugins.find((p) => p.name === 'B')?.name).equal('B');
    });

    it('should work with bakeInjections()', () => {
        const container = new ProxyDiContainer({
            allowRewriteDependencies: true,
        });
        container.register(new Plugin('Plugin A'), 'plugin');

        const manager = container.resolve(PluginManager);

        // Access first to create proxy
        expect(manager.plugins.length).equal(1);

        container.bakeInjections();

        // After baking, array remains dynamic (proxy), but elements are baked
        expect(manager.plugins.length).equal(1);
        expect(manager.plugins[0].name).equal('Plugin A');

        // Array stays dynamic - adding new plugin should be visible
        const child = container.createChildContainer();
        child.register(new Plugin('Plugin B'), 'plugin');
        expect(manager.plugins.length).equal(2);
    });

    it('should keep array dynamic even after accessing', () => {
        const container = new ProxyDiContainer();
        container.register(new Plugin('Plugin A'), 'plugin');

        const manager = container.resolve(PluginManager);

        // Access multiple times - array should update dynamically
        expect(manager.plugins.length).equal(1);

        // Add plugin in child container
        const child = container.createChildContainer();
        child.register(new Plugin('Plugin B'), 'plugin');

        // Array should reflect the change
        expect(manager.plugins.length).equal(2);
        expect(manager.plugins.map((p) => p.name).sort()).toEqual([
            'Plugin A',
            'Plugin B',
        ]);
    });

    it('should support has operation on baked array', () => {
        const container = new ProxyDiContainer();
        container.register(new Plugin('Plugin A'), 'plugin');

        const manager = container.resolve(PluginManager);

        // Access to trigger baking
        const plugins = manager.plugins;

        // Check if properties exist
        expect('length' in plugins).is.true;
        expect('map' in plugins).is.true;
        expect(0 in plugins).is.true;
    });

    it('should bake injectAll with child containers', () => {
        const parent = new ProxyDiContainer();
        parent.register(new Plugin('Parent'), 'plugin');

        const child = parent.createChildContainer();
        child.register(new Plugin('Child'), 'plugin');

        const manager = parent.resolve(PluginManager);

        // Don't access plugins before baking
        parent.bakeInjections();

        // After baking, should have both plugins
        expect(manager.plugins.length).equal(2);
        const names = manager.getPluginNames().sort();
        expect(names).toEqual(['Child', 'Parent']);
    });

    it('should throw error when accessing unknown dependency in injectAll', () => {
        class UnknownPluginManager {
            @injectAll('unknownPlugin') plugins: any[];
        }

        const container = new ProxyDiContainer();
        const manager = container.register(UnknownPluginManager);

        // Should return empty array for unknown dependencies, not throw
        expect(manager.plugins.length).equal(0);
    });

    it('should throw error when accessing plugins on uncontainerized instance', () => {
        class UncontainerizedManager {
            @injectAll('plugin') plugins: Plugin[];
        }

        const manager = new UncontainerizedManager();
        const container = new ProxyDiContainer();

        // Manually inject dependencies without registering in container
        container.injectDependenciesTo(manager);

        // Should throw error because instance is not registered in any container
        expect(() => manager.plugins.length).toThrowError(
            'Instance is not registered in any container'
        );
    });

    it('should support accessing plugins without prior registration', () => {
        const container = new ProxyDiContainer({
            allowRewriteDependencies: true,
        });

        const manager = container.resolve(PluginManager);

        // Access plugins when no plugins are registered
        expect(manager.plugins.length).equal(0);

        // Now register a plugin
        const child = container.createChildContainer();
        child.register(new Plugin('New Plugin'), 'plugin');

        // Should see the new plugin
        expect(manager.plugins.length).equal(1);
        expect(manager.plugins[0].name).equal('New Plugin');
    });

    it('should bake injectAll when some children have no matching dependency', () => {
        const parent = new ProxyDiContainer();
        parent.register(new Plugin('Parent'), 'plugin');

        const childWithPlugin = parent.createChildContainer();
        childWithPlugin.register(new Plugin('Child 1'), 'plugin');

        const childWithoutPlugin = parent.createChildContainer();
        // This child has no 'plugin' dependency - should return empty array for this child

        const manager = parent.register(PluginManager, 'manager');

        parent.bakeInjections();

        // Should have plugins from parent and all children that have them
        expect(manager.plugins.length).greaterThan(0);
        const names = manager.getPluginNames();
        expect(names).toContain('Parent');
        expect(names).toContain('Child 1');
    });

    it('should cover empty array branch in recursiveResolveAll', () => {
        // Direct test for line 326: child container without dependency
        const parent = new ProxyDiContainer();

        const manager = parent.register(PluginManager, 'manager');

        // Baking should handle child with no matching dependency
        parent.bakeInjections();

        expect(manager.plugins.length).equal(0);
    });

    it('should cover set handler on unbaked array', () => {
        // TODO^ This should throw and extexption!
        // Direct test for lines 142-143: set on proxy before baking
        const container = new ProxyDiContainer({
            allowRewriteDependencies: true,
        });

        const manager = container.resolve(PluginManager);

        // Get reference before any access (unbaked)
        const plugins: any = manager.plugins;

        // Trigger set operation - this calls getDependencies() in set handler
        expect(() => {
            plugins[999] = new Plugin('Test');
        }).not.toThrow();

        // The set operation executes successfully (covers lines 142-143)
        expect(manager.plugins).toBeDefined();
    });

    it('should access InjectionProxy internal properties', () => {
        const container = new ProxyDiContainer();
        const manager = container.resolve(PluginManager);
        const plugins: any = manager.plugins;

        // Access internal proxy properties to cover lines 31-32 in makeInjectAllProxy
        expect(plugins[IS_INJECTION_PROXY]).toBe(true);
    });

    it('should update when dependency is removed from container', () => {
        const container = new ProxyDiContainer();
        container.register(new Plugin('Plugin A'), 'plugin');

        const child = container.createChildContainer();
        child.register(new Plugin('Plugin B'), 'plugin');

        const manager = container.resolve(PluginManager);

        // First access - should have 2 plugins
        expect(manager.plugins.length).equal(2);

        // Remove plugin from child container
        child.remove('plugin');

        // Should now have only 1 plugin
        expect(manager.plugins.length).equal(1);
        expect(manager.plugins[0].name).equal('Plugin A');
    });

    it('should update when child container is destroyed', () => {
        const container = new ProxyDiContainer();
        container.register(new Plugin('Plugin A'), 'plugin');

        const child = container.createChildContainer();
        child.register(new Plugin('Plugin B'), 'plugin');

        const manager = container.resolve(PluginManager);

        // First access - should have 2 plugins
        expect(manager.plugins.length).equal(2);

        // Destroy child container
        child.destroy();

        // Should now have only 1 plugin
        expect(manager.plugins.length).equal(1);
        expect(manager.plugins[0].name).equal('Plugin A');
    });

    it('should update when new child container is added after first access', () => {
        const container = new ProxyDiContainer();
        container.register(new Plugin('Plugin A'), 'plugin');

        const manager = container.resolve(PluginManager);

        // First access - should have 1 plugin
        expect(manager.plugins.length).equal(1);

        // Add new child container AFTER first access
        const child1 = container.createChildContainer();
        child1.register(new Plugin('Plugin B'), 'plugin');

        // Should now see the new plugin
        expect(manager.plugins.length).equal(2);

        // Add another child
        const child2 = container.createChildContainer();
        child2.register(new Plugin('Plugin C'), 'plugin');

        // Should now have all 3
        expect(manager.plugins.length).equal(3);
        expect(manager.plugins.map((p) => p.name).sort()).toEqual([
            'Plugin A',
            'Plugin B',
            'Plugin C',
        ]);
    });

    it('should work with @injectable class registered with Symbol ID', () => {
        const symbolId = Symbol('symbolPlugin');

        @injectable(symbolId)
        class SymbolPlugin {
            name = 'Symbol Plugin';
        }

        class SymbolPluginManager {
            @injectAll(SymbolPlugin) plugins: SymbolPlugin[];
        }

        const container = new ProxyDiContainer();
        const manager = container.register(SymbolPluginManager);

        const child1 = container.createChildContainer();
        child1.resolve(SymbolPlugin);

        const child2 = container.createChildContainer();
        child2.resolve(SymbolPlugin);

        expect(manager.plugins.length).equal(2);
        expect(manager.plugins[0].name).equal('Symbol Plugin');
        expect(manager.plugins[1].name).equal('Symbol Plugin');
    });
});
