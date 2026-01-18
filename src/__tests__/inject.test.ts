import { describe, it, expect } from 'vitest';
import { inject, injectable, ProxyDiContainer, ResolveScope } from '../index';
import { Injection, INJECTIONS } from '../types';

class Empty {
    constructor(public readonly name = 'Free dependency') {}
}
class Dependent {
    @inject() freeDependency: Empty;
    @inject('freeDependency') anotherFreeDependency: Empty;
}

describe('inject', () => {
    it('should add INJECTS', () => {
        const dependencyInstance = new Dependent() as any;
        expect(dependencyInstance[INJECTIONS]).is.not.undefined;
        expect(Object.values(dependencyInstance[INJECTIONS]).length).equal(2);
    });

    it("@inject itself doesn't inject anything", () => {
        const dependencyInstance2 = new Dependent() as any;
        expect(dependencyInstance2.freeDependency).is.undefined;
        expect(dependencyInstance2.anotherFreeDependency).is.undefined;
    });

    it('Dependency ID could be taken from property name', () => {
        const depInstance = new Dependent() as any;

        const inject = Object.values(depInstance[INJECTIONS])[0] as Injection;
        expect(inject.property).equal('freeDependency');
        expect(inject.dependencyId).equal('freeDependency');
    });

    it('Service ID could be set directly', () => {
        const depInstance = new Dependent() as any;

        const inject2 = Object.values(depInstance[INJECTIONS])[1] as Injection;
        expect(inject2.property).equal('anotherFreeDependency');
        expect(inject2.dependencyId).equal('freeDependency');
    });

    it('Injected data should allow set value', () => {
        const dependent = new Dependent() as any;

        const inject = Object.values(dependent[INJECTIONS])[0] as Injection;
        inject.set(dependent, new Empty());
        expect(dependent.freeDependency).is.not.undefined;
        expect(dependent.freeDependency.name).equal('Free dependency');
        expect(dependent.freeDependency instanceof Empty).is.true;

        const inject2 = Object.values(dependent[INJECTIONS])[1] as Injection;
        inject2.set(dependent, new Empty('Another free dependency'));
        expect(dependent.anotherFreeDependency).is.not.undefined;
        expect(dependent.anotherFreeDependency.name).equal(
            'Another free dependency'
        );
        expect(dependent.anotherFreeDependency instanceof Empty).is.true;
    });

    it('should decorate fields', () => {
        expect(() => {
            const anyInject = inject as any;
            @anyInject()
            class Test {}
        }).toThrowError('@inject decorator should decorate fields');
    });

    it('should inject via injectable', () => {
        @injectable()
        class Injectable {
            name = "I'm injectable!";
        }

        class Injected {
            @inject(Injectable) injectable: Injectable;
        }

        const container = new ProxyDiContainer();
        const injected = container.register(Injected, 'injected');

        expect(injected.injectable).is.not.undefined;
        expect(injected.injectable.name).equal("I'm injectable!");
    });

    it('should inject non-injectable class via class.name as named instances', () => {
        class RegularClass {
            value = 'regular';
        }

        class Consumer {
            @inject(RegularClass) dependency: RegularClass;
        }

        const container = new ProxyDiContainer();
        container.register(new RegularClass(), 'RegularClass');
        const consumer = container.register(Consumer);

        expect(consumer.dependency).is.not.undefined;
        expect(consumer.dependency.value).equal('regular');
    });

    it('should inject non-injectable class via class.name as just instances', () => {
        class RegularClass {
            value = 'regular';
        }

        class Consumer {
            @inject(RegularClass) dependency: RegularClass;
        }

        const container = new ProxyDiContainer();
        container.register(new RegularClass());
        const consumer = container.register(Consumer);

        expect(consumer.dependency).is.not.undefined;
        expect(consumer.dependency.value).equal('regular');
    });

    it('should inject non-injectable class via class.name as classes', () => {
        class RegularClass {
            value = 'regular';
        }

        class Consumer {
            @inject(RegularClass) dependency: RegularClass;
        }

        const container = new ProxyDiContainer();
        container.register(RegularClass);
        const consumer = container.register(Consumer);

        expect(consumer.dependency).is.not.undefined;
        expect(consumer.dependency.value).equal('regular');
    });

    it('should throw error for invalid dependency class', () => {
        expect(() => {
            class Consumer {
                @inject((() => {}) as any) dependency: any;
            }
        }).toThrowError('Invalid dependency class');
    });

    it('should work with @injectable class registered with Symbol ID', () => {
        const symbolId = Symbol('symbolService');

        @injectable(symbolId)
        class SymbolService {
            value = 'symbol service';
        }

        class Consumer {
            @inject(SymbolService) service: SymbolService;
        }

        const container = new ProxyDiContainer();
        const consumer = container.register(Consumer);

        expect(consumer.service).is.not.undefined;
        expect(consumer.service.value).equal('symbol service');
    });

    describe('@inject with scope', () => {
        it('should inject from children with Children scope', () => {
            class Service {
                constructor(public name: string) {}
            }

            class Consumer {
                @inject('service', ResolveScope.Children) service: Service;
            }

            const parent = new ProxyDiContainer();
            const consumer = parent.register(Consumer);

            const child = parent.createChildContainer();
            child.register(new Service('from child'), 'service');

            expect(consumer.service.name).equal('from child');
        });

        it('should NOT inject from parent with Children scope', () => {
            class Service {
                constructor(public name: string) {}
            }

            class Consumer {
                @inject('service', ResolveScope.Children) service: Service;
            }

            const parent = new ProxyDiContainer();
            parent.register(new Service('from parent'), 'service');

            const child = parent.createChildContainer();
            const consumer = child.register(Consumer);

            expect(() => consumer.service.name).toThrowError('Unknown dependency');
        });

        it('should inject from parent with Parent scope', () => {
            class Service {
                constructor(public name: string) {}
            }

            class Consumer {
                @inject('service', ResolveScope.Parent) service: Service;
            }

            const parent = new ProxyDiContainer();
            parent.register(new Service('from parent'), 'service');

            const child = parent.createChildContainer();
            const consumer = child.register(Consumer);

            expect(consumer.service.name).equal('from parent');
        });

        it('default scope should be Current | Parent', () => {
            const instance = new Dependent() as any;
            const injection = instance[INJECTIONS]['freeDependency'] as Injection;

            expect(injection.scope).equal(ResolveScope.Current | ResolveScope.Parent);
        });
    });
});
