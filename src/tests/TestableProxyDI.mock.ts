import { ProxyDI } from '../ProxyDI';
import { ProxyFactory } from '../ProxyFactory';

export class TestableProxyDI extends ProxyDI {
    getProxyFactory(): ProxyFactory {
        return (this as any).proxyFactory;
    }

    getChildren() {
        return (this as any).children;
    }

    desreaseIdCounter() {
        (ProxyDI as any).idCounter--;
    }
}
