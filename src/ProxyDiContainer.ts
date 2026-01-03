import {
    INJECTIONS,
    DEPENDENCY_ID,
    IProxyDiContainer as IProxyDiContainer,
    ContainerizedDependency as ContainerizedDependency,
    DependencyClass,
    PROXYDI_CONTAINER,
    Injections,
    ON_CONTAINERIZED,
    Injection,
    isAllInjection,
} from './types';
import { findInjectableId, injectableClasses } from './injectable.decorator';
import { ContainerSettings as ContainerSettings, DependencyId } from './types';
import { DEFAULT_SETTINGS } from './presets';
import { makeInjectionProxy } from './makeInjectionProxy';
import { makeInjectAllProxy } from './makeInjectAllProxy';
import { makeDependencyProxy } from './makeDependencyProxy';
import { middlewaresClasses } from './middleware/middleware.decorator';
import { MiddlewareManager } from './middleware/MiddlewaresManager';
import {
    MiddlewareContext,
    MiddlewareRegistrator,
    MiddlewareRemover,
    MiddlewareResolver,
} from './middleware/middleware.api';

/**
 * A dependency injection container
 */
export class ProxyDiContainer implements IProxyDiContainer {
    /**
     * Static counter used to assign unique IDs to containers.
     */
    private static idCounter = 0;

    /**
     * Just unique number identifier for this container, nothing more
     */
    public readonly id: number;

    /**
     * Optional parent container from which this container can inherit dependencies.
     */
    public readonly parent?: ProxyDiContainer;

    private _children: Record<number, ProxyDiContainer> = {};

    /**
     * Holds dependency instances registered particular in this container.
     */
    private dependencies: Record<DependencyId, ContainerizedDependency> = {};

    /**
     * Holds proxies for dependencies registered in parent containers to provide for it dependencies from this container
     */
    private inContextProxies: Record<DependencyId, ContainerizedDependency> =
        {};

    /**
     * Settings that control the behavior of the container and it's children
     */
    public readonly settings: Required<ContainerSettings>;

    private middlewareManager: MiddlewareManager;

    /**
     * Creates a new instance of ProxyDiContainer.
     * @param settings Optional container settings to override defaults.
     * @param parent Optional parent container.
     */
    constructor(settings?: ContainerSettings, parent?: ProxyDiContainer) {
        this.id = ProxyDiContainer.idCounter++;

        this.middlewareManager = new MiddlewareManager(
            parent?.middlewareManager
        );

        if (parent) {
            this.parent = parent;
            this.parent.addChild(this);
        }

        this.settings = { ...DEFAULT_SETTINGS, ...settings };
    }

    registerMiddleware(
        middleware:
            | MiddlewareRegistrator<any>
            | MiddlewareRemover<any>
            | MiddlewareResolver<any>
    ) {
        this.middlewareManager.add(middleware);
    }

    removeMiddleware(
        middleware:
            | MiddlewareRegistrator<any>
            | MiddlewareRemover<any>
            | MiddlewareResolver<any>
    ) {
        this.middlewareManager.remove(middleware);
    }

    /**
     * Registers a dependency in the container. Could register eacher class or instance.
     * In case of class, it will be instantiated without any parameters.
     *
     * @param dependency The dependency instance or dependency class.
     * @param dependencyId The unique identifier for the dependency in this container. Can be a string, symbol, or class constructor (which will be normalized to class name).
     * @throws Error if dependency is already registered and rewriting is not allowed or if invalid dependency (not object) is provided and this it now allowed.
     * @returns Dependency instance, registered in container
     */
    register<T>(
        DependencyClass: DependencyClass<T>,
        dependencyId?: DependencyId | DependencyClass<any>
    ): T & ContainerizedDependency;
    register<T>(
        dependency: T extends new (...args: any[]) => any ? never : T,
        dependencyId?: DependencyId | DependencyClass<any>
    ): T & ContainerizedDependency;
    register(
        dependency: any,
        dependecyId?: DependencyId | DependencyClass<any>
    ): any {
        let id: DependencyId;
        if (dependecyId) {
            id = this.normalizeDependencyId(dependecyId);
        } else if (typeof dependency === 'function') {
            try {
                id = findInjectableId(dependency);
            } catch {
                id = dependency.name;
            }
        } else if (
            dependency?.constructor?.name &&
            dependency.constructor.name !== 'Object'
        ) {
            id = dependency.constructor.name;
        } else {
            throw new Error(
                'dependencyId is required when registering plain objects or literals'
            );
        }

        if (this.dependencies[id]) {
            if (!this.settings.allowRewriteDependencies) {
                throw new Error(
                    `ProxyDi already has dependency for ${String(id)}`
                );
            }
        }

        let instance: any;
        const isClass = typeof dependency === 'function';

        if (isClass) {
            instance = new dependency();
        } else {
            instance = dependency;
        }

        const isObject = typeof instance === 'object';
        if (!isObject && !this.settings.allowRegisterAnything) {
            throw new Error(
                `Can't register as dependency (allowRegisterAnything is off for this contatiner): ${instance}`
            );
        }

        if (isObject) {
            instance[PROXYDI_CONTAINER] = this;
            instance[DEPENDENCY_ID] = id;
            instance[ON_CONTAINERIZED] && instance[ON_CONTAINERIZED](this);
        }

        this.injectDependenciesTo(instance);
        this.dependencies[id] = instance;

        const constructorName = instance.constructor?.name;
        if (constructorName && middlewaresClasses[constructorName]) {
            this.middlewareManager.add(instance);
        }

        let context: MiddlewareContext<any> = {
            container: this,
            dependencyId: id,
            dependency: instance,
        };

        this.middlewareManager.onRegister(context);

        return instance;
    }

    /**
     * Checks if a dependency with the given ID is known to the container or its ancestors which means that it can be resolved by this container
     * @param dependencyId The identifier of the dependency. Can be a string, symbol, or class constructor (which will be normalized to class name).
     * @returns True if the dependency is known, false otherwise.
     */
    isKnown(dependencyId: DependencyId | DependencyClass<any>): boolean {
        const id = this.normalizeDependencyId(dependencyId);
        return !!(
            this.inContextProxies[id] ||
            this.dependencies[id] ||
            (this.parent && this.parent.isKnown(id)) ||
            injectableClasses[id]
        );
    }

    /**
     * Checks if a dependency with the given ID exists in this container only (does not check parents)
     * @param dependencyId The identifier of the dependency. Can be a string, symbol, or class constructor (which will be normalized to class name).
     * @returns True if the dependency exists in this container, false otherwise.
     */
    hasOwn(dependencyId: DependencyId | DependencyClass<any>): boolean {
        const id = this.normalizeDependencyId(dependencyId);
        return !!(this.inContextProxies[id] || this.dependencies[id]);
    }

    /**
     * Resolves a dependency either by its dependency ID or through a class constructor for auto-injectable classes.
     * @param param The dependency ID or class constructor.
     * @returns The resolved dependency instance with container metadata.
     * @throws Error if the dependency cannot be found or is not auto injectable.
     */
    resolve<T>(dependencyId: DependencyId): T & ContainerizedDependency;
    resolve<T extends DependencyClass<any>>(
        SomeClass: T
    ): InstanceType<T> & ContainerizedDependency;
    resolve<T>(
        dependency: DependencyId | DependencyClass<any>
    ): T & ContainerizedDependency {
        if (typeof dependency === 'function') {
            let id: DependencyId;
            try {
                id = findInjectableId(dependency);
            } catch {
                id = dependency.name;
            }

            return this.resolve(id);
        }

        if (!this.isKnown(dependency)) {
            throw new Error(
                `Can't resolve unknown dependency: ${String(dependency)}`
            );
        }

        let context: MiddlewareContext<T> = {
            container: this,
            dependencyId: dependency,
            dependency: this.resolveImpl(dependency),
        };

        context = this.middlewareManager.onResolve(context);

        return context.dependency;
    }

    private resolveImpl = <T>(
        dependencyId: DependencyId
    ): T & ContainerizedDependency => {
        const proxy = this.inContextProxies[dependencyId];
        if (proxy) {
            return proxy as T & ContainerizedDependency;
        }

        const instance = this.findDependency<T>(dependencyId);
        if (instance) {
            if (
                instance[PROXYDI_CONTAINER] !== this &&
                typeof instance === 'object' &&
                this.settings.resolveInContainerContext
            ) {
                const proxy = makeDependencyProxy(instance);
                this.injectDependenciesTo(proxy);
                this.inContextProxies[dependencyId] = proxy;
                return proxy as T & ContainerizedDependency;
            }
            return instance;
        }

        const InjectableClass = injectableClasses[dependencyId];
        return this.register(InjectableClass, dependencyId);
    };

    /**
     * Injects dependencies to the given object based on its defined injections metadata. Does not affect the container.
     * @param injectionsOwner The object to inject dependencies into.
     */
    injectDependenciesTo(injectionsOwner: any) {
        const dependencyInjects: Injections = injectionsOwner[INJECTIONS] || {};

        Object.values(dependencyInjects).forEach((injection: Injection) => {
            const dependencyProxy = isAllInjection(injection)
                ? makeInjectAllProxy(injection, injectionsOwner, this)
                : makeInjectionProxy(injection, injectionsOwner, this);
            injection.set(injectionsOwner, dependencyProxy);
        });
    }

    /**
     * Creates instances for all injectable classes and registers them in this container.
     * @returns This container to allow use along with constructor.
     */
    registerInjectables() {
        for (const [dependencyId, InjectableClass] of Object.entries(
            injectableClasses
        )) {
            this.register(InjectableClass, dependencyId);
        }
        return this;
    }

    /**
     * Finalizes dependency injections, prevents further rewriting of dependencies,
     * and recursively bakes injections for child containers.
     */
    bakeInjections() {
        for (const dependency of Object.values(this.dependencies)) {
            const dependencyInjects: Injections = dependency[INJECTIONS] || {};

            Object.values(dependencyInjects).forEach((inject: Injection) => {
                if (!isAllInjection(inject)) {
                    // Only bake single injections
                    // Array injections (@injectAll) remain dynamic - array updates on each access,
                    // but elements are baked through container.resolve()
                    const value = this.resolve(inject.dependencyId);
                    inject.set(dependency, value);
                }
            });
        }

        this.settings.allowRewriteDependencies = false;

        for (const child of Object.values(this._children)) {
            child.bakeInjections();
        }
    }

    /**
     * Creates a child container that inherits settings and dependencies from this container.
     * @returns A new child instance of ProxyDiContainer.
     */
    createChildContainer(): ProxyDiContainer {
        return new ProxyDiContainer(this.settings, this);
    }

    /**
     * Removes a given dependency from the container using either the dependency instance or its ID.
     * @param dependencyOrId The dependency instance or dependency identifier to remove.
     */
    remove(dependencyOrId: DependencyId | ContainerizedDependency) {
        const id = isDependency(dependencyOrId)
            ? dependencyOrId[DEPENDENCY_ID]
            : dependencyOrId;
        const dependency = this.dependencies[id];
        if (dependency) {
            const constructorName = dependency.constructor?.name;
            if (constructorName && middlewaresClasses[constructorName]) {
                this.middlewareManager.remove(dependency);
            }

            const dependencyInjects: Injections = dependency[INJECTIONS]
                ? dependency[INJECTIONS]
                : {};
            Object.values(dependencyInjects).forEach((inject: Injection) => {
                inject.set(dependency, undefined);
            });
            delete (dependency as any)[DEPENDENCY_ID];

            delete this.dependencies[id];

            this.middlewareManager.onRemove({
                container: this,
                dependencyId: id,
                dependency,
            });
        }
    }

    /**
     * Destroys the container by removing all dependencies,
     * recursively destroying child containers and removing itself from its parent.
     */
    destroy() {
        const allDependencies = Object.values(this.dependencies);
        for (const dependency of allDependencies) {
            this.remove(dependency);
        }

        this.dependencies = {};

        for (const child of Object.values(this._children)) {
            child.destroy();
        }

        this._children = {};

        if (this.parent) {
            this.parent.removeChild(this.id);
            (this as any).parent = undefined;
        }
    }

    /**
     * Recursively finds a dependency by its ID from this container or its parent.
     * @param dependencyId The identifier of the dependency to find.
     * @returns The dependency if found, otherwise undefined.
     */
    private findDependency<T>(
        dependencyId: DependencyId
    ): (T & ContainerizedDependency) | undefined {
        const dependency = this.dependencies[dependencyId];
        if (!dependency && this.parent) {
            const parentDependency = this.parent.findDependency<
                T & ContainerizedDependency
            >(dependencyId);

            return parentDependency;
        }

        return dependency as T & ContainerizedDependency;
    }

    /**
     * Normalizes dependency identifier by converting class constructors to their names.
     * @param id The dependency identifier (string, symbol, or class constructor).
     * @returns Normalized dependency identifier (string or symbol).
     */
    private normalizeDependencyId(
        id: DependencyId | DependencyClass<any>
    ): DependencyId {
        if (typeof id === 'function') {
            try {
                return findInjectableId(id);
            } catch {
                return id.name;
            }
        }
        return id;
    }

    /**
     * All direct descendants of this container
     */
    get children() {
        return Object.values(this._children);
    }

    /**
     *
     * @param id Unique identifier of container
     * @returns
     */
    getChild(id: number): ProxyDiContainer {
        const child = this._children[id];
        if (!child) {
            throw new Error(`Unknown ProxyDiContainer child ID: ${id}`);
        }

        return child;
    }

    /**
     * Registers a child container to this container.
     * @param child The child container to add.
     * @throws Error if a child with the same ID already exists.
     */
    private addChild(child: ProxyDiContainer) {
        if (this._children[child.id]) {
            throw new Error(`ProxyDi already has child with id ${child.id}`);
        }

        this._children[child.id] = child;
    }

    /**
     * Removes a child container by its ID.
     * @param id The identifier of the child container to remove.
     */
    private removeChild(id: number) {
        const child = this._children[id];
        if (child) {
            delete this._children[id];
        }
    }
}

/**
 * Helper function to determine if the provided argument is a dependency instance.
 * @param dependencyOrId The dependency instance or dependency identifier.
 * @returns True if the argument is a dependency instance, false otherwise.
 */
function isDependency(
    dependencyOrId: DependencyId | ContainerizedDependency
): dependencyOrId is ContainerizedDependency {
    return (
        typeof dependencyOrId === 'object' &&
        !!(dependencyOrId as ContainerizedDependency)[DEPENDENCY_ID]
    );
}
