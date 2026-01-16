import {
    INJECTIONS,
    DEPENDENCY_IDS,
    IProxyDiContainer as IProxyDiContainer,
    ContainerizedDependency as ContainerizedDependency,
    DependencyClass,
    PROXYDI_CONTAINER,
    Injections,
    ON_CONTAINERIZED,
    Injection,
    isAllInjection,
    ResolveScope,
    DependencyId,
    DuplicateStrategy,
    RegisterOptions,
} from './types';
import {
    findInjectableId,
    findInjectableIds,
    injectableClasses,
} from './injectable.decorator';
import { ContainerSettings as ContainerSettings } from './types';
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
    private dependencies: Record<DependencyId, ContainerizedDependency[]> = {};

    /**
     * Holds proxies for dependencies registered in parent containers to provide for it dependencies from this container
     */
    private inContextProxies: Record<
        DependencyId,
        Map<ContainerizedDependency, ContainerizedDependency>
    > = {};

    /**
     * Mapping from dependency instance to all IDs under which it was registered
     */
    private dependencyIds = new WeakMap<object, Set<DependencyId>>();

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
     * @param dependencyId The unique identifier(s) for the dependency in this container. Can be a string, symbol, array or class constructor (which will be normalized to class name or @injectable IDs).
     * @returns Dependency instance, registered in container
     */
    register<T>(
        DependencyClass: DependencyClass<T>,
        options?:
            | RegisterOptions
            | DependencyId
            | DependencyId[]
            | DependencyClass<any>
    ): T & ContainerizedDependency;
    register<T>(
        dependency: T extends new (...args: any[]) => any ? never : T,
        options?:
            | RegisterOptions
            | DependencyId
            | DependencyId[]
            | DependencyClass<any>
    ): T & ContainerizedDependency;
    register(
        dependency: any,
        options?:
            | RegisterOptions
            | DependencyId
            | DependencyId[]
            | DependencyClass<any>
    ): any {
        const normalizedOptions = this.normalizeRegisterOptions(options);
        const ids = this.normalizeDependencyIds(
            dependency,
            normalizedOptions.dependencyId
        );
        const strategy = normalizedOptions.duplicateStrategy;

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
            instance[DEPENDENCY_IDS] = ids;
            instance[ON_CONTAINERIZED] && instance[ON_CONTAINERIZED](this);
        }

        this.injectDependenciesTo(instance);

        ids.forEach((id) => this.addDependencyInstance(id, instance, strategy));

        const constructorName = instance.constructor?.name;
        if (constructorName && middlewaresClasses[constructorName]) {
            this.middlewareManager.add(instance);
        }

        this.notifyOnRegister(instance, ids);

        return instance;
    }

    /**
     * Checks if a dependency with the given ID is known to the container or its ancestors which means that it can be resolved by this container
     * @param dependencyId The identifier of the dependency. Can be a string, symbol, or class constructor (which will be normalized to class name).
     * @returns True if the dependency is known, false otherwise.
     */
    isKnown(
        dependencyId: DependencyId | DependencyClass<any>,
        scope: ResolveScope = ResolveScope.Parent | ResolveScope.Current
    ): boolean {
        const ids = this.normalizeToIds(dependencyId);
        for (const id of ids) {
            if (this.isKnownById(id, scope)) {
                return true;
            }
        }
        return false;
    }

    private isKnownById(
        dependencyId: DependencyId,
        scope: ResolveScope
    ): boolean {
        if (this.hasOwn(dependencyId)) {
            return true;
        }

        if (scope & ResolveScope.Parent) {
            if (this.parent && this.parent.isKnownById(dependencyId, scope)) {
                return true;
            }
        }

        if (scope & ResolveScope.Children) {
            for (const child of this.children) {
                if (
                    child.isKnownById(
                        dependencyId,
                        ResolveScope.Current | ResolveScope.Children
                    )
                ) {
                    return true;
                }
            }
        }

        if (injectableClasses[dependencyId]) {
            return true;
        }

        return false;
    }

    /**
     * Checks if a dependency with the given ID exists in this container only (does not check parents)
     * @param dependencyId The identifier of the dependency. Can be a string, symbol, or class constructor (which will be normalized to class name).
     * @returns True if the dependency exists in this container, false otherwise.
     */
    hasOwn(dependencyId: DependencyId | DependencyClass<any>): boolean {
        const ids = this.normalizeToIds(dependencyId);
        return ids.some((id) => {
            const deps = this.dependencies[id];
            return !!(deps && deps.length);
        });
    }

    /**
     * Resolves a dependency either by its dependency ID or through a class constructor for auto-injectable classes.
     * @param param The dependency ID or class constructor.
     * @returns The resolved dependency instance with container metadata.
     * @throws Error if the dependency cannot be found or is not auto injectable.
     */
    resolve<T>(
        dependency: DependencyId,
        scope?: ResolveScope
    ): T & ContainerizedDependency;
    resolve<T extends DependencyClass<any>>(
        dependency: T,
        scope?: ResolveScope
    ): InstanceType<T> & ContainerizedDependency;
    resolve<T>(
        dependency: DependencyId | DependencyClass<any>,
        scope: ResolveScope = ResolveScope.Parent | ResolveScope.Current
    ): T & ContainerizedDependency {
        const ids = this.normalizeToIds(dependency);

        for (const id of ids) {
            const resolved = this.resolveById<T>(id, scope);
            if (resolved) {
                const context: MiddlewareContext<T> = {
                    container: this,
                    dependencyId: id,
                    dependency: resolved,
                };
                const result = this.middlewareManager.onResolve(context);
                return result.dependency;
            }
        }

        // Auto create injectable by id
        const injectableClassEntry = injectableClasses[ids[0]];
        if (injectableClassEntry && injectableClassEntry.length) {
            const injectableClass = injectableClassEntry[0];
            const injectableIds = findInjectableIds(injectableClass);
            this.register(injectableClass, injectableIds);
            return this.resolve(injectableClass, scope);
        }

        if (typeof dependency === 'function') {
            throw new Error(
                `Can't resolve unknown dependency: ${String(ids[0])}`
            );
        }

        throw new Error(`Can't resolve unknown dependency: ${String(ids[0])}`);
    }

    resolveAll<T>(
        dependencyId: DependencyId,
        scope?: ResolveScope
    ): (T & ContainerizedDependency)[];
    resolveAll<T extends DependencyClass<any>>(
        dependencyId: T,
        scope?: ResolveScope
    ): (InstanceType<T> & ContainerizedDependency)[];
    resolveAll<T>(
        dependencyId: DependencyId | DependencyClass<any>,
        scope: ResolveScope = ResolveScope.Children
    ): (T & ContainerizedDependency)[] {
        if (typeof dependencyId === 'function') {
            const ids = findInjectableIds(dependencyId);
            const collected: (T & ContainerizedDependency)[] = [];
            ids.forEach((id) => {
                collected.push(...this.resolveAll<T>(id, scope));
            });
            return this.dedupe(collected) as (T & ContainerizedDependency)[];
        }

        const results = this.recursiveResolveAll<T>(this, dependencyId, scope);
        if (results.length > 0) {
            return results;
        }

        if (scope & ResolveScope.Current) {
            const registered = this.autoRegisterAllInjectables<T>(dependencyId);
            if (registered.length > 0) {
                return registered;
            }
        }

        return [];
    }

    private resolveById<T>(
        dependencyId: DependencyId,
        scope: ResolveScope
    ): (T & ContainerizedDependency) | undefined {
        const instance =
            this.findFirstInScope<T>(dependencyId, scope) ??
            this.autoRegisterInjectable<T>(dependencyId);

        if (!instance) {
            return undefined;
        }

        const ownerContainer =
            (instance as any)[PROXYDI_CONTAINER] || this.parent;

        if (
            ownerContainer &&
            ownerContainer !== this &&
            typeof instance === 'object' &&
            this.settings.resolveInContainerContext
        ) {
            return this.getContextProxy(dependencyId, instance);
        }

        return instance as T & ContainerizedDependency;
    }

    private autoRegisterInjectable<T>(
        dependencyId: DependencyId
    ): (T & ContainerizedDependency) | undefined {
        const InjectableClasses = injectableClasses[dependencyId];
        if (!InjectableClasses || InjectableClasses.length === 0) {
            return undefined;
        }
        const InjectableClass = InjectableClasses[0];
        const ids = findInjectableIds(InjectableClass);
        this.register(InjectableClass, ids);
        return this.findFirstInScope<T>(dependencyId, ResolveScope.Current);
    }

    private autoRegisterAllInjectables<T>(
        dependencyId: DependencyId
    ): (T & ContainerizedDependency)[] {
        const InjectableClasses = injectableClasses[dependencyId];
        if (!InjectableClasses || InjectableClasses.length === 0) {
            return [];
        }

        const instances: (T & ContainerizedDependency)[] = [];

        InjectableClasses.forEach((InjectableClass) => {
            const ids = findInjectableIds(InjectableClass);
            const instance = this.register(InjectableClass, {
                dependencyId: ids,
                duplicateStrategy: DuplicateStrategy.AlwaysAdd,
            });
            instances.push(instance);
        });

        return instances;
    }

    private getContextProxy<T>(
        dependencyId: DependencyId,
        instance: ContainerizedDependency
    ): T & ContainerizedDependency {
        if (!this.inContextProxies[dependencyId]) {
            this.inContextProxies[dependencyId] = new Map();
        }

        const proxies = this.inContextProxies[dependencyId];

        if (proxies.has(instance)) {
            return proxies.get(instance) as T & ContainerizedDependency;
        }

        const proxy = makeDependencyProxy(instance) as T &
            ContainerizedDependency;
        (proxy as any)[PROXYDI_CONTAINER] = this;
        const ids = (instance as any)[DEPENDENCY_IDS];
        if (ids && Array.isArray(ids) && ids.length) {
            (proxy as any)[DEPENDENCY_IDS] = ids;
        }
        this.injectDependenciesTo(proxy);
        proxies.set(instance, proxy);

        return proxy;
    }

    private recursiveResolveAll<T>(
        container: ProxyDiContainer,
        dependencyId: DependencyId,
        scope: ResolveScope = ResolveScope.All
    ): (T & ContainerizedDependency)[] {
        if ((scope as any) === 0) {
            throw new Error('ResolveScope must have at least one flag set');
        }

        let all: (T & ContainerizedDependency)[] = [];

        if (scope & ResolveScope.Current) {
            const deps = container.dependencies[dependencyId] as
                | (T & ContainerizedDependency)[]
                | undefined;
            if (deps?.length) {
                all = all.concat(deps);
            }
        }

        if (scope & ResolveScope.Parent) {
            const parent = container.parent;
            if (parent) {
                const deps = parent.dependencies[dependencyId] as
                    | (T & ContainerizedDependency)[]
                    | undefined;
                if (deps?.length) {
                    all = all.concat(deps);
                }
            }
        }

        if (scope & ResolveScope.Children) {
            for (const child of container.children) {
                const childScope = ResolveScope.Children | ResolveScope.Current;
                const childResults = this.recursiveResolveAll<T>(
                    child,
                    dependencyId,
                    childScope
                );
                all = all.concat(childResults);
            }
        }

        return this.dedupe(all);
    }

    private findFirstInScope<T>(
        dependencyId: DependencyId,
        scope: ResolveScope
    ): (T & ContainerizedDependency) | undefined {
        if ((scope as any) === 0) {
            throw new Error('ResolveScope must have at least one flag set');
        }

        // Current
        if (scope & ResolveScope.Current) {
            const proxyList = this.inContextProxies[dependencyId];
            if (proxyList && proxyList.size) {
                const first = proxyList.values().next().value;
                if (first) {
                    return first as T & ContainerizedDependency;
                }
            }

            const deps = this.dependencies[dependencyId];
            if (deps && deps.length) {
                if (deps.length > 1) {
                    console.warn(
                        `[ProxyDI] Warning: Found ${
                            deps.length
                        } dependencies for "${String(
                            dependencyId
                        )}" when resolving single instance. Returning the first one.`
                    );
                }
                return deps[0] as T & ContainerizedDependency;
            }
        }

        // Parent
        if (scope & ResolveScope.Parent) {
            const parent = this.parent;
            if (parent) {
                const parentScope =
                    scope & (ResolveScope.Current | ResolveScope.Parent);
                const resolved = parent.findFirstInScope<T>(
                    dependencyId,
                    parentScope
                );
                if (resolved) {
                    return resolved;
                }
            }
        }

        // Children
        if (scope & ResolveScope.Children) {
            for (const child of this.children) {
                const childScope = ResolveScope.Current | ResolveScope.Children;
                const resolved = child.findFirstInScope<T>(
                    dependencyId,
                    childScope
                );
                if (resolved) {
                    return resolved;
                }
            }
        }

        return undefined;
    }

    private dedupe<T>(items: (T & ContainerizedDependency)[]) {
        const unique: (T & ContainerizedDependency)[] = [];
        const seen = new Set<any>();

        for (const item of items) {
            if (!seen.has(item)) {
                seen.add(item);
                unique.push(item);
            }
        }

        return unique;
    }

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
        const uniqueClasses = new Set<DependencyClass<any>>();
        for (const injectableList of Object.values(injectableClasses)) {
            injectableList.forEach((InjectableClass) =>
                uniqueClasses.add(InjectableClass)
            );
        }

        uniqueClasses.forEach((InjectableClass) => {
            const ids = findInjectableIds(InjectableClass);
            this.register(InjectableClass, ids);
        });
        return this;
    }

    /**
     * Finalizes dependency injections and recursively bakes injections for child containers.
     */
    bakeInjections() {
        for (const dependency of this.getAllOwnDependencies()) {
            const dependencyInjects: Injections = dependency[INJECTIONS] || {};

            Object.values(dependencyInjects).forEach((inject: Injection) => {
                if (!isAllInjection(inject)) {
                    const value = this.resolve(
                        inject.dependencyId,
                        inject.scope ??
                            ResolveScope.Current | ResolveScope.Parent
                    );
                    inject.set(dependency, value);
                }
            });
        }

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
        if (isDependency(dependencyOrId)) {
            this.removeByInstance(dependencyOrId);
            return;
        }

        this.removeById(dependencyOrId);
    }

    /**
     * Destroys the container by removing all dependencies,
     * recursively destroying child containers and removing itself from its parent.
     */
    destroy() {
        const allDependencies = this.getAllOwnDependencies();
        for (const dependency of allDependencies) {
            this.removeByInstance(dependency);
        }

        this.dependencies = {};
        this.inContextProxies = {};

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

    private normalizeDependencyIds(
        dependency: any,
        dependecyId?: DependencyId | DependencyId[] | DependencyClass<any>
    ): DependencyId[] {
        if (dependecyId) {
            if (typeof dependecyId === 'function') {
                return this.normalizeToIds(dependecyId);
            }

            let ids: DependencyId[] = Array.isArray(dependecyId)
                ? [...dependecyId]
                : [dependecyId];

            if (Array.isArray(dependecyId)) {
                if (typeof dependency === 'function' && dependency.name) {
                    ids.push(dependency.name);
                } else if (
                    dependency?.constructor &&
                    dependency.constructor !== Object &&
                    dependency.constructor.name
                ) {
                    ids.push(dependency.constructor.name);
                }
            }

            return Array.from(new Set(ids));
        }

        if (typeof dependency === 'function') {
            try {
                return findInjectableIds(dependency);
            } catch {
                return [dependency.name];
            }
        } else if (
            dependency?.constructor &&
            dependency.constructor !== Object &&
            dependency.constructor.name
        ) {
            try {
                return findInjectableIds(dependency.constructor);
            } catch {
                return [dependency.constructor.name];
            }
        } else {
            throw new Error(
                'dependencyId is required when registering plain objects or literals'
            );
        }
    }

    private normalizeRegisterOptions(
        options?:
            | RegisterOptions
            | DependencyId
            | DependencyId[]
            | DependencyClass<any>
    ): {
        dependencyId?: DependencyId | DependencyId[] | DependencyClass<any>;
        duplicateStrategy: DuplicateStrategy;
    } {
        const defaultStrategy = DuplicateStrategy.ReplaceIfSingleElseAdd;
        if (
            typeof options === 'string' ||
            typeof options === 'symbol' ||
            typeof options === 'function' ||
            Array.isArray(options)
        ) {
            return {
                dependencyId: options as any,
                duplicateStrategy: defaultStrategy,
            };
        }

        return {
            dependencyId: options?.dependencyId,
            duplicateStrategy: options?.duplicateStrategy ?? defaultStrategy,
        };
    }

    private normalizeToIds(
        dependencyId: DependencyId | DependencyClass<any>
    ): DependencyId[] {
        if (typeof dependencyId === 'function') {
            try {
                return findInjectableIds(dependencyId);
            } catch {
                return [dependencyId.name];
            }
        }

        return [dependencyId];
    }

    private addDependencyInstance(
        dependencyId: DependencyId,
        instance: any,
        strategy: DuplicateStrategy
    ) {
        const existing = this.dependencies[dependencyId];
        if (!existing || existing.length === 0) {
            this.dependencies[dependencyId] = [instance];
        } else {
            if (strategy === DuplicateStrategy.Throw) {
                throw new Error(
                    `Dependency with id "${String(dependencyId)}" already exists`
                );
            }

            if (strategy === DuplicateStrategy.AlwaysReplace) {
                this.dependencies[dependencyId] = [instance];
            } else if (strategy === DuplicateStrategy.AlwaysAdd) {
                if (!existing.includes(instance)) {
                    existing.push(instance);
                }
            } else {
                // ReplaceIfSingleElseAdd
                if (existing.length === 1) {
                    this.dependencies[dependencyId] = [instance];
                } else if (!existing.includes(instance)) {
                    existing.push(instance);
                }
            }
        }

        if (typeof instance === 'object' && instance !== null) {
            let idsSet = this.dependencyIds.get(instance);
            if (!idsSet) {
                idsSet = new Set<DependencyId>();
                this.dependencyIds.set(instance, idsSet);
            }
            idsSet.add(dependencyId);
            (instance as any)[DEPENDENCY_IDS] = Array.from(idsSet);
        }
    }

    private notifyOnRegister(
        instance: ContainerizedDependency,
        ids: DependencyId[]
    ) {
        ids.forEach((dependencyId) => {
            const context: MiddlewareContext<any> = {
                container: this,
                dependencyId,
                dependency: instance,
            };

            this.middlewareManager.onRegister(context);
        });
    }

    private getAllOwnDependencies(): ContainerizedDependency[] {
        const unique = new Set<ContainerizedDependency>();
        Object.values(this.dependencies).forEach((deps) => {
            deps.forEach((dep) => unique.add(dep));
        });
        return Array.from(unique);
    }

    private removeById(dependencyId: DependencyId) {
        const deps = this.dependencies[dependencyId];
        if (!deps || deps.length === 0) {
            return;
        }

        deps.slice().forEach((dep) => {
            this.removeDependencyBinding(dep, dependencyId);
        });

        delete this.dependencies[dependencyId];
    }

    private removeByInstance(instance: ContainerizedDependency) {
        if (typeof instance !== 'object' || instance === null) {
            // For primitives, just remove any bindings by scanning
            Object.keys(this.dependencies).forEach((key) => {
                this.removeDependencyBinding(instance, key as any);
            });
            return;
        }

        const ids = this.dependencyIds.get(instance);
        if (!ids) {
            return;
        }

        Array.from(ids).forEach((id) =>
            this.removeDependencyBinding(instance, id)
        );
    }

    private removeDependencyBinding(
        instance: ContainerizedDependency,
        dependencyId: DependencyId
    ) {
        const deps = this.dependencies[dependencyId];
        if (deps) {
            const index = deps.indexOf(instance);
            if (index !== -1) {
                deps.splice(index, 1);
            }
            if (deps.length === 0) {
                delete this.dependencies[dependencyId];
            }
        }

        if (typeof instance === 'object' && instance !== null) {
            const idsSet = this.dependencyIds.get(instance);
            if (idsSet) {
                idsSet.delete(dependencyId);
                (instance as any)[DEPENDENCY_IDS] = Array.from(idsSet);
                if (idsSet.size === 0) {
                    this.dependencyIds.delete(instance);
                    delete (instance as any)[DEPENDENCY_IDS];
                    delete (instance as any)[PROXYDI_CONTAINER];

                    const constructorName = (instance as any).constructor?.name;
                    if (
                        constructorName &&
                        middlewaresClasses[constructorName]
                    ) {
                        this.middlewareManager.remove(instance);
                    }

                    const dependencyInjects: Injections = (instance as any)[
                        INJECTIONS
                    ]
                        ? (instance as any)[INJECTIONS]
                        : {};
                    Object.values(dependencyInjects).forEach(
                        (inject: Injection) => {
                            inject.set(instance, undefined);
                        }
                    );
                }
            }
        }

        this.middlewareManager.onRemove({
            container: this,
            dependencyId,
            dependency: instance,
        });
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
        !!(dependencyOrId as any)[DEPENDENCY_IDS]
    );
}
