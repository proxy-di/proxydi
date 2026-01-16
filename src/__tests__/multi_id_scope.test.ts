import { describe, it, expect } from 'vitest';
import {
    ProxyDiContainer,
    injectable,
    inject,
    ResolveScope,
    DuplicateStrategy,
} from '../index';
import { resolveAll } from '../resolveAll';

describe('multi-id and resolve scope', () => {
    it('resolves same instance via multiple IDs and class name', () => {
        const altId = 'alt';
        const sym = Symbol('sym');

        @injectable([altId, sym])
        class Multi {
            id = 'multi';
        }

        const container = new ProxyDiContainer();

        const byClass = container.resolve(Multi);
        const byAlt = container.resolve<Multi>(altId);
        const bySym = container.resolve<Multi>(sym);

        expect(byClass).toBe(byAlt);
        expect(byAlt).toBe(bySym);
    });

    it('resolve() with scope reaches children', () => {
        class Dep {
            value = 'child';
        }

        class Consumer {
            @inject(Dep, ResolveScope.Children) dep!: Dep;
        }

        const parent = new ProxyDiContainer();
        const child = parent.createChildContainer();
        child.register(Dep);
        const consumer = parent.register(Consumer);

        expect(consumer.dep.value).toBe('child');
    });

    it('resolveAll returns all instances for same ID', () => {
        const container = new ProxyDiContainer();
        const first = container.register(class A {}, 'dup');
        const second = container.register(class B {}, {
            dependencyId: 'dup',
            duplicateStrategy: DuplicateStrategy.AlwaysAdd,
        });

        const all = resolveAll<any>(first, 'dup', ResolveScope.Current);
        expect(all.length).toBe(2);
        expect(all).toContain(first);
        expect(all).toContain(second);
    });
});
