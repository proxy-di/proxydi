import { ProxyDiContainer } from '../ProxyDiContainer';
import { DependencyId, ContainerizedDependency } from '../types';

export type MiddlewareContext<T extends any> = {
    container: ProxyDiContainer;
    dependencyId: DependencyId;
    dependency: T & ContainerizedDependency;
};

export interface MiddlewareEvent {
    register: <T>(context: MiddlewareContext<T>) => void;
    remove: <T>(context: MiddlewareContext<T>) => void;
    resolve: <T>(context: MiddlewareContext<T>) => MiddlewareContext<T>;
}

export interface MiddlewareResolver {
    onResolve: <T>(context: MiddlewareContext<T>) => MiddlewareContext<T>;
}

/**
 * Describe the middleware that able to listen to the registering of a dependency in containers hierarchy
 */

export interface MiddlewareRegistrator {
    onRegister<T>(context: MiddlewareContext<T>): void;
}
/**
 * Describe the middleware that able to listen to the removing of a dependency in containers hierarchy
 */

export interface MiddlewareRemover {
    onRemove<T>(context: MiddlewareContext<T>): void;
}
