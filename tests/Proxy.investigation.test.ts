import { describe, expect, it } from 'vitest';
import { autoInjectableService, inject, ProxyDI } from '../src';
import { isInjectionProxy, makeInstanceProxy } from '../src/Proxy.utils';
import { IS_INSTANCE_PROXY, PROXYDY_CONTAINER } from '../src/types';
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

describe('Proxy', () => {
    it('should wrap instance', () => {
        const container = new ProxyDI();
        container.registerService('client', new Client());
        const client = container.resolve<Client>('client');
        const clientWrapper = makeInstanceProxy(client, container);

        //expect(clientWrapper.serviceToInject).equals(container.id);
        expect(clientWrapper.ownValue).equals('ownValue');

        client.ownValue = 'changed';
        expect(clientWrapper.ownValue).equals('changed');
    });
});
