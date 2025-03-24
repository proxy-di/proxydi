import { ProxyDiContainer } from '../ProxyDiContainer';
import { DependencyId } from '../types';

export type MiddlewareNext = <T>(context: MiddlewareContext<T>) => T;

export type MiddlewareContext<T extends any> = {
    container: ProxyDiContainer;
    dependencyId: DependencyId;
    dependency: T;
};

export interface MiddlewareResolver {
    resolveNext: <T>(context: MiddlewareContext<T>) => T;
}
