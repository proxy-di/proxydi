import { describe, it, expect } from 'vitest';
import {
    inject,
    ProxyDiContainer,
    injectable,
    resolveAll,
    middleware,
} from '../index';
import { TestableProxyDiContainer } from './TestableProxyDiContainer.mock';
import { DEPENDENCY_ID, DependencyId, PROXYDI_CONTAINER } from '../types';
import { isInjectionProxy } from '../makeInjectionProxy';
import { KindomKing } from './mock/King';
import { KindomQueen } from './mock/Queen';
import {
    MiddlewareContext,
    MiddlewareResolver,
} from '../middleware/middleware.api';

class First {
    constructor(public readonly name: string = "I'm first!") {}
    @inject() second: Second;
}

class Second {
    name = "I'm second!";
    @inject() first: First;
}

@injectable('auto')
class Auto {
    name = "I'm auto";
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

        it('known dependency in unknown without registration', () => {
            const container = new ProxyDiContainer();
            expect(container.isKnown(dependencyId)).is.false;
        });

        it('@injectable always known', () => {
            const container = new ProxyDiContainer();
            expect(container.isKnown('auto')).is.true;
        });

        it('class is known after registration', () => {
            const container = new ProxyDiContainer();
            container.register(First, dependencyId);

            expect(container.isKnown(dependencyId)).is.true;
        });

        it("Can't register class with the same dependency ID", () => {
            const container = new ProxyDiContainer();
            container.register(First, dependencyId);
            expect(() => container.register(First, dependencyId)).toThrowError(
                'ProxyDi already has dependency'
            );
        });

        it('Can register class with the same dependency ID', () => {
            const container = new ProxyDiContainer({
                allowRewriteDependencies: true,
            });
            container.register(First, dependencyId);
            container.register(First, dependencyId);

            expect(container.isKnown(dependencyId)).is.true;
        });

        it('removed class is unknown', () => {
            const container = new ProxyDiContainer();
            container.register(First, dependencyId);
            container.remove(dependencyId);

            expect(container.isKnown(dependencyId)).is.false;
        });

        it('instance is known after registration', () => {
            const container = new ProxyDiContainer();
            const instance = new First();
            container.register(instance, dependencyId);

            expect(container.isKnown(dependencyId)).is.true;
        });

        it("Can't register instance with the same dependency ID", () => {
            const container = new ProxyDiContainer();
            const instance = new First();
            container.register(instance, dependencyId);

            expect(() =>
                container.register(instance, dependencyId)
            ).toThrowError('ProxyDi already has dependency');
        });

        it('Can register instance with the same dependency ID', () => {
            const container = new ProxyDiContainer({
                allowRewriteDependencies: true,
            });
            const instance = new First();
            container.register(instance, dependencyId);
            container.register(instance, dependencyId);

            expect(container.isKnown(dependencyId)).is.true;
        });

        it('unknown removed instance', () => {
            const container = new ProxyDiContainer();
            const instance = new First();
            container.register(instance, dependencyId);
            container.remove(dependencyId);

            expect(container.isKnown(dependencyId)).is.false;
        });

        it('by default dependency should be an object', () => {
            const container = new ProxyDiContainer();
            expect(() =>
                container.register(dependencyId, 'any value')
            ).toThrowError("Can't register as dependency");
        });

        it('but any value could be registered as instance', () => {
            const container = new ProxyDiContainer({
                allowRegisterAnything: true,
            });
            container.register('any value', dependencyId);

            expect(container.isKnown(dependencyId)).is.true;
        });

        it('known in parent', () => {
            const parent = new ProxyDiContainer();
            parent.register(First, dependencyId);

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
            const instance = container.register(First, dependencyId);

            const first = container.resolve(dependencyId);
            expect(first).equals(instance);
            expect(first).is.instanceOf(First);
            expect(first[DEPENDENCY_ID]).is.equals(dependencyId);
            expect(first[PROXYDI_CONTAINER]).is.equals(container);
        });

        it('resolve instance', () => {
            const container = new ProxyDiContainer();

            container.register(Second, 'second');
            const instance = new First();
            const returnedInstance = container.register(instance, 'first');

            const first = container.resolve<First>('first');

            expect(first).equals(instance);
            expect(first).equals(returnedInstance);
            expect(first.name).equals("I'm first!");
            expect(first[DEPENDENCY_ID]).is.equals('first');
            expect(first[PROXYDI_CONTAINER]).is.equals(container);
        });

        it('resolve the same instance', () => {
            const container = new ProxyDiContainer();
            container.register(First, dependencyId);

            const instance1 = container.resolve(dependencyId);
            const instance2 = container.resolve(dependencyId);

            expect(instance1).is.equals(instance2);
        });
    });

    describe('resolveAll()', () => {
        it('throws error if instance not in container', () => {
            const second = new Second();
            expect(() => resolveAll<First>(second, 'first')).toThrowError(
                'Instance is not registered in any container'
            );
        });

        it('throws error if dependency class is auto injectable', () => {
            const container = new ProxyDiContainer();
            const first = container.register(First, 'first');

            expect(() => resolveAll(first, Second)).toThrowError(
                'Class is not @injectable'
            );
        });

        it('resolves empty array if no dependencies', () => {
            const container = new ProxyDiContainer();
            const auto = container.resolve<Auto>('auto');
            const dependencies = resolveAll(auto, 'first');

            expect(dependencies).is.empty;
        });

        it('resolves empty array from hierarchy', () => {
            const parent = new ProxyDiContainer();
            const child = parent.createChildContainer();

            const auto = child.resolve<Auto>('auto');
            const dependencies = resolveAll(auto, 'first');

            expect(dependencies).is.empty;
        });

        it('resolves dependency by @injectable', () => {
            const container = new ProxyDiContainer();
            const first = container.register(First, 'first');
            const auto = container.resolve<Auto>('auto');

            const dependencies = resolveAll(first, Auto);

            expect(dependencies.length).is.equals(1);
            expect(dependencies[0]).equals(auto);
        });

        it('resolves dependency from container itself', () => {
            const container = new ProxyDiContainer();
            const instance = container.register(First, 'first');
            const auto = container.resolve<Auto>('auto');

            const dependencies = resolveAll(auto, 'first');

            expect(dependencies.length).is.equals(1);
            expect(dependencies[0]).equals(instance);
        });

        it('resolves dependency from child', () => {
            const parent = new ProxyDiContainer();
            const child = parent.createChildContainer();

            const instance = child.register(First, 'first');
            const auto = parent.resolve<Auto>('auto');

            const dependencies = resolveAll(auto, 'first');

            expect(dependencies.length).is.equals(1);
            expect(dependencies[0]).equals(instance);
        });

        it('resolves dependencies from both', () => {
            const parent = new ProxyDiContainer();
            const child = parent.createChildContainer();

            const instance1 = parent.register(First, 'first');
            const instance2 = child.register(First, 'first');
            const auto = parent.resolve<Auto>('auto');

            const dependencies = resolveAll<First>(auto, 'first');

            expect(dependencies.length).is.equals(2);
            expect(dependencies.includes(instance1)).is.true;
            expect(dependencies.includes(instance2)).is.true;
        });
    });

    describe('resolve() @inject', () => {
        it('should resolve dependency after class registration', () => {
            const container = new ProxyDiContainer();

            container.register(First, 'first');
            container.register(Second, 'second');

            const dependency1 = container.resolve<First>('first');
            const dependency2 = container.resolve<Second>('second');

            expect(dependency1.second.name).is.equals("I'm second!");
            expect(dependency2.first.name).is.equals("I'm first!");
        });

        it('should resolve dependency after instance registration', () => {
            const container = new ProxyDiContainer();

            const dependency1 = new First();
            container.register(dependency1, 'first');

            const dependency2 = new Second();
            container.register(dependency2, 'second');

            expect(dependency1.second.name).is.equals("I'm second!");
            expect(dependency2.first.name).is.equals("I'm first!");
        });

        it('should resolve dependency after instance/class registration', () => {
            const container = new ProxyDiContainer();

            const dependency1 = new First();
            container.register(dependency1, 'first');

            container.register(Second, 'second');
            const dependency2 = container.resolve<Second>('second');

            expect(dependency1.second.name).is.equals("I'm second!");
            expect(dependency2.first.name).is.equals("I'm first!");
        });

        it('should resolve dependency after class/instance registration', () => {
            const container = new ProxyDiContainer();

            container.register(First, 'first');
            const dependency1 = container.resolve<First>('first');

            const dependency2 = new Second();
            container.register(dependency2, 'second');

            expect(dependency1.second.name).is.equals("I'm second!");
            expect(dependency2.first.name).is.equals("I'm first!");
        });

        it('external call of injectDependencies()', () => {
            const container = new ProxyDiContainer();

            container.register(First, 'first');

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

            container.register(new First(), 'first');
            expect(container.isKnown('first')).is.true;

            container.destroy();

            expect(container.isKnown('first')).is.false;
        });

        it('should forget all classes', () => {
            const container = new ProxyDiContainer();

            container.register(First, 'first');
            expect(container.isKnown('first')).is.true;

            container.destroy();

            expect(container.isKnown('first')).is.false;
        });

        it('should forget all children', () => {
            const container = new TestableProxyDiContainer();
            const child = container.createChildContainer();

            expect(container.getChildren()[child.id]).is.equals(child);

            container.destroy();

            expect(container.getChildren()[child.id]).is.undefined;
        });

        it('should be removed in parent', () => {
            const container = new TestableProxyDiContainer();
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

        it('no any children', () => {
            const parent = new ProxyDiContainer();
            expect(parent.children.length).equal(0);
        });

        it('adds child to children', () => {
            const parent = new ProxyDiContainer();
            const child = parent.createChildContainer();

            expect(parent.children.length).equal(1);
            expect(parent.children[0]).equal(child);
            expect(parent.getChild(child.id)).equal(child);
        });

        it('Can not get unknown child', () => {
            const parent = new ProxyDiContainer();
            expect(() => parent.getChild(0)).toThrowError(
                'Unknown ProxyDiContainer child'
            );
        });

        it('do not allow child with duplicated ID', () => {
            const parent = new TestableProxyDiContainer();
            parent.createChildContainer();

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
            parent.register(First, 'first');

            const child = parent.createChildContainer();

            const dependency1 = child.resolve<First>('first');
            expect(dependency1.name).is.equals("I'm first!");
        });

        it('resolve dependency from parent via child', () => {
            const parent = new ProxyDiContainer();
            parent.register(First, 'first');

            const child = parent.createChildContainer();

            const dependency1 = child.resolve<First>('first');
            expect(dependency1.name).is.equals("I'm first!");
        });

        it('removeInstance() clear dependencies', () => {
            const container = new ProxyDiContainer();
            container.register(First, 'first');

            const dependency2 = new Second();
            container.register(dependency2, 'second');

            expect(dependency2.first.name).equals("I'm first!");

            container.remove('second');

            expect(dependency2.first).is.undefined;
        });

        it('removeInstance() removes any value', () => {
            const container = new ProxyDiContainer({
                allowRegisterAnything: true,
            });
            container.register('any value', 'literal');
            expect(container.isKnown('literal')).is.true;

            const anyValue = container.resolve('literal');

            expect(anyValue).equals('any value');

            container.remove('literal');

            expect(container.isKnown('literal')).is.false;
        });

        it('resolve parent dependencies, but not vise versa', () => {
            const parent = new ProxyDiContainer();
            parent.register(First, 'first');
            const dependency1Parent = parent.resolve<First>('first');
            expect(() => dependency1Parent.second.name).toThrowError(
                'Unknown dependency'
            );

            const child = parent.createChildContainer();
            child.register(Second, 'second');
            const dependency1Child = child.resolve<First>('first');

            const dependency2 = child.resolve<Second>('second');

            expect(dependency2.first.name).equals("I'm first!");
            expect(() => dependency1Child.second.name).toThrowError(
                'Unknown dependency'
            );
        });

        it('could resolve dependencies in container context', () => {
            const parent = new ProxyDiContainer({
                resolveInContainerContext: true,
            });
            parent.register(First, 'first');
            const dependency1Parent = parent.resolve<First>('first');
            expect(() => dependency1Parent.second.name).toThrowError(
                'Unknown dependency'
            );

            const child = parent.createChildContainer();
            child.register(Second, 'second');
            const dependency1Child = child.resolve<First>('first');

            const dependency2 = child.resolve<Second>('second');

            expect(dependency2.first.name).equals("I'm first!");
            expect(dependency1Child.second.name).equals("I'm second!");
        });

        it("resolve() takes dependencies from it's container", () => {
            const parent = new ProxyDiContainer({
                resolveInContainerContext: true,
            });
            parent.register(Second, 'second');

            const child1 = parent.createChildContainer();
            child1.register(new First('from child #1'), 'first');

            const child2 = parent.createChildContainer();
            child2.register(new First('from child #2'), 'first');

            const secondFromChild1 = child1.resolve<Second>('second');
            const secondFromChild2 = child2.resolve<Second>('second');

            expect(secondFromChild1.first.name).equals('from child #1');
            expect(secondFromChild2.first.name).equals('from child #2');
        });
    });

    describe('resolve by class', () => {
        it('should resolve by auto injectable class', () => {
            const container = new ProxyDiContainer();
            const autoDependency = container.resolve(Auto);

            expect(autoDependency.name).equals("I'm auto");
        });

        it('should be auto injectable to resolve without registration', () => {
            const container = new ProxyDiContainer();

            expect(() => container.resolve(First)).toThrowError(
                "Can't resolve unknown dependency"
            );
        });

        it('resolve class without id registration', () => {
            const container = new ProxyDiContainer();
            const instance = container.register(First);

            const first = container.resolve(First);
            expect(first).equals(instance);
            expect(first).is.instanceOf(First);
            expect(first[DEPENDENCY_ID]).is.equals('First');
            expect(first[PROXYDI_CONTAINER]).is.equals(container);
        });
    });

    describe('rewritable dependencies', () => {
        it('rewrire dependencies', () => {
            const container = new ProxyDiContainer({
                allowRewriteDependencies: true,
            });
            container.register(First, 'first');
            const first1 = container.resolve<First>('first');

            expect(first1.name).equals("I'm first!");

            container.register(new First('rewrited'), 'first');
            const first2 = container.resolve<First>('first');

            expect(first2.name).equals('rewrited');
        });

        it('rewrire fields', () => {
            const container = new ProxyDiContainer({
                allowRewriteDependencies: true,
            });
            container.register(First, 'first');
            container.register(Second, 'second');

            const second = container.resolve<Second>('second');

            expect(second.first.name).equals("I'm first!");

            container.register(new First('rewrited'), 'first');
            expect(second.first.name).equals('rewrited');
        });
    });

    describe('baking', () => {
        it('be default any injection value isInjectionProxy', () => {
            const container = new ProxyDiContainer();

            container.register(First, 'first');
            container.register(Second, 'second');

            const first = container.resolve<First>('first');
            expect(isInjectionProxy(first.second)).is.true;
            expect(first.second instanceof Second).is.false;
        });

        it('after baking all injection values is instances', () => {
            const container = new ProxyDiContainer();

            container.register(First, 'first');
            container.register(Second, 'second');

            const first = container.resolve<First>('first');

            container.bakeInjections();

            expect(isInjectionProxy(first.second)).is.false;
            expect(first.second instanceof Second).is.true;
        });

        it('autobaking dependencies', () => {
            const container = new ProxyDiContainer();
            container.register(First, 'first');

            const first = container.resolve<First>('first');
            expect(isInjectionProxy(first.second)).is.true;

            container.register(Second, 'second');

            expect(first.second.name).equal("I'm second!");
            expect(isInjectionProxy(first.second)).is.false;
        });

        it("autobaking doesn't work if dependencies is rewritable", () => {
            const container = new ProxyDiContainer({
                allowRewriteDependencies: true,
            });
            container.register(First, 'first');

            const first = container.resolve<First>('first');
            expect(isInjectionProxy(first.second)).is.true;

            container.register(Second, 'second');

            expect(first.second.name).equal("I'm second!");
            expect(isInjectionProxy(first.second)).is.true;
        });

        it('baking any value', () => {
            const container = new ProxyDiContainer({
                allowRegisterAnything: true,
            });
            container.register('any value', 'literal');

            const anyValue = container.resolve('literal');
            expect(isInjectionProxy(anyValue)).is.false;
            expect(anyValue).equals('any value');

            container.bakeInjections();

            const anyValue2 = container.resolve('literal');
            expect(anyValue2).equals('any value');
            expect(isInjectionProxy(anyValue2)).is.false;
        });

        it('baking makes impossible to rewrite dependencies', () => {
            const container = new ProxyDiContainer({
                allowRewriteDependencies: true,
            });

            container.register(First, 'first');
            container.register(Second, 'second');
            container.register(new First("I'm third"), 'first');
            const first = container.resolve<First>('first');

            expect(first.name).equals("I'm third");
            expect(container.settings.allowRewriteDependencies).is.true;

            container.bakeInjections();
            expect(container.settings.allowRewriteDependencies).is.false;
            expect(() =>
                container.register(new First("I'm fourth"), 'first')
            ).toThrowError('ProxyDi already has dependency');
        });

        it('baking container also bakes children', () => {
            const container = new ProxyDiContainer({
                allowRewriteDependencies: true,
            });
            const child = container.createChildContainer();

            expect(child.settings.allowRewriteDependencies).is.true;

            container.bakeInjections();

            expect(child.settings.allowRewriteDependencies).is.false;
        });
    });

    describe('constructor injections', () => {
        it('Engagement party', () => {
            @injectable(['Fiancée'])
            class Fiancé {
                name: string = `John`;
                constructor(public readonly feancee: Fiancée) {}

                introduce = () =>
                    `I'm ${this.name} and this my fiancée, ${this.feancee.name}`;
            }

            @injectable(['Fiancé'])
            class Fiancée {
                name: string = `Mary`;
                constructor(public readonly feance: Fiancé) {}

                introduce = () =>
                    `I'm ${this.name} and this my fiancé, ${this.feance.name}`;
            }

            const container = new ProxyDiContainer();

            const john = container.resolve(Fiancé);
            const mary = container.resolve(Fiancée);

            expect(john.feancee.name).equal(`Mary`);
            expect(mary.feance.name).equal(`John`);
            expect(john.introduce()).equal(
                `I'm John and this my fiancée, Mary`
            );
            expect(mary.introduce()).equal(`I'm Mary and this my fiancé, John`);
        });

        it('Kindom from files', () => {
            const container = new ProxyDiContainer();

            const king = container.resolve(KindomKing);
            const queen = container.resolve(KindomQueen);

            expect(king.queen.name).equal(`I'm a queen`);
            expect(queen.king.name).equal(`I'm a king`);
        });
    });

    describe('2 injectable instance', () => {
        it('should resolve 2 injectable instances', () => {
            const parent = new ProxyDiContainer();
            const child = parent.createChildContainer();

            const auto1 = child.resolve(Auto);
            const auto2 = parent.resolve(Auto);

            expect(auto1).not.equals(auto2);
        });

        it('should resolve 1 injectable instances after registerInjectables()', () => {
            const parent = new ProxyDiContainer().registerInjectables();
            const child = parent.createChildContainer();

            const auto1 = child.resolve(Auto);
            const auto2 = parent.resolve(Auto);

            expect(auto1).equals(auto2);
        });

        it('should resolve 2 injectable instances after register()', () => {
            const parent = new ProxyDiContainer().registerInjectables();
            const child = parent.createChildContainer();

            child.register(Auto, 'auto');
            const auto1 = child.resolve(Auto);
            const auto2 = parent.resolve(Auto);

            expect(auto1).not.equals(auto2);
        });
    });

    describe('middleware', () => {
        @injectable()
        @middleware()
        class TestMiddleware {
            known: DependencyId[] = [];

            onRegister = (context: MiddlewareContext<any>) => {
                this.known.push(context.dependencyId);
            };

            onRemove = (context: MiddlewareContext<any>) => {
                const index = this.known.indexOf(context.dependencyId);
                if (index !== -1) {
                    this.known.splice(index, 1);
                }
            };
        }

        it('no any kno wn registered dependencies', () => {
            const container = new ProxyDiContainer();
            const middleware = container.resolve(TestMiddleware);

            expect(middleware.known.length).equals(1);
            expect(middleware.known[0]).equals('TestMiddleware');
        });

        it('should known registered dependencies', () => {
            const container = new ProxyDiContainer();
            const middleware = container.resolve(TestMiddleware);
            container.register(First, 'first');

            expect(middleware.known.length).equals(2);
            expect(middleware.known[0]).equals('TestMiddleware');
            expect(middleware.known[1]).equals('first');
        });

        it('should known registered in child dependencies', () => {
            const container = new ProxyDiContainer();
            const middleware = container.resolve(TestMiddleware);

            const child = container.createChildContainer();
            child.register(First, 'first');

            expect(middleware.known.length).equals(2);
            expect(middleware.known[0]).equals('TestMiddleware');
            expect(middleware.known[1]).equals('first');
        });

        it('should forgot removed dependencies', () => {
            const container = new ProxyDiContainer();
            const middleware = container.resolve(TestMiddleware);
            container.register(First, 'first');
            container.remove('first');

            expect(middleware.known.length).equals(1);
            expect(middleware.known[0]).equals('TestMiddleware');
        });

        it('should forgot removed dependencies in childs', () => {
            const container = new ProxyDiContainer();
            const middleware = container.resolve(TestMiddleware);

            const child = container.createChildContainer();
            child.register(First, 'first');
            child.remove('first');

            expect(middleware.known.length).equals(1);
            expect(middleware.known[0]).equals('TestMiddleware');
        });

        it('does not know registered dependencies after removing', () => {
            const container = new ProxyDiContainer();
            const middleware = container.resolve(TestMiddleware);

            container.remove('TestMiddleware');
            container.register(First, 'first');

            expect(middleware.known.length).equals(1);
            expect(middleware.known[0]).equals('TestMiddleware');
        });

        it('@middleware should decorate classes', () => {
            const fieldMiddleware = middleware as any;
            expect(() => {
                class Test {
                    @fieldMiddleware()
                    field: string;
                }
            }).toThrowError('@middleware decorator should decorate classes');
        });

        it('@middleware should throw error for the same name', () => {
            expect(() => {
                @middleware()
                class TestMiddleware {
                    field: string;
                }
            }).toThrowError('ProxyDi has already regisered middleware');
        });

        it('resolver', () => {
            @middleware()
            class Faker implements MiddlewareResolver {
                onResolve = <T>(
                    context: MiddlewareContext<T>
                ): MiddlewareContext<T> => {
                    return {
                        ...context,
                        dependency: 'fake value' as any,
                    };
                };
            }

            const container = new ProxyDiContainer();
            container.register(Faker);

            const fake1 = container.resolve(Auto);
            expect(fake1).equal('fake value');

            const fake2 = container.resolve(Faker);
            expect(fake2).equal('fake value');

            container.remove('Faker');

            const auto = container.resolve(Auto);
            expect(auto).is.instanceOf(Auto);
        });

        it('not dependency resolver', () => {
            class Faker implements MiddlewareResolver {
                onResolve = <T>(
                    context: MiddlewareContext<T>
                ): MiddlewareContext<T> => {
                    return {
                        ...context,
                        dependency: 'fake value' as any,
                    };
                };
            }

            const container = new ProxyDiContainer();
            const faker = new Faker();
            container.registerMiddleware(faker);

            const fake1 = container.resolve(Auto);
            expect(fake1).equal('fake value');

            container.removeMiddleware(faker);

            const auto = container.resolve(Auto);
            expect(auto).is.instanceOf(Auto);
        });
    });

    // describe('performance', () => {
    //     it('inections proxy', () => {
    //         const container = new ProxyDiContainer({
    //             allowRewriteDependencies: true,
    //         });

    //         container.register(First, 'first');
    //         container.register(Second, 'second');

    //         const iterations = 10000000;

    //         const first = container.resolve<First>('first');
    //         const start = Date.now();
    //         for (let i = 0; i < iterations; i++) {
    //             const a = first.second.name;
    //         }
    //         const end = Date.now();
    //         console.log(`${iterations} iterations:`, end - start, 'ms');

    //         container.bakeInjections();

    //         const start2 = Date.now();
    //         for (let i = 0; i < iterations; i++) {
    //             const a = first.second.name;
    //         }
    //         const end2 = Date.now();
    //         console.log(
    //             `${iterations} iterations after baking:`,
    //             end2 - start2,
    //             'ms'
    //         );
    //     });
    // });
});
