import { describe, it, expect } from 'vitest';
import { inject, ProxyDiContainer, autoInjectableService } from '../src/index';
import { TestableProxyDi } from './TestableProxyDi.mock';
import { SERVICE_ID } from '../src/types';

class FirstService {
    constructor(public readonly name: string = "I'm first!") {}
    @inject() second: SecondService;
}

class SecondService {
    name = "I'm second!";
    @inject() first: FirstService;
}

@autoInjectableService('any')
class AnyService {
    name = 'any service';
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
        const serviceId = 'known';

        it('any service in uknown without registration', () => {
            const container = new ProxyDiContainer();
            expect(container.isKnown(serviceId)).is.false;
        });

        it('@autoInjectableService always known', () => {
            const container = new ProxyDiContainer();
            expect(container.isKnown('any')).is.true;
        });

        it('class is known after resigtation', () => {
            const container = new ProxyDiContainer();
            container.createService(serviceId, FirstService);

            expect(container.isKnown(serviceId)).is.true;
        });

        it("Can't register class with the same service ID", () => {
            const container = new ProxyDiContainer();
            container.createService(serviceId, FirstService);
            expect(() =>
                container.createService(serviceId, FirstService)
            ).toThrowError('ProxyDi already has registered class');
        });

        it('Can register class with the same service ID', () => {
            const container = new ProxyDiContainer({ allowRewriteServices: true });
            container.createService(serviceId, FirstService);
            container.createService(serviceId, FirstService);

            expect(container.isKnown(serviceId)).is.true;
        });

        it('removed class is unknown', () => {
            const container = new ProxyDiContainer();
            container.createService(serviceId, FirstService);
            container.removeService(serviceId);

            expect(container.isKnown(serviceId)).is.false;
        });

        it('instance is known after registration', () => {
            const container = new ProxyDiContainer();
            const instance = new FirstService();
            container.registerService(serviceId, instance);

            expect(container.isKnown(serviceId)).is.true;
        });

        it("Can't register instance with the same service ID", () => {
            const container = new ProxyDiContainer();
            const instance = new FirstService();
            container.registerService(serviceId, instance);

            expect(() =>
                container.registerService(serviceId, instance)
            ).toThrowError('ProxyDi already has registered instance');
        });

        it('Can register instance with the same service ID', () => {
            const container = new ProxyDiContainer({ allowRewriteServices: true });
            const instance = new FirstService();
            container.registerService(serviceId, instance);
            container.registerService(serviceId, instance);

            expect(container.isKnown(serviceId)).is.true;
        });

        it('unknown removed instance', () => {
            const container = new ProxyDiContainer();
            const instance = new FirstService();
            container.registerService(serviceId, instance);
            container.removeService(serviceId);

            expect(container.isKnown(serviceId)).is.false;
        });

        it('by default instance should be an object', () => {
            const container = new ProxyDiContainer();
            expect(() =>
                container.registerService(serviceId, 'any value')
            ).toThrowError("Can't register as instance");
        });

        it('but any value could be registered as instance', () => {
            const container = new ProxyDiContainer({
                allowRegisterAnythingAsInstance: true,
            });
            container.registerService(serviceId, 'any value');

            expect(container.isKnown(serviceId)).is.true;
        });

        it('known in parent', () => {
            const parent = new ProxyDiContainer();
            parent.createService(serviceId, FirstService);

            const child = parent.createChildContainer();
            expect(child.isKnown(serviceId)).is.true;
        });
    });

    describe('resolve()', () => {
        const serviceId = 'someService';

        it("Can't resolve unknown service", () => {
            const container = new ProxyDiContainer();

            expect(() => container.resolve(serviceId)).toThrowError(
                `Can't resolve unknown ProxyDi-service: ${serviceId}`
            );
        });

        it('resolve class', () => {
            const container = new ProxyDiContainer();
            container.createService(serviceId, FirstService);

            expect(container.resolve(serviceId)).is.instanceOf(FirstService);
        });

        it('resolve instance', () => {
            const container = new ProxyDiContainer();

            container.createService('second', SecondService);
            const instance = new FirstService();
            container.registerService('first', instance);

            const first = container.resolve<FirstService>('first');

            expect(first).not.equals(instance);
            expect(first.name).equals("I'm first!");
            expect(instance[SERVICE_ID]).is.equals('first');
        });
    });

    describe('resolve() @inject', () => {
        it('should resolve dependency after class registration', () => {
            const container = new ProxyDiContainer();

            container.createService('first', FirstService);
            container.createService('second', SecondService);

            const service1 = container.resolve<FirstService>('first');
            const service2 = container.resolve<SecondService>('second');

            expect(service1.second.name).is.equals("I'm second!");
            expect(service2.first.name).is.equals("I'm first!");
        });

        it('should resolve dependency after instance registration', () => {
            const container = new ProxyDiContainer();

            container.createService('first', FirstService);

            const service2 = new SecondService();
            container.registerService('second', service2);

            const service1 = container.resolve<FirstService>('first');

            expect(service1.second.name).is.equals("I'm second!");
            expect(service2.first.name).is.equals("I'm first!");
        });

        it('external call of injectDependencies()', () => {
            const container = new ProxyDiContainer();

            container.createService('first', FirstService);

            const second = new SecondService();
            expect(second.first).is.undefined;

            container.injectDependencies(second);
            expect(second.first.name).is.equals("I'm first!");

            expect(container.isKnown('second')).is.false;
        });
    });

    describe('destroy', () => {
        it('should forget all instances', () => {
            const container = new ProxyDiContainer();

            container.registerService('first', new FirstService());
            expect(container.isKnown('first')).is.true;

            container.destroy();

            expect(container.isKnown('first')).is.false;
        });

        it('should forget all classes', () => {
            const container = new ProxyDiContainer();

            container.createService('first', FirstService);
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
            parent.createService('first', FirstService);

            const child = parent.createChildContainer();

            const service1 = child.resolve<FirstService>('first');
            expect(service1.name).is.equals("I'm first!");
        });

        it('removeInstance() clear dependencies', () => {
            const container = new ProxyDiContainer();
            container.createService('first', FirstService);

            const service2 = new SecondService();
            container.registerService('second', service2);

            expect(service2.first.name).equals("I'm first!");

            container.removeService('second');

            expect(service2.first).is.undefined;
        });

        it('removeInstance() removes any value', () => {
            const container = new ProxyDiContainer({
                allowRegisterAnythingAsInstance: true,
            });
            container.registerService('literal', 'any value');
            expect(container.isKnown('literal')).is.true;

            const anyValue = container.resolve('literal');

            expect(anyValue).equals('any value');

            container.removeService('literal');

            expect(container.isKnown('literal')).is.false;
        });

        it('resolve parent dependencies, but not vise versa', () => {
            const parent = new ProxyDiContainer();
            parent.createService('first', FirstService);
            const service1Parent = parent.resolve<FirstService>('first');
            expect(() => service1Parent.second.name).toThrowError(
                'Unknown ProxyDi-service'
            );

            const child = parent.createChildContainer();
            child.createService('second', SecondService);
            const service1Child = child.resolve<FirstService>('first');

            const service2 = child.resolve<SecondService>('second');

            expect(service2.first.name).equals("I'm first!");
            expect(service1Child.second.name).equals("I'm second!");
        });

        it("resolve() takes dependencies from it's container", () => {
            const parent = new ProxyDiContainer();
            parent.createService('second', SecondService);

            const child1 = parent.createChildContainer();
            child1.registerService('first', new FirstService('from child #1'));

            const child2 = parent.createChildContainer();
            child2.registerService('first', new FirstService('from child #2'));

            const secondFromChild1 = child1.resolve<SecondService>('second');
            const secondFromChild2 = child2.resolve<SecondService>('second');

            expect(secondFromChild1.first.name).equals('from child #1');
            expect(secondFromChild2.first.name).equals('from child #2');
        });
    });

    describe('resolve by class', () => {
        it('should resolve by auto injectable class', () => {
            const container = new ProxyDiContainer();
            const anyService = container.resolveAutoInjectable(AnyService);

            expect(anyService.name).equals('any service');
        });

        it('should be auto injectable', () => {
            const container = new ProxyDiContainer();

            expect(() =>
                container.resolveAutoInjectable(FirstService)
            ).toThrowError('Service is not auto injectable');
        });
    });
});
