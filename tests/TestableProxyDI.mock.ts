import { ProxyDiContainer } from '../src/ProxyDiContainer';

export class TestableProxyDi extends ProxyDiContainer {
    getChildren() {
        return (this as any).children;
    }

    desreaseIdCounter() {
        (ProxyDiContainer as any).idCounter--;
    }
}
