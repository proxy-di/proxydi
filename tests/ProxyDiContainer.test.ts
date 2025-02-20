import { describe, it, expect } from 'vitest';
import { inject, ProxyDiContainer, autoInjectable } from '../src/index';
import { TestableProxyDi } from './TestableProxyDi.mock';
import { DEPENDENCY_ID } from '../src/types';

class First {
    constructor(public readonly name: string = "I'm first!") {}
    @inject() second: Second;
}

class Second {
    name = "I'm second!";
    @inject() first: First;
}

@autoInjectable('any')
class AnyDependency {
    name = 'any dependency';
}

describe('ProxyDi', () => {
    describe('id', () => {
        it('has some numeric id', () => {
            const container = new ProxyDiContainer();
            expect(container.id).is.not.NaN;
        });

        it('different containers has different id', () => {
            const container1 = new ProxyDiContainer();
            const container2 = new ProxyDiContainer();
            const container3 = container1.createChildContainer();
            expect(container1.id).is.not.equals(container2.id);
            expect(container1.id).is.not.equals(container3.id);
        });
    });

    describe('isKnown()', () => {
        const dependencyId = 'known';

        it('any dependency in unknown without registration', () => {
            const container = new ProxyDiContainer();
            expect(container.isKnown(dependencyId)).is.false;
        });

        it('@autoInjectableDependency always known', () => {
            const container = new ProxyDiContainer();
            expect(container.isKnown('any')).is.true;
        });

        it('class is known after registration', () => {
            const container = new ProxyDiContainer();
            container.newDependency(First, dependencyId);

            expect(container.isKnown(dependencyId)).is.true;
        });

        it("Can't register class with the same dependency ID", () => {
            const container = new ProxyDiContainer();
            container.newDependency(First, dependencyId);
            expect(() =>
                container.newDependency(First, dependencyId)
            ).toThrowError('ProxyDi already has dependency');
        });

        it('Can register class with the same dependency ID', () => {
            const container = new ProxyDiContainer({
                allowRewriteDependencies: true,
            });
            container.newDependency(First, dependencyId);
            container.newDependency(First, dependencyId);

            expect(container.isKnown(dependencyId)).is.true;
        });

        it('removed class is unknown', () => {
            const container = new ProxyDiContainer();
            container.newDependency(First, dependencyId);
            container.removeDependency(dependencyId);

            expect(container.isKnown(dependencyId)).is.false;
        });

        it('instance is known after registration', () => {
            const container = new ProxyDiContainer();
            const instance = new First();
            container.registerDependency(instance, dependencyId);

            expect(container.isKnown(dependencyId)).is.true;
        });

        it("Can't register instance with the same dependency ID", () => {
            const container = new ProxyDiContainer();
            const instance = new First();
            container.registerDependency(instance, dependencyId);

            expect(() =>
                container.registerDependency(instance, dependencyId)
            ).toThrowError('ProxyDi already has dependency');
        });

        it('Can register instance with the same dependency ID', () => {
            const container = new ProxyDiContainer({
                allowRewriteDependencies: true,
            });
            const instance = new First();
            container.registerDependency(instance, dependencyId);
            container.registerDependency(instance, dependencyId);

            expect(container.isKnown(dependencyId)).is.true;
        });

        it('unknown removed instance', () => {
            const container = new ProxyDiContainer();
            const instance = new First();
            container.registerDependency(instance, dependencyId);
            container.removeDependency(dependencyId);

            expect(container.isKnown(dependencyId)).is.false;
        });

        it('by default dependency should be an object', () => {
            const container = new ProxyDiContainer();
            expect(() =>
                container.registerDependency(dependencyId, 'any value')
            ).toThrowError("Can't register as dependency");
        });

        it('but any value could be registered as instance', () => {
            const container = new ProxyDiContainer({
                allowRegisterAnything: true,
            });
            container.registerDependency('any value', dependencyId);

            expect(container.isKnown(dependencyId)).is.true;
        });

        it('known in parent', () => {
            const parent = new ProxyDiContainer();
            parent.newDependency(First, dependencyId);

            const child = parent.createChildContainer();
            expect(child.isKnown(dependencyId)).is.true;
        });
    });

    describe('resolve()', () => {
        const dependencyId = 'someDependency';

        it("Can't resolve unknown dependency", () => {
            const container = new ProxyDiContainer();

            expect(() => container.resolve(dependencyId)).toThrowError(
                `Can't resolve unknown dependency: ${dependencyId}`
            );
        });

        it('resolve class', () => {
            const container = new ProxyDiContainer();
            container.newDependency(First, dependencyId);

            expect(container.resolve(dependencyId)).is.instanceOf(First);
        });

        it('resolve instance', () => {
            const container = new ProxyDiContainer();

            container.newDependency(Second, 'second');
            const instance = new First();
            container.registerDependency(instance, 'first');

            const first = container.resolve<First>('first');

            expect(first).not.equals(instance);
            expect(first.name).equals("I'm first!");
            expect(instance[DEPENDENCY_ID]).is.equals('first');
        });

        it('resolve the same instance', () => {
            const container = new ProxyDiContainer();
            container.newDependency(First, dependencyId);

            const instance1 = container.resolve(dependencyId);
            const instance2 = container.resolve(dependencyId);

            expect(instance1).is.equals(instance2);
        });
    });

    describe('resolve() @inject', () => {
        it('should resolve dependency after class registration', () => {
            const container = new ProxyDiContainer();

            container.newDependency(First, 'first');
            container.newDependency(Second, 'second');

            const dependency1 = container.resolve<First>('first');
            const dependency2 = container.resolve<Second>('second');

            expect(dependency1.second.name).is.equals("I'm second!");
            expect(dependency2.first.name).is.equals("I'm first!");
        });

        it('should resolve dependency after instance registration', () => {
            const container = new ProxyDiContainer();

            container.newDependency(First, 'first');

            const dependency2 = new Second();
            container.registerDependency(dependency2, 'second');

            const dependency1 = container.resolve<First>('first');

            expect(dependency1.second.name).is.equals("I'm second!");
            expect(dependency2.first.name).is.equals("I'm first!");
        });

        it('external call of injectDependencies()', () => {
            const container = new ProxyDiContainer();

            container.newDependency(First, 'first');

            const second = new Second();
            expect(second.first).is.undefined;

            container.injectDependenciesTo(second);
            expect(second.first.name).is.equals("I'm first!");

            expect(container.isKnown('second')).is.false;
        });
    });

    describe('destroy', () => {
        it('should forget all instances', () => {
            const container = new ProxyDiContainer();

            container.registerDependency(new First(), 'first');
            expect(container.isKnown('first')).is.true;

            container.destroy();

            expect(container.isKnown('first')).is.false;
        });

        it('should forget all classes', () => {
            const container = new ProxyDiContainer();

            container.newDependency(First, 'first');
            expect(container.isKnown('first')).is.true;

            container.destroy();

            expect(container.isKnown('first')).is.false;
        });

        it('should forget all children', () => {
            const container = new TestableProxyDi();
            const child = container.createChildContainer();

            expect(container.getChildren()[child.id]).is.equals(child);

            container.destroy();

            expect(container.getChildren()[child.id]).is.undefined;
        });

        it('should be removed in parent', () => {
            const container = new TestableProxyDi();
            const child = container.createChildContainer();

            expect(container.getChildren()[child.id]).is.equals(child);

            child.destroy();

            expect(container.getChildren()[child.id]).is.undefined;
        });
    });

    describe('hierarchy', () => {
        it('should have parent', () => {
            const parent = new ProxyDiContainer();
            const child = parent.createChildContainer();

            expect(child.parent).is.equals(parent);
        });

        it('do not allow child with duplicated ID', () => {
            const parent = new TestableProxyDi();
            const child = parent.createChildContainer();

            expect(function () {
                parent.desreaseIdCounter();
                parent.createChildContainer();
            }).toThrowError('ProxyDi already has child with id');
        });

        it('should clear parent after destroy', () => {
            const parent = new ProxyDiContainer();
            const child = parent.createChildContainer();

            child.destroy();

            expect(child.parent).is.undefined;
        });

        it('resolve dependency from parent via child', () => {
            const parent = new ProxyDiContainer();
            parent.newDependency(First, 'first');

            const child = parent.createChildContainer();

            const dependency1 = child.resolve<First>('first');
            expect(dependency1.name).is.equals("I'm first!");
        });

        it('removeInstance() clear dependencies', () => {
            const container = new ProxyDiContainer();
            container.newDependency(First, 'first');

            const dependency2 = new Second();
            container.registerDependency(dependency2, 'second');

            expect(dependency2.first.name).equals("I'm first!");

            container.removeDependency('second');

            expect(dependency2.first).is.undefined;
        });

        it('removeInstance() removes any value', () => {
            const container = new ProxyDiContainer({
                allowRegisterAnything: true,
            });
            container.registerDependency('any value', 'literal');
            expect(container.isKnown('literal')).is.true;

            const anyValue = container.resolve('literal');

            expect(anyValue).equals('any value');

            container.removeDependency('literal');

            expect(container.isKnown('literal')).is.false;
        });

        it('resolve parent dependencies, but not vise versa', () => {
            const parent = new ProxyDiContainer();
            parent.newDependency(First, 'first');
            const dependency1Parent = parent.resolve<First>('first');
            expect(() => dependency1Parent.second.name).toThrowError(
                'Unknown dependency'
            );

            const child = parent.createChildContainer();
            child.newDependency(Second, 'second');
            const dependency1Child = child.resolve<First>('first');

            const dependency2 = child.resolve<Second>('second');

            expect(dependency2.first.name).equals("I'm first!");
            expect(dependency1Child.second.name).equals("I'm second!");
        });

        it("resolve() takes dependencies from it's container", () => {
            const parent = new ProxyDiContainer();
            parent.newDependency(Second, 'second');

            const child1 = parent.createChildContainer();
            child1.registerDependency(new First('from child #1'), 'first');

            const child2 = parent.createChildContainer();
            child2.registerDependency(new First('from child #2'), 'first');

            const secondFromChild1 = child1.resolve<Second>('second');
            const secondFromChild2 = child2.resolve<Second>('second');

            expect(secondFromChild1.first.name).equals('from child #1');
            expect(secondFromChild2.first.name).equals('from child #2');
        });
    });

    describe('resolve by class', () => {
        it('should resolve by auto injectable class', () => {
            const container = new ProxyDiContainer();
            const anyDependency =
                container.resolveAutoInjectable(AnyDependency);

            expect(anyDependency.name).equals('any dependency');
        });

        it('should be auto injectable', () => {
            const container = new ProxyDiContainer();

            expect(() => container.resolveAutoInjectable(First)).toThrowError(
                'Class is not auto injectable'
            );
        });
    });
});
