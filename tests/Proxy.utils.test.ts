import { describe, it, expect } from 'vitest';
import {
    isInjectionProxy,
    isInstanceProxy,
    makeInjectionProxy,
    makeInstanceProxy,
} from '../src/Proxy.utils';
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
        const instance = container.resolve<any>(someServiceId);
        const proxy = makeInjectionProxy<SomeService>(
            instance[INJECTIONS][0],
            instance,
            container
        );

        expect(isInjectionProxy(proxy)).is.true;
    });

    describe('makeInstanceProxy()', () => {
        @autoInjectableService('serviceToInject')
        class ServiceToInject {
            value: string = 'injected';
        }

        class Client {
            @inject()
            serviceToInject: ServiceToInject;

            ownValue = 'ownValue';
        }

        it('should wrap instance', () => {
            const container = new ProxyDI();
            container.registerService('client', new Client());
            const client = container.resolve<Client>('client');
            const clientWrapper = makeInstanceProxy(client);

            expect(isInstanceProxy(clientWrapper)).is.true;

            expect(clientWrapper.ownValue).equals('ownValue');

            client.ownValue = 'changed';
            expect(clientWrapper.ownValue).equals('changed');
        });
    });

    describe('makeInjectProxy()', () => {
        it('get', () => {
            const container = new ProxyDI();
            const otherService = container.resolve<any>(otherServiceId);
            const someServiceProxy = makeInjectionProxy<SomeService>(
                otherService[INJECTIONS][someServiceId],
                otherService,
                container
            );

            expect(someServiceProxy.someValue).equals(1);
        });

        it('get, unknown service', () => {
            const container = new ProxyDI();
            const someService = container.resolve<any>(someServiceId);

            const proxy = makeInjectionProxy<any>(
                someService[INJECTIONS]['unknown'],
                someService,
                container
            );

            expect(() => proxy.anyValue).toThrowError(
                `Unknown ProxyDI-service`
            );
        });

        it('set', () => {
            const container = new ProxyDI();
            const otherService = container.resolve<any>(otherServiceId);

            const proxy = makeInjectionProxy<SomeService>(
                otherService[INJECTIONS][someServiceId],
                otherService,
                container
            );
            proxy.someValue = 2;

            expect(proxy.someValue).equals(2);
        });

        it('set, unknown service', () => {
            const container = new ProxyDI();
            const someInstance = container.resolve<any>(someServiceId);

            const unknownService = makeInjectionProxy<any>(
                someInstance[INJECTIONS]['unknown'],
                someInstance,
                container
            );

            expect(() => (unknownService.someValue = 2)).toThrowError(
                `Unknown ProxyDI-service`
            );
        });

        it('has, property for known service', () => {
            const container = new ProxyDI();
            const otherService = container.resolve<any>(otherServiceId);
            const proxy = makeInjectionProxy<SomeService>(
                otherService[INJECTIONS][someServiceId],
                otherService,
                container
            );

            expect('someValue' in proxy).toBe(true);
            expect('nonExisting' in proxy).toBe(false);
        });

        it('has, unknown service should throw error', () => {
            const container = new ProxyDI();
            const someService = container.resolve<any>(someServiceId);
            const proxy = makeInjectionProxy<SomeService>(
                someService[INJECTIONS]['unknown'],
                someService,
                container
            );

            expect(() => {
                'someValue' in proxy;
            }).toThrowError(`Unknown ProxyDI-service`);
        });
    });
});
