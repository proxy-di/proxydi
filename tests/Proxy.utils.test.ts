import { describe, it, expect } from 'vitest';
import { isProxy } from '../src/Proxy.utils';
import { TestableProxyDI } from './TestableProxyDI.mock';

class SomeClass {
    someValue = 1;
}

describe('ProxyFactory', () => {
    describe('Proxy implementation', () => {
        const serviceId = 'someClass';

        it('isProxy()', () => {
            const container = new TestableProxyDI();
            container.registerClass(serviceId, SomeClass);
            const factory = container.getProxyFactory();
            const proxy = factory.makeProxy<SomeClass>(serviceId);

            expect(isProxy(proxy)).is.true;
        });

        it('get', () => {
            const container = new TestableProxyDI();
            container.registerClass(serviceId, SomeClass);
            const factory = container.getProxyFactory();
            const proxy = factory.makeProxy<SomeClass>(serviceId);

            expect(proxy.someValue).equals(1);
        });

        it('get, unknown service', () => {
            const container = new TestableProxyDI();
            const factory = container.getProxyFactory();
            const proxy = factory.makeProxy<SomeClass>(serviceId);

            expect(() => proxy.someValue).toThrowError(
                `Unknown ProxyDI-service: ${serviceId}`
            );
        });

        it('set', () => {
            const container = new TestableProxyDI();
            container.registerClass(serviceId, SomeClass);
            const factory = container.getProxyFactory();
            const proxy = factory.makeProxy<SomeClass>(serviceId);
            proxy.someValue = 2;

            expect(proxy.someValue).equals(2);
        });

        it('set, unknown service', () => {
            const container = new TestableProxyDI();
            const factory = container.getProxyFactory();
            const proxy = factory.makeProxy<SomeClass>(serviceId);

            expect(() => (proxy.someValue = 2)).toThrowError(
                `Unknown ProxyDI-service: ${serviceId}`
            );
        });

        it('has, property for known service', () => {
            const container = new TestableProxyDI();
            container.registerClass(serviceId, SomeClass);
            const factory = container.getProxyFactory();
            const proxy = factory.makeProxy<SomeClass>(serviceId);

            expect('someValue' in proxy).toBe(true);
            expect('nonExisting' in proxy).toBe(false);
        });

        it('has, unknown service should throw error', () => {
            const container = new TestableProxyDI();
            const factory = container.getProxyFactory();
            const proxy = factory.makeProxy<SomeClass>(serviceId);

            expect(() => {
                'someValue' in proxy;
            }).toThrowError(`Unknown ProxyDI-service: ${serviceId}`);
        });
    });
});
