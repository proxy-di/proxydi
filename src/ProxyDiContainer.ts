import {
    INJECTIONS,
    DEPENDENCY_ID,
    IProxyDiContainer as IProxyDiContainer,
    ContainerizedDependency as ContainerizedDependency,
    DependencyClass,
    PROXYDY_CONTAINER,
    Injections,
} from './types';
import { injectableClasses } from './injectable';
import {
    Injection,
    ContainerSettings as ContainerSettings,
    DependencyId,
} from './types';
import { DEFAULT_SETTINGS } from './presets';
import { makeInjectionProxy, makeDependencyProxy } from './Proxy.utils';

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
    private parentDependencyProxies: Record<
        DependencyId,
        ContainerizedDependency
    > = {};

    /**
     * Settings that control the behavior of the container and it's children
     */
    public readonly settings: Required<ContainerSettings>;

    /**
     * Creates a new instance of ProxyDiContainer.
     * @param settings Optional container settings to override defaults.
     * @param parent Optional parent container.
     */
    constructor(settings?: ContainerSettings, parent?: ProxyDiContainer) {
        this.id = ProxyDiContainer.idCounter++;

        if (parent) {
            this.parent = parent;
            this.parent.addChild(this);
        }

        this.settings = { ...DEFAULT_SETTINGS, ...settings };
    }

    /**
     * Registers a dependency in the container. Could register eacher class or instance.
     * In case of class, it will be instantiated without any parameters.
     *
     * @param dependency The dependency instance or dependency class.
     * @param dependencyId The unique identifier for the dependency in this container.
     * @throws Error if dependency is already registered and rewriting is not allowed or if invalid dependency (not object) is provided and this it now allowed.
     * @returns Dependency instance, registered in container
     */
    register<T>(
        DependencyClass: DependencyClass<T>,
        dependencyId: DependencyId
    ): T & ContainerizedDependency;
    register<T>(
        dependency: T extends new (...args: any[]) => any ? never : T,
        dependencyId: DependencyId
    ): T & ContainerizedDependency;
    register(dependency: any, dependencyId: DependencyId): any {
        if (this.dependencies[dependencyId]) {
            if (!this.settings.allowRewriteDependencies) {
                throw new Error(
                    `ProxyDi already has dependency for ${String(dependencyId)}`
                );
            }
        }

        let dependencyInstance: any;
        const isClass = typeof dependency === 'function';

        if (isClass) {
            dependencyInstance = new dependency();
        } else {
            dependencyInstance = dependency;
            if (
                !(typeof dependencyInstance === 'object') &&
                !this.settings.allowRegisterAnything
            ) {
                throw new Error(
                    `Can't register as dependency (allowRegisterAnything is off for this contatiner): ${dependencyInstance}`
                );
            }
        }

        if (typeof dependencyInstance === 'object') {
            dependencyInstance[PROXYDY_CONTAINER] = this;
        }

        this.registerImpl(dependencyInstance, dependencyId);

        return dependencyInstance;
    }

    /**
     * Internal method that implements registeration of dependency and prepare it for injection.
     * @param dependencyId The unique identifier of the dependency.
     * @param dependency The dependency instance.
     */
    private registerImpl(dependency: any, dependencyId: DependencyId) {
        this.injectDependenciesTo(dependency);

        if (typeof dependency === 'object') {
            (dependency as any)[DEPENDENCY_ID] = dependencyId;
        }

        this.dependencies[dependencyId] = dependency;
    }

    /**
     * Checks if a dependency with the given ID is known to the container or its ancestors which means that it can be resolved by this container
     * @param dependencyId The identifier of the dependency.
     * @returns True if the dependency is known, false otherwise.
     */
    isKnown(dependencyId: DependencyId): boolean {
        return !!(
            this.parentDependencyProxies[dependencyId] ||
            this.dependencies[dependencyId] ||
            (this.parent && this.parent.isKnown(dependencyId)) ||
            injectableClasses[dependencyId]
        );
    }

    /**
     * Resolves a dependency either by its dependency ID or through a class constructor for auto-injectable classes.
     * @param param The dependency ID or class constructor.
     * @returns The resolved dependency instance with container metadata.
     * @throws Error if the dependency cannot be found or is not auto injectable.
     */
    resolve<T>(dependencyId: DependencyId): T & ContainerizedDependency;
    resolve<T extends new (...args: any[]) => any>(
        SomeClass: T
    ): InstanceType<T> & ContainerizedDependency;
    resolve<T>(
        param: DependencyId | (new (...args: any[]) => any)
    ): T & ContainerizedDependency {
        if (typeof param === 'function') {
            for (const [dependencyId, DependencyClass] of Object.entries(
                injectableClasses
            )) {
                if (DependencyClass === param) {
                    return this.resolve(dependencyId);
                }
            }
            throw new Error(`Class is not auto injectable: ${param.name}`);
        }

        if (!this.isKnown(param)) {
            throw new Error(
                `Can't resolve unknown dependency: ${String(param)}`
            );
        }

        const proxy = this.parentDependencyProxies[param];
        if (proxy) {
            return proxy as T & ContainerizedDependency;
        }

        const dependency = this.findDependency<T>(param);
        if (dependency) {
            if (
                dependency[PROXYDY_CONTAINER] !== this &&
                typeof dependency === 'object' &&
                this.settings.resolveInContainerContext
            ) {
                const proxy = makeDependencyProxy(dependency);
                this.injectDependenciesTo(proxy);
                this.parentDependencyProxies[param] = proxy;
                return proxy as any as T & ContainerizedDependency;
            }
            return dependency;
        }

        const InjectableClass = injectableClasses[param];
        const autoDependency = new InjectableClass();
        return this.register(autoDependency, param);
    }

    /**
     * Injects dependencies to the given object based on its defined injections metadata. Does not affect the container.
     * @param injectionsOwner The object to inject dependencies into.
     */
    injectDependenciesTo(injectionsOwner: any) {
        const dependencyInjects: Injections = injectionsOwner[INJECTIONS] || {};

        Object.values(dependencyInjects).forEach((injection: Injection) => {
            const dependencyProxy = makeInjectionProxy(
                injection,
                injectionsOwner,
                this
            );
            injection.set(injectionsOwner, dependencyProxy);
        });
    }

    /**
     * Finalizes dependency injections, prevents further rewriting of dependencies,
     * and recursively bakes injections for child containers.
     */
    bakeInjections() {
        for (const dependency of Object.values(this.dependencies)) {
            const dependencyInjects: Injections = dependency[INJECTIONS] || {};

            Object.values(dependencyInjects).forEach((inject: Injection) => {
                const value = this.resolve(inject.dependencyId);
                inject.set(dependency, value);
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
            const dependencyInjects: Injections = dependency[INJECTIONS]
                ? dependency[INJECTIONS]
                : {};
            Object.values(dependencyInjects).forEach((inject: Injection) => {
                inject.set(dependency, undefined);
            });
            delete (dependency as any)[DEPENDENCY_ID];

            delete this.dependencies[id];
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
