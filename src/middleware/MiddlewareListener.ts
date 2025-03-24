import { ProxyDiContainer } from '../ProxyDiContainer';
import { DependencyId } from '../types';

export interface MiddlewareListenerEvent {
    register: (
        container: ProxyDiContainer,
        dependencyId: DependencyId,
        dependency: any
    ) => void;
    remove: (
        container: ProxyDiContainer,
        dependencyId: DependencyId,
        dependency: any
    ) => void;
}

/**
 * Describe the middleware that able to listen to the registering of a dependency in containers hierarchy
 */
export interface MiddlewareRegistrator {
    onRegister(
        container: ProxyDiContainer,
        dependencyId: DependencyId,
        dependency: any
    ): void;
}

/**
 * Describe the middleware that able to listen to the removing of a dependency in containers hierarchy
 */
export interface MiddlewareRemover {
    onRemove(
        container: ProxyDiContainer,
        dependencyId: DependencyId,
        dependency: any
    ): void;
}

export class MiddlewareListener {
    private listeners: {
        [K in keyof MiddlewareListenerEvent]: MiddlewareListenerEvent[K][];
    } = {
        register: [],

        remove: [],
    };

    constructor(private parent?: MiddlewareListener) {}

    add(middleware: any) {
        if (isRegistrator(middleware)) {
            middleware.onRegister && this.on('register', middleware.onRegister);
        }

        if (isRemover(middleware)) {
            middleware.onRemove && this.on('remove', middleware.onRemove);
        }
    }

    remove(middleware: any) {
        if (isRegistrator(middleware)) {
            middleware.onRegister &&
                this.off('register', middleware.onRegister);
        }

        if (isRemover(middleware)) {
            middleware.onRemove && this.off('remove', middleware.onRemove);
        }
    }

    private on<K extends keyof MiddlewareListenerEvent>(
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

        this.parent?.onRegister(container, dependencyId, dependency);
    }

    onRemove(
        container: ProxyDiContainer,
        dependencyId: DependencyId,
        dependency: any
    ) {
        this.listeners.remove.forEach((listener) =>
            listener(container, dependencyId, dependency)
        );
        this.parent?.onRemove(container, dependencyId, dependency);
    }

    private off<K extends keyof MiddlewareListenerEvent>(
        event: K,
        listener: MiddlewareListenerEvent[K]
    ) {
        const index = this.listeners[event].indexOf(listener);
        if (index !== -1) {
            this.listeners[event].splice(index, 1);
        }
    }
}

function isRegistrator(
    middleware: any | MiddlewareRegistrator
): middleware is MiddlewareRegistrator {
    return middleware.onRegister;
}

function isRemover(
    middleware: any | MiddlewareRemover
): middleware is MiddlewareRemover {
    return middleware.onRemove;
}
