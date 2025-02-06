import { describe, it, expect } from 'vitest';
import { inject, ProxyDI } from '../index';
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

        it('known instance', () => {
            const container = new ProxyDI();
            const instance = new FirstService();
            container.registerInstance(serviceId, instance);

            expect(container.isKnown(serviceId)).is.true;
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
    });
});
