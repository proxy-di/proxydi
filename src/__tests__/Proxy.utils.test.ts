import { describe, it, expect } from 'vitest';
import { injectable, inject, ProxyDiContainer } from '../index';
import { INJECTIONS } from '../types';
import { isInjectionProxy, makeInjectionProxy } from '../makeInjectionProxy';
import { isDependencyProxy, makeDependencyProxy } from '../makeDependencyProxy';

const someDependencyId = 'someDependency';
const otherDependencyId = 'otherDependency';

@injectable(someDependencyId)
class SomeDependency {
    someValue = 1;

    @inject() unknown: any;
}

@injectable(otherDependencyId)
class OtherDependency {
    @inject() [someDependencyId]: SomeDependency;
}

describe('Proxy utils', () => {
    it('isProxy()', () => {
        const container = new ProxyDiContainer();
        const instance = container.resolve<any>(someDependencyId);
        const proxy = makeInjectionProxy<SomeDependency>(
            instance[INJECTIONS][0],
            instance,
            container
        );

        expect(isInjectionProxy(proxy)).is.true;
    });

    describe('makeInstanceProxy()', () => {
        @injectable('dependencyToInject')
        class DependencyToInject {
            value: string = 'injected';
        }

        class Client {
            @inject()
            dependencyToInject: DependencyToInject;

            ownValue = 'ownValue';
        }

        it('should wrap instance', () => {
            const container = new ProxyDiContainer();
            container.register(new Client(), 'client');
            const client = container.resolve<Client>('client');
            const clientWrapper = makeDependencyProxy(client);

            expect(isDependencyProxy(clientWrapper)).is.true;

            expect(clientWrapper.ownValue).equals('ownValue');

            client.ownValue = 'changed';
            expect(clientWrapper.ownValue).equals('changed');
        });
    });

    describe('makeInjectProxy()', () => {
        it('get', () => {
            const container = new ProxyDiContainer();
            const otherDependency = container.resolve<any>(otherDependencyId);
            const someDependencyProxy = makeInjectionProxy<SomeDependency>(
                otherDependency[INJECTIONS][someDependencyId],
                otherDependency,
                container
            );

            expect(someDependencyProxy.someValue).equals(1);
        });

        it('get, unknown dependency', () => {
            const container = new ProxyDiContainer();
            const someDependency = container.resolve<any>(someDependencyId);

            const proxy = makeInjectionProxy<any>(
                someDependency[INJECTIONS]['unknown'],
                someDependency,
                container
            );

            expect(() => proxy.anyValue).toThrowError(`Unknown dependency`);
        });

        it('set', () => {
            const container = new ProxyDiContainer();
            const otherDependency = container.resolve<any>(otherDependencyId);

            const proxy = makeInjectionProxy<SomeDependency>(
                otherDependency[INJECTIONS][someDependencyId],
                otherDependency,
                container
            );
            proxy.someValue = 2;

            expect(proxy.someValue).equals(2);
        });

        it('set, unknown dependency', () => {
            const container = new ProxyDiContainer();
            const someInstance = container.resolve<any>(someDependencyId);

            const unknownDependency = makeInjectionProxy<any>(
                someInstance[INJECTIONS]['unknown'],
                someInstance,
                container
            );

            expect(() => (unknownDependency.someValue = 2)).toThrowError(
                `Unknown dependency`
            );
        });

        it('has, property for known dependency', () => {
            const container = new ProxyDiContainer();
            const otherDependency = container.resolve<any>(otherDependencyId);
            const proxy = makeInjectionProxy<SomeDependency>(
                otherDependency[INJECTIONS][someDependencyId],
                otherDependency,
                container
            );

            expect('someValue' in proxy).toBe(true);
            expect('nonExisting' in proxy).toBe(false);
        });

        it('has, unknown dependency should throw error', () => {
            const container = new ProxyDiContainer();
            const someDependency = container.resolve<any>(someDependencyId);
            const proxy = makeInjectionProxy<SomeDependency>(
                someDependency[INJECTIONS]['unknown'],
                someDependency,
                container
            );

            expect(() => {
                'someValue' in proxy;
            }).toThrowError(`Unknown dependency`);
        });
    });
});
