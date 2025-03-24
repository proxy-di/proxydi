import { ProxyDiContainer } from '../ProxyDiContainer';
import { ContainerizedDependency, DependencyId } from '../types';

export type MiddlewareContext<T extends any> = {
    container: ProxyDiContainer;
    dependencyId: DependencyId;
    dependency: T & ContainerizedDependency;
};

export interface MiddlewareResolver {
    resolveNext: <T>(context: MiddlewareContext<T>) => MiddlewareContext<T>;
}
