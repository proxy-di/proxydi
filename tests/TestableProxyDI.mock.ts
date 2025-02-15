import { ProxyDiContainer } from '../src/ProxyDI';

export class TestableProxyDI extends ProxyDiContainer {
    getChildren() {
        return (this as any).children;
    }

    desreaseIdCounter() {
        (ProxyDiContainer as any).idCounter--;
    }
}
