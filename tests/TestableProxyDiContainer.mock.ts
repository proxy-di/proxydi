import { ProxyDiContainer } from '../src/ProxyDiContainer';

export class TestableProxyDiContainer extends ProxyDiContainer {
    getChildren() {
        return (this as any)._children;
    }

    desreaseIdCounter() {
        (ProxyDiContainer as any).idCounter--;
    }
}
