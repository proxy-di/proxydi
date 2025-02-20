import { describe, it, expect } from 'vitest';
import {
    isInjectionProxy,
    isInstanceProxy,
    makeInjectionProxy,
    makeDependencyProxy,
} from '../src/Proxy.utils';
import { autoInjectable, inject, ProxyDiContainer } from '../src/index';
import { INJECTIONS } from '../src/types';

const someServiceId = 'someService';
const otherServiceId = 'otherService';

@autoInjectable(someServiceId)
class SomeService {
    someValue = 1;

    @inject() unknown: any;
}

@autoInjectable(otherServiceId)
class OtherService {
    @inject() [someServiceId]: SomeService;
}

describe('Proxy utils', () => {
    it('isProxy()', () => {
        const container = new ProxyDiContainer();
        const instance = container.resolve<any>(someServiceId);
        const proxy = makeInjectionProxy<SomeService>(
            instance[INJECTIONS][0],
            instance,
            container
        );

        expect(isInjectionProxy(proxy)).is.true;
    });

    describe('makeInstanceProxy()', () => {
        @autoInjectable('serviceToInject')
        class ServiceToInject {
            value: string = 'injected';
        }

        class Client {
            @inject()
            serviceToInject: ServiceToInject;

            ownValue = 'ownValue';
        }

        it('should wrap instance', () => {
            const container = new ProxyDiContainer();
            container.registerDependency(new Client(), 'client');
            const client = container.resolve<Client>('client');
            const clientWrapper = makeDependencyProxy(client);

            expect(isInstanceProxy(clientWrapper)).is.true;

            expect(clientWrapper.ownValue).equals('ownValue');

            client.ownValue = 'changed';
            expect(clientWrapper.ownValue).equals('changed');
        });
    });

    describe('makeInjectProxy()', () => {
        it('get', () => {
            const container = new ProxyDiContainer();
            const otherService = container.resolve<any>(otherServiceId);
            const someServiceProxy = makeInjectionProxy<SomeService>(
                otherService[INJECTIONS][someServiceId],
                otherService,
                container
            );

            expect(someServiceProxy.someValue).equals(1);
        });

        it('get, unknown service', () => {
            const container = new ProxyDiContainer();
            const someService = container.resolve<any>(someServiceId);

            const proxy = makeInjectionProxy<any>(
                someService[INJECTIONS]['unknown'],
                someService,
                container
            );

            expect(() => proxy.anyValue).toThrowError(`Unknown dependency`);
        });

        it('set', () => {
            const container = new ProxyDiContainer();
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
            const container = new ProxyDiContainer();
            const someInstance = container.resolve<any>(someServiceId);

            const unknownService = makeInjectionProxy<any>(
                someInstance[INJECTIONS]['unknown'],
                someInstance,
                container
            );

            expect(() => (unknownService.someValue = 2)).toThrowError(
                `Unknown dependency`
            );
        });

        it('has, property for known service', () => {
            const container = new ProxyDiContainer();
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
            const container = new ProxyDiContainer();
            const someService = container.resolve<any>(someServiceId);
            const proxy = makeInjectionProxy<SomeService>(
                someService[INJECTIONS]['unknown'],
                someService,
                container
            );

            expect(() => {
                'someValue' in proxy;
            }).toThrowError(`Unknown dependency`);
        });
    });
});
