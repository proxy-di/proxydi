import { describe, it, expect } from 'vitest';
import { inject, ProxyDI, isProxy} from '../index';

class FirstService {
    name = "I'm first!";
    @inject() second: SecondService;
}

class SecondService {
    name = "I'm second!";
    @inject() first: FirstService;
}

describe('ProxyDI', () => {
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
        it('should resolve dependency', () => {
            const container = new ProxyDI();

            container.registerClass('first', FirstService);
            container.registerClass('second', SecondService);

            const service1 = container.resolve<FirstService>('first');
            const service2 = container.resolve<SecondService>('second');

            expect(isProxy(service1.second)).is.true;
            expect(service1.second).is.not.equals(service2);
            expect(service1.second.name).is.equals("I'm second!");

            expect(isProxy(service2.first)).is.false;
            expect(service2.first).is.equals(service1);
            expect(service2.first.name).is.equals("I'm first!");
        });
    });
});
