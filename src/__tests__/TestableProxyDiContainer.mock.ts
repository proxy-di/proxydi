import { ProxyDiContainer } from '../ProxyDiContainer';

export class TestableProxyDiContainer extends ProxyDiContainer {
    getChildren() {
        return (this as any)._children;
    }

    desreaseIdCounter() {
        (ProxyDiContainer as any).idCounter--;
    }
}
