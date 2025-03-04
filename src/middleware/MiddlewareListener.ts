import { ProxyDiContainer } from '../ProxyDiContainer';
import { DependencyId } from '../types';

export interface MiddlewareListenerEvent {
    register: (
        container: ProxyDiContainer,
        dependencyId: DependencyId,
        dependency: any
    ) => void;
    remove: (container: ProxyDiContainer, dependencyId: DependencyId) => void;
}

export class MiddlewareListener {
    private listeners: {
        [K in keyof MiddlewareListenerEvent]: MiddlewareListenerEvent[K][];
    } = {
        register: [],
        remove: [],
    };
    constructor() {}

    on<K extends keyof MiddlewareListenerEvent>(
        event: K,
        listener: MiddlewareListenerEvent[K]
    ) {
        this.listeners[event].push(listener);
    }

    onRegister(
        container: ProxyDiContainer,
        dependencyId: DependencyId,
        dependency: any
    ) {
        this.listeners.register.forEach((listener) =>
            listener(container, dependencyId, dependency)
        );
    }

    onRemove(container: ProxyDiContainer, dependencyId: DependencyId) {
        this.listeners.remove.forEach((listener) =>
            listener(container, dependencyId)
        );
    }

    off<K extends keyof MiddlewareListenerEvent>(
        event: K,
        listener: MiddlewareListenerEvent[K]
    ) {
        const index = this.listeners[event].indexOf(listener);
        if (index !== -1) {
            this.listeners[event].splice(index, 1);
        }
    }
}
