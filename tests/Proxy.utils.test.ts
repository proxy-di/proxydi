import { describe, it, expect } from 'vitest';
import { isInjectionProxy, makeInjectionProxy } from '../src/Proxy.utils';
import { autoInjectableService, inject, ProxyDI } from '../src/index';
import { INJECTIONS } from '../src/types';

const someServiceId = 'someService';
const otherServiceId = 'otherService';

@autoInjectableService(someServiceId)
class SomeService {
    someValue = 1;

    @inject() unknown: any;
}

@autoInjectableService(otherServiceId)
class OtherService {
    @inject() [someServiceId]: SomeService;
}

describe('Proxy utils', () => {
    it('isProxy()', () => {
        const container = new ProxyDI();
        const instance = container.resolveDependency<any>(someServiceId);
        const proxy = makeInjectionProxy<SomeService>(
            instance[INJECTIONS][0],
            instance,
            container
        );

        expect(isInjectionProxy(proxy)).is.true;
    });

    describe('makeInjectProxy()', () => {
        it('get', () => {
            const container = new ProxyDI();
            const otherService =
                container.resolveDependency<any>(otherServiceId);
            const someServiceProxy = makeInjectionProxy<SomeService>(
                otherService[INJECTIONS][0],
                otherService,
                container
            );

            expect(someServiceProxy.someValue).equals(1);
        });

        it('get, unknown service', () => {
            const container = new ProxyDI();
            const someService = container.resolveDependency<any>(someServiceId);

            const proxy = makeInjectionProxy<any>(
                someService[INJECTIONS][0],
                someService,
                container
            );

            expect(() => proxy.anyValue).toThrowError(
                `Unknown ProxyDI-service`
            );
        });

        it('set', () => {
            const container = new ProxyDI();
            const otherService =
                container.resolveDependency<any>(otherServiceId);

            const proxy = makeInjectionProxy<SomeService>(
                otherService[INJECTIONS][0],
                otherService,
                container
            );
            proxy.someValue = 2;

            expect(proxy.someValue).equals(2);
        });

        it('set, unknown service', () => {
            const container = new ProxyDI();
            const someInstance =
                container.resolveDependency<any>(someServiceId);

            const unknownService = makeInjectionProxy<any>(
                someInstance[INJECTIONS][0],
                someInstance,
                container
            );

            expect(() => (unknownService.someValue = 2)).toThrowError(
                `Unknown ProxyDI-service`
            );
        });

        it('has, property for known service', () => {
            const container = new ProxyDI();
            const otherService =
                container.resolveDependency<any>(otherServiceId);
            const proxy = makeInjectionProxy<SomeService>(
                otherService[INJECTIONS][0],
                otherService,
                container
            );

            expect('someValue' in proxy).toBe(true);
            expect('nonExisting' in proxy).toBe(false);
        });

        it('has, unknown service should throw error', () => {
            const container = new ProxyDI();
            const someService = container.resolveDependency<any>(someServiceId);
            const proxy = makeInjectionProxy<SomeService>(
                someService[INJECTIONS][0],
                someService,
                container
            );

            expect(() => {
                'someValue' in proxy;
            }).toThrowError(`Unknown ProxyDI-service`);
        });
    });
});
