import { ProxyDiContainer } from '../src/ProxyDiContainer';

export class TestableProxyDiContainer extends ProxyDiContainer {
    getChildren() {
        return (this as any).children;
    }

    desreaseIdCounter() {
        (ProxyDiContainer as any).idCounter--;
    }
}
