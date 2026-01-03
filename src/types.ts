import { ProxyDiContainer } from './ProxyDiContainer';

export type DependencyId = string | symbol;

export type DependencyClass<T> = new (...args: any[]) => T;

export type Setter = (object: unknown, value: unknown) => void;

export enum ResolveScope {
    Parent = 1 << 0, // 0b001
    Current = 1 << 1, // 0b010
    Children = 1 << 2, // 0b100
    All = Parent | Current | Children, // 0b111
}

export type SingleInjection = {
    property: string | symbol;
    dependencyId: DependencyId;
    set: Setter;
    //isAll?: false;
};

export type AllInjection = SingleInjection & {
    // property: string | symbol;
    // dependencyId: DependencyId;
    // set: Setter;
    isAll: true;
    scope: ResolveScope;
};

export type Injection = SingleInjection | AllInjection;

/**
 * Type guard to check if injection is AllInjection
 */
export function isAllInjection(
    injection: Injection
): injection is AllInjection {
    return 'isAll' in injection && injection.isAll === true;
}

export type IProxyDiContainer = {
    id: number;
    settings: Required<ContainerSettings>;

    parent?: IProxyDiContainer;

    isKnown: (dependencyId: DependencyId | DependencyClass<any>) => boolean;

    injectDependenciesTo: (dependency: any) => void;

    register: (
        dependency: any,
        dependencyId?: DependencyId | DependencyClass<any>
    ) => any;

    resolve: <T>(
        dependencyId: DependencyId | DependencyClass<any>
    ) => T & ContainerizedDependency;

    hasOwn: <T>(dependencyId: DependencyId | DependencyClass<any>) => boolean;

    createChildContainer: () => IProxyDiContainer;
    children: IProxyDiContainer[];
    getChild(id: number): IProxyDiContainer;

    remove: (dependencyId: DependencyId | ContainerizedDependency) => void;

    bakeInjections(): void;

    destroy: () => void;
};

export const INJECTIONS = Symbol('injections');

/**
 * This symbol constant defines a property name.
 * This property is present in each dependency instance that was registered in ProxyDiContainer.
 * The property stores the dependency identifier that should be used to resolve dependency from the container where it was registered.
 */
export const DEPENDENCY_ID = Symbol('DependencyId');

/**
 * This symbol constant defines a property name.
 * This property is present in each dependency instance that was registered in ProxyDiContainer.
 * The property stores a reference to the ProxyDiContainer in which the dependency was registered.
 */
export const PROXYDI_CONTAINER = Symbol('proxyDiContainer');

export const ON_CONTAINERIZED = Symbol('onContainerized');
export type OnContainerizedMethod = (container: ProxyDiContainer) => void;

export type Injections = Record<string | symbol, Injection>;
export type Dependency = {
    [INJECTIONS]: Injections;
};

/**
 * Respresent dependency instance that was registered in ProxyDi container
 */
export type ContainerizedDependency = Dependency & {
    /**
     * Unique identifier that could use to resolve this instance from container where it was registered
     */
    [DEPENDENCY_ID]: DependencyId;

    /**
     * ProxyDi container in which this instance was registered
     */
    [PROXYDI_CONTAINER]: IProxyDiContainer;
};

export type ContainerSettings = {
    allowRegisterAnything?: boolean;
    allowRewriteDependencies?: boolean;
    resolveInContainerContext?: boolean;
};

export const IS_INJECTION_PROXY = Symbol('isInjectionProxy');
export const INJECTION_OWNER = Symbol('injectionOwner');

export const IS_INSTANCE_PROXY = Symbol('isInstanceProxy');

export type InjectionProxy = {
    [IS_INJECTION_PROXY]: true;
    [INJECTION_OWNER]: ContainerizedDependency;
    [PROXYDI_CONTAINER]: IProxyDiContainer;
};
