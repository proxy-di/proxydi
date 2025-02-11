import { describe, it, expect } from 'vitest';
import { isProxy, makeProxy } from '../src/Proxy.utils';
import { injectable, inject, ProxyDI } from '../src/index';

const someServiceId = 'someService';
const otherServiceId = 'otherService';

@injectable(someServiceId)
class SomeService {
    someValue = 1;

    @inject() unknown: any;
}

@injectable(otherServiceId)
class OtherService {
    @inject() someService: SomeService;
}

describe('Proxy utils', () => {
    it('isProxy()', () => {
        const container = new ProxyDI();
        const instance = container.resolve(someServiceId);
        const proxy = makeProxy<SomeService>(someServiceId, instance);

        expect(isProxy(proxy)).is.true;
    });

    describe('makeProxy()', () => {
        it('get', () => {
            const container = new ProxyDI();
            container.registerClass(someServiceId, SomeService);
            const instance = container.resolve(someServiceId);
            const proxy = makeProxy<SomeService>(someServiceId, instance);

            expect(proxy.someValue).equals(1);
        });

        it('get, unknown service', () => {
            const container = new ProxyDI();
            const some = container.resolve(someServiceId);

            const proxy = makeProxy<any>('unknown', some);

            expect(() => proxy.anyValue).toThrowError(
                `Unknown ProxyDI-service`
            );
        });

        it('set', () => {
            const container = new ProxyDI();
            const otherService = container.resolve(otherServiceId);

            const proxy = makeProxy<SomeService>(someServiceId, otherService);
            proxy.someValue = 2;

            expect(proxy.someValue).equals(2);
        });

        it('set, unknown service', () => {
            const container = new ProxyDI();
            const someInstance = container.resolve(someServiceId);

            const unknownService = makeProxy<any>('unknown', someInstance);

            expect(() => (unknownService.someValue = 2)).toThrowError(
                `Unknown ProxyDI-service`
            );
        });

        it('has, property for known service', () => {
            const container = new ProxyDI();
            const otherService = container.resolve(otherServiceId);
            const proxy = makeProxy<SomeService>(someServiceId, otherService);

            expect('someValue' in proxy).toBe(true);
            expect('nonExisting' in proxy).toBe(false);
        });

        it('has, unknown service should throw error', () => {
            const container = new ProxyDI();
            const someService = container.resolve(someServiceId);
            const proxy = makeProxy<SomeService>('unknown', someService);

            expect(() => {
                'someValue' in proxy;
            }).toThrowError(`Unknown ProxyDI-service`);
        });
    });
});
