import { describe, it, expect } from 'vitest';
import { inject, ProxyDI } from '../index';
import { TestableProxyDI } from './TestableProxyDI.mock';
import { PROXYDI, PROXYDI_ID } from '../ProxyDI';
import { isProxy } from '../ProxyFactory';

class FirstService {
    name = "I'm first!";
    @inject() second: SecondService;
}

class SecondService {
    name = "I'm second!";
    @inject() first: FirstService;
}

describe('ProxyDI', () => {
    describe('id', () => {
        it('has some numeric id', () => {
            const container = new ProxyDI();
            expect(container.id).is.not.NaN;
        });

        it('different containers has different id', () => {
            const container1 = new ProxyDI();
            const container2 = new ProxyDI();
            const container3 = container1.createChildContainer();
            expect(container1.id).is.not.equals(container2.id);
            expect(container1.id).is.not.equals(container3.id);
        });
    });

    describe('isKnown()', () => {
        const serviceId = 'known';
        it('unknown service', () => {
            const container = new ProxyDI();
            expect(container.isKnown(serviceId)).is.false;
        });

        it('known class', () => {
            const container = new ProxyDI();
            container.registerClass(serviceId, FirstService);

            expect(container.isKnown(serviceId)).is.true;
        });

        it("Can't register class with the same service ID", () => {
            const container = new ProxyDI();
            container.registerClass(serviceId, FirstService);
            expect(() =>
                container.registerClass(serviceId, FirstService)
            ).toThrowError('ProxyDI already has registered class');
        });

        it('Can register class with the same service ID', () => {
            const container = new ProxyDI({ allowRewriteClasses: true });
            container.registerClass(serviceId, FirstService);
            container.registerClass(serviceId, FirstService);

            expect(container.isKnown(serviceId)).is.true;
        });

        it('unknown removed class', () => {
            const container = new ProxyDI();
            container.registerClass(serviceId, FirstService);
            container.removeClass(serviceId);

            expect(container.isKnown(serviceId)).is.false;
        });

        it('known instance', () => {
            const container = new ProxyDI();
            const instance = new FirstService();
            container.registerInstance(serviceId, instance);

            expect(container.isKnown(serviceId)).is.true;
        });

        it("Can't register instance with the same service ID", () => {
            const container = new ProxyDI();
            const instance = new FirstService();
            container.registerInstance(serviceId, instance);

            expect(() =>
                container.registerInstance(serviceId, instance)
            ).toThrowError('ProxyDI already has registered instance');
        });

        it('Can register instance with the same service ID', () => {
            const container = new ProxyDI({ allowRewriteInstances: true });
            const instance = new FirstService();
            container.registerInstance(serviceId, instance);
            container.registerInstance(serviceId, instance);

            expect(container.isKnown(serviceId)).is.true;
        });

        it('unknown remove instance', () => {
            const container = new ProxyDI();
            const instance = new FirstService();
            container.registerInstance(serviceId, instance);
            container.removeInstance(serviceId);

            expect(container.isKnown(serviceId)).is.false;
        });

        it('known any as instance', () => {
            const container = new ProxyDI();
            container.registerInstance(serviceId, 'some value');

            expect(container.isKnown(serviceId)).is.true;
        });
    });

    describe('resolve()', () => {
        const serviceId = 'someService';

        it("Can't resolve unknown service", () => {
            const container = new ProxyDI();

            expect(() => container.resolve(serviceId)).toThrowError(
                `Can't resolve unknown ProxyDI-service: ${serviceId}`
            );
        });

        it('resolve class', () => {
            const container = new ProxyDI();
            container.registerClass(serviceId, FirstService);

            expect(container.resolve(serviceId)).is.instanceOf(FirstService);
        });

        it('resolve instance', () => {
            const container = new ProxyDI();
            const instance = new FirstService();
            container.registerInstance(serviceId, instance);

            expect(container.resolve(serviceId)).equal(instance);
        });

        it('resolve any as instance', () => {
            const container = new ProxyDI();
            container.registerInstance(serviceId, 'some value');

            expect(container.resolve(serviceId)).equal('some value');
        });
    });

    describe('resolve() @inject', () => {
        it('should resolve dependency after class registration', () => {
            const container = new ProxyDI();

            container.registerClass('first', FirstService);
            container.registerClass('second', SecondService);

            const service1 = container.resolve<FirstService>('first');
            const service2 = container.resolve<SecondService>('second');

            expect(service1.second.name).is.equals("I'm second!");
            expect(service2.first.name).is.equals("I'm first!");
        });

        it('should resolve dependency after instance registration', () => {
            const container = new ProxyDI();

            container.registerClass('first', FirstService);

            const service2 = new SecondService();
            container.registerInstance('second', service2);

            const service1 = container.resolve<FirstService>('first');

            expect(service1.second.name).is.equals("I'm second!");
            expect(service2.first.name).is.equals("I'm first!");
        });

        it('external call of injectDependencies()', () => {
            const container = new ProxyDI();

            container.registerClass('first', FirstService);

            const second = new SecondService();
            expect(second.first).is.undefined;

            container.injectDependencies(second);
            expect(second.first.name).is.equals("I'm first!");

            expect(container.isKnown('second')).is.false;

            expect(container).equals(second[PROXYDI]);
        });
    });

    describe('destroy', () => {
        it('should forget all instances', () => {
            const container = new ProxyDI();

            container.registerInstance('first', new FirstService());
            expect(container.isKnown('first')).is.true;

            container.destroy();

            expect(container.isKnown('first')).is.false;
        });

        it('should forget all classes', () => {
            const container = new ProxyDI();

            container.registerClass('first', FirstService);
            expect(container.isKnown('first')).is.true;

            container.destroy();

            expect(container.isKnown('first')).is.false;
        });

        it('should forget all children', () => {
            const container = new TestableProxyDI();
            const child = container.createChildContainer();

            expect(container.getChildren()[child.id]).is.equals(child);

            container.destroy();

            expect(container.getChildren()[child.id]).is.undefined;
        });

        it('should be removed in parent', () => {
            const container = new TestableProxyDI();
            const child = container.createChildContainer();

            expect(container.getChildren()[child.id]).is.equals(child);

            child.destroy();

            expect(container.getChildren()[child.id]).is.undefined;
        });
    });

    describe('children', () => {
        it('should have parent', () => {
            const parent = new ProxyDI();
            const child = parent.createChildContainer();

            expect(child.parent).is.equals(parent);
        });

        it('do not allow child with duplicated ID', () => {
            const parent = new TestableProxyDI();
            const child = parent.createChildContainer();

            expect(function () {
                parent.desreaseIdCounter();
                parent.createChildContainer();
            }).toThrowError('ProxyDI already has child with id');
        });

        it('should clear parent after destroy', () => {
            const parent = new ProxyDI();
            const child = parent.createChildContainer();

            child.destroy();

            expect(child.parent).is.undefined;
        });

        it('resolve parent dependencies, but not vise versa', () => {
            const parent = new ProxyDI();
            parent.registerClass('first', FirstService);
            const service1 = parent.resolve<FirstService>('first');

            const child = parent.createChildContainer();
            child.registerClass('second', SecondService);
            const service2 = child.resolve<SecondService>('second');

            expect(service2.first).equals(service1);
            expect(isProxy(service1.second)).is.true;
            expect(() => service1.second.name).toThrowError(
                'Unknown ProxyDI-service: second'
            );
        });

        it('removeInstance() clear dependencies and container', () => {
            const container = new ProxyDI();
            container.registerClass('first', FirstService);
            container.registerClass('second', SecondService);

            const service2 = container.resolve<SecondService>('second');

            expect(service2.first.name).equals("I'm first!");
            expect(service2[PROXYDI]).equals(container);

            container.removeInstance(service2);

            expect(service2.first).is.undefined;
            expect(service2[PROXYDI]).is.undefined;
        });
    });
});
