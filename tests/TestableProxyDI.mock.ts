import { ProxyDI } from '../src/ProxyDI';

export class TestableProxyDI extends ProxyDI {
    getChildren() {
        return (this as any).children;
    }

    desreaseIdCounter() {
        (ProxyDI as any).idCounter--;
    }
}
