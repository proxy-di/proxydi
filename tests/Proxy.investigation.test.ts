import { describe, expect, it } from 'vitest';
import { autoInjectableService, inject, ProxyDI } from '../src';
import { isInjectionProxy } from '../src/Proxy.utils';
import { PROXYDY_CONTAINER } from '../src/types';
import { ProxyDiContainer } from '../src/ProxyDI';

@autoInjectableService('serviceToInject')
class ServiceToInject {
    value: string = 'injected';
}

class Client {
    @inject()
    serviceToInject: ServiceToInject;

    ownValue = 'ownValue';
}

function makeInstanceWrapper(instance: any, container: ProxyDiContainer) {
    return new Proxy(instance, {
        get: function (target, prop, receiver) {
            if (target[prop]) {
                const value = target[prop];
                if (
                    isInjectionProxy(value) &&
                    value[PROXYDY_CONTAINER] !== container
                ) {
                    // TODO: Create new wrapper
                    // TODO: recreate all injection proxies for this container
                    // TODO: register instance in this container
                    // TODO: return value from this instance
                }
                return value;
            }

            return Reflect.get(target, prop, receiver);
        },
    });
}

describe('Proxy', () => {
    it('should wrap instance', () => {
        const container = new ProxyDI();
        container.registerService('client', new Client());
        const client = container.resolveDependency<Client>('client');
        const clientWrapper = makeInstanceWrapper(client, container);

        //expect(clientWrapper.serviceToInject).equals(container.id);
        expect(clientWrapper.ownValue).equals('ownValue');

        client.ownValue = 'changed';
        expect(clientWrapper.ownValue).equals('changed');
    });
});
