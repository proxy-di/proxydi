import { describe, it, expect } from 'vitest';
import {
    ProxyDiContainer,
    ResolveScope,
    inject,
    injectable,
    DuplicateStrategy,
} from '../index';
import { resolveAll } from '../resolveAll';
import {
    findInjectableId,
    findInjectableIds,
    injectableClasses,
} from '../injectable.decorator';

describe('coverage additions', () => {
    it('isKnown checks children scope', () => {
        const parent = new ProxyDiContainer();
        const child = parent.createChildContainer();
        child.register(class Dep {}, 'dep');

        expect(parent.isKnown('dep', ResolveScope.Children)).toBe(true);
    });

    it('auto-registers injectable by id string', () => {
        @injectable('AutoById')
        class AutoById {}

        const container = new ProxyDiContainer();
        const instance = container.resolve<AutoById>('AutoById');
        expect(instance).toBeInstanceOf(AutoById);
    });

    it('auto-registers injectable by class', () => {
        @injectable()
        class AutoByClass {}

        const container = new ProxyDiContainer();
        const instance = container.resolve(AutoByClass);
        expect(instance).toBeInstanceOf(AutoByClass);
    });

    it('reuses context proxy for resolveInContainerContext', () => {
        const parent = new ProxyDiContainer({
            resolveInContainerContext: true,
        });
        parent.register(class First {}, 'first');

        const child = parent.createChildContainer();
        child.resolve<any>('first');
        child.resolve<any>('first');

        const proxies = (child as any).inContextProxies?.['first'];
        expect(proxies?.size).toBe(1);
        expect(child.resolve('first')).not.toBe(parent.resolve('first'));
    });

    it('reuses context proxy when requested directly', () => {
        const parent = new ProxyDiContainer({
            resolveInContainerContext: true,
        });
        const instance = parent.register(class First {}, 'first');

        const child = parent.createChildContainer();
        const firstProxy = (child as any).getContextProxy('first', instance);
        const reusedProxy = (child as any).getContextProxy('first', instance);

        expect(reusedProxy).toBe(firstProxy);
    });

    it('throws when scope is zero', () => {
        const container = new ProxyDiContainer();
        container.register(class Dep {}, 'dep');
        expect(() => container.resolve('dep', 0 as any)).toThrowError(
            'ResolveScope must have at least one flag set'
        );
    });

    it('adds class name when dependencyId array passed', () => {
        class Named {}
        const container = new ProxyDiContainer();
        container.register(Named, ['alias']);

        expect(container.isKnown('Named')).toBe(true);
    });

    it('adds constructor name when registering instances with multiple ids', () => {
        class Named {}
        const container = new ProxyDiContainer();
        const instance = new Named();

        container.register(instance as any, ['alias']);

        expect(container.isKnown('alias')).toBe(true);
        expect(container.isKnown('Named')).toBe(true);
    });

    it('remove on unknown id exits silently', () => {
        const container = new ProxyDiContainer();
        expect(() => container.remove('unknown')).not.toThrow();
    });

    it('remove by instance works and clears bindings', () => {
        class Dep {}
        const container = new ProxyDiContainer();
        const instance = container.register(Dep, 'dep');

        container.remove(instance);
        expect(container.isKnown('dep')).toBe(false);
    });

    it('removeByInstance handles primitives and unknown objects', () => {
        const container = new ProxyDiContainer({ allowRegisterAnything: true });
        container.register(123 as any, 'num');

        (container as any).removeByInstance(123 as any);
        (container as any).removeByInstance({} as any);

        expect(container.isKnown('num')).toBe(false);
    });

    it('duplicate strategy replace-if-single-else-add replaces single and adds multiples', () => {
        class Dep {}
        const container = new ProxyDiContainer();
        const first = container.register(new Dep(), { dependencyId: 'dep' });
        const second = container.register(new Dep(), { dependencyId: 'dep' });
        const third = container.register(new Dep(), { dependencyId: 'dep' });

        const all = container.resolveAll<Dep>('dep', ResolveScope.Current);
        expect(all).toHaveLength(1);
        expect(all[0]).toBe(third);
        expect(all[0]).not.toBe(first);
        expect(all[0]).not.toBe(second);
    });

    it('duplicate strategy replace-if-single-else-add adds when already multiple', () => {
        class Dep {}
        const container = new ProxyDiContainer();
        const first = container.register(new Dep(), {
            dependencyId: 'dep',
            duplicateStrategy: DuplicateStrategy.AlwaysAdd,
        });
        const second = container.register(new Dep(), {
            dependencyId: 'dep',
            duplicateStrategy: DuplicateStrategy.AlwaysAdd,
        });

        const third = container.register(new Dep(), { dependencyId: 'dep' });

        const all = container.resolveAll<Dep>('dep', ResolveScope.Current);
        expect(all).toHaveLength(3);
        expect(all).toContain(first);
        expect(all).toContain(second);
        expect(all).toContain(third);
    });

    it('duplicate strategy always replace', () => {
        class Dep {}
        const container = new ProxyDiContainer();
        const first = container.register(new Dep(), {
            dependencyId: 'dep',
            duplicateStrategy: DuplicateStrategy.AlwaysReplace,
        });
        const second = container.register(new Dep(), {
            dependencyId: 'dep',
            duplicateStrategy: DuplicateStrategy.AlwaysReplace,
        });

        const all = container.resolveAll<Dep>('dep', ResolveScope.Current);
        expect(all).toHaveLength(1);
        expect(all[0]).toBe(second);
        expect(all[0]).not.toBe(first);
    });

    it('duplicate strategy always add', () => {
        class Dep {}
        const container = new ProxyDiContainer();
        const first = container.register(new Dep(), {
            dependencyId: 'dep',
            duplicateStrategy: DuplicateStrategy.AlwaysAdd,
        });
        const second = container.register(new Dep(), {
            dependencyId: 'dep',
            duplicateStrategy: DuplicateStrategy.AlwaysAdd,
        });

        const all = container.resolveAll<Dep>('dep', ResolveScope.Current);
        expect(all).toHaveLength(2);
        expect(all).toContain(first);
        expect(all).toContain(second);
    });

    it('duplicate strategy throw', () => {
        class Dep {}
        const container = new ProxyDiContainer();
        container.register(new Dep(), { dependencyId: 'dep' });

        expect(() =>
            container.register(new Dep(), {
                dependencyId: 'dep',
                duplicateStrategy: DuplicateStrategy.Throw,
            })
        ).toThrowError('Dependency with id "dep" already exists');
    });

    it('findInjectableIds reads from registry map (symbol keys)', () => {
        class Manual {}
        const sym = Symbol('manual');
        injectableClasses[sym] = [Manual];

        const ids = findInjectableIds(Manual);
        expect(ids).toContain(sym);
    });

    it('findInjectableIds reads from registry map (string keys)', () => {
        class ManualString {}
        injectableClasses['manual-string'] = [ManualString];

        const ids = findInjectableIds(ManualString);
        expect(ids).toContain('manual-string');

        delete injectableClasses['manual-string'];
    });

    it('findInjectableId throws for non-injectable', () => {
        class NotInjectable {}
        expect(() => findInjectableId(NotInjectable)).toThrowError(
            'Class is not @injectable'
        );
    });

    it('resolveInContainerContext child scope reach parent then bake resolves', () => {
        class First {
            @inject('second') second!: Second;
        }
        class Second {}

        const parent = new ProxyDiContainer({
            resolveInContainerContext: true,
        });
        parent.register(Second, 'second');
        const child = parent.createChildContainer();
        child.register(First, 'first');

        const first = child.resolve<First>('first');
        expect(first.second).toBeDefined();

        parent.bakeInjections();
        expect(first.second).toBeDefined();
    });

    it('container.resolveAll mirrors resolveAll helper', () => {
        class Dep {}
        const parent = new ProxyDiContainer();
        parent.register(Dep, 'dep');
        const child = parent.createChildContainer();
        child.register(Dep, 'dep');

        const all = parent.resolveAll<Dep>(
            'dep',
            ResolveScope.Current | ResolveScope.Children
        );

        expect(all.length).toBe(2);
        expect(new Set(all).size).toBe(2);
    });

    it('container.resolveAll supports class id and dedupes multi-id registrations', () => {
        @injectable(['dep', 'dep2'])
        class Dep {}

        const container = new ProxyDiContainer();
        container.register(Dep, ['dep', 'dep2']);

        const all = container.resolveAll<Dep>(Dep, ResolveScope.Current);
        expect(all.length).toBe(1);
        expect(all[0]).toBeInstanceOf(Dep);
    });

    it('container.resolveAll supports parent scope', () => {
        class Dep {}
        const parent = new ProxyDiContainer();
        const dep = parent.register(Dep, 'dep');
        const child = parent.createChildContainer();

        const all = child.resolveAll<Dep>(
            'dep',
            ResolveScope.Parent | ResolveScope.Current
        );

        expect(all).toEqual([dep]);
    });

    it('container.resolveAll throws when scope is zero', () => {
        const container = new ProxyDiContainer();
        container.register(class Dep {}, 'dep');

        expect(() =>
            (container as any).resolveAll('dep', 0 as any)
        ).toThrowError('ResolveScope must have at least one flag set');
    });

    it('isKnown children scope fallback returns false when no children match', () => {
        const parent = new ProxyDiContainer();
        parent.createChildContainer();

        expect(parent.isKnown('missing', ResolveScope.Children)).toBe(false);
    });

    it('resolve with children scope only throws when no children found', () => {
        const parent = new ProxyDiContainer();
        parent.createChildContainer();

        expect(() =>
            parent.resolve('missing', ResolveScope.Children)
        ).toThrowError(`Can't resolve unknown dependency: missing`);
    });

    it('resolve falls back to injectable registry when auto-register skipped', () => {
        class AutoLater {}
        injectableClasses['AutoLater'] = [AutoLater];
        const container = new ProxyDiContainer();
        const originalAuto = (container as any).autoRegisterInjectable;

        (container as any).autoRegisterInjectable = () => undefined;

        const resolved = container.resolve<AutoLater>('AutoLater');
        expect(resolved).toBeInstanceOf(AutoLater);

        (container as any).autoRegisterInjectable = originalAuto;
        delete injectableClasses['AutoLater'];
    });
});
