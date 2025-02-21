export type DependencyId = string | symbol;

// TODO: Leave only one of these
export type DependencyClass<T extends unknown> = new () => T;
export type InstancedDependency<T> = new (...args: any[]) => T;
export type Instanced<T> = T extends { new (...args: any[]): any } ? never : T;

export type Setter = (object: unknown, value: unknown) => void;

export type Injection = {
    property: string | symbol;
    dependencyId: DependencyId;
    set: Setter;
};

export type IProxyDiContainer = {
    id: number;
    settings: Required<ContainerSettings>;

    isKnown: (dependencyId: DependencyId) => boolean;

    injectDependenciesTo: (dependency: any) => void;

    registerDependency: <T>(
        instance: T extends { new (...args: any[]): any } ? never : T,
        dependencyId: DependencyId
    ) => void;

    newDependency: <T>(
        dependencyClass: InstancedDependency<T>,
        dependencyId: DependencyId
    ) => void;

    resolve: <T>(serviceId: DependencyId) => T & ContainerizedDependency;

    createChildContainer: () => IProxyDiContainer;

    removeDependency: (
        serviceId: DependencyId | ContainerizedDependency
    ) => void;

    bakeInjections(): void;
    destroy: () => void;
};

export const INJECTIONS = Symbol('injections');
export const DEPENDENCY_ID = Symbol('DependencyId');

export type Injections = Record<string | symbol, Injection>;
export type Dependency = {
    [INJECTIONS]: Injections;
};

export type ContainerizedDependency = Dependency & {
    [DEPENDENCY_ID]: DependencyId;
    [PROXYDY_CONTAINER]: IProxyDiContainer;
};

export type ContainerSettings = {
    allowRegisterAnything?: boolean;
    allowRewriteDependencies?: boolean;
};

export const IS_INJECTION_PROXY = Symbol('isInjectionProxy');
export const INJECTION_OWNER = Symbol('injectionOwner');
export const PROXYDY_CONTAINER = Symbol('proxyDiContainer');
export const IS_INSTANCE_PROXY = Symbol('isInstanceProxy');

export type InjectionProxy = {
    [IS_INJECTION_PROXY]: true;
    [INJECTION_OWNER]: ContainerizedDependency;
    [PROXYDY_CONTAINER]: IProxyDiContainer;
};
