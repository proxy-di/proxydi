import {
    INJECTIONS,
    DEPENDENCY_ID,
    IProxyDiContainer as IProxyDiContainer,
    ContainerizedDependency as ContainerizedDependency,
    Instanced,
    DependencyClass,
    PROXYDY_CONTAINER,
    Injections,
} from './types';
import { autoInjectableClasses } from './autoInjectable';
import {
    Injection,
    ContainerSettings as ContainerSettings,
    DependencyId,
} from './types';
import { DEFAULT_SETTINGS } from './presets';
import { makeInjectionProxy, makeDependencyProxy } from './Proxy.utils';

export class ProxyDiContainer implements IProxyDiContainer {
    private static idCounter = 0;
    public readonly id: number;

    public readonly parent?: ProxyDiContainer;
    private children: Record<number, IProxyDiContainer> = {};

    /**
     * Holds dependencies of this particular container
     */
    private dependencies: Record<DependencyId, ContainerizedDependency> = {};
    private parentDependencyProxies: Record<
        DependencyId,
        ContainerizedDependency
    > = {};

    public readonly settings: Required<ContainerSettings>;

    constructor(settings?: ContainerSettings, parent?: ProxyDiContainer) {
        this.id = ProxyDiContainer.idCounter++;

        if (parent) {
            this.parent = parent;
            this.parent.addChild(this);
        }

        this.settings = { ...DEFAULT_SETTINGS, ...settings };
    }

    registerDependency<T>(
        dependency: Instanced<T>,
        dependencyId: DependencyId
    ) {
        if (this.dependencies[dependencyId]) {
            if (!this.settings.allowRewriteDependencies) {
                throw new Error(
                    `ProxyDi already has dependency for ${String(dependencyId)}`
                );
            }
        }

        const isObject = typeof dependency === 'object';

        if (!isObject && !this.settings.allowRegisterAnything) {
            throw new Error(
                `Can't register as dependency (allowRegisterAnything is off for this contatiner): ${dependency}`
            );
        }

        if (isObject) {
            (dependency as any)[PROXYDY_CONTAINER] = this;
        }

        this.registerDependencyImpl(dependencyId, dependency);
    }

    newDependency<T>(
        DependencyClass: DependencyClass<T>,
        dependencyId: DependencyId
    ) {
        if (this.dependencies[dependencyId]) {
            if (!this.settings.allowRewriteDependencies) {
                throw new Error(
                    `ProxyDi already has dependency for ${String(dependencyId)}`
                );
            }
        }

        const dependency: T = new DependencyClass();
        (dependency as any)[PROXYDY_CONTAINER] = this;
        this.registerDependencyImpl(dependencyId, dependency);
    }

    private registerDependencyImpl(
        dependencyId: DependencyId,
        dependency: any
    ) {
        this.injectDependenciesTo(dependency);

        if (typeof dependency === 'object') {
            (dependency as any)[DEPENDENCY_ID] = dependencyId;
        }

        this.dependencies[dependencyId] = dependency;
    }

    isKnown(dependencyId: DependencyId): boolean {
        return !!(
            this.parentDependencyProxies[dependencyId] ||
            this.dependencies[dependencyId] ||
            (this.parent && this.parent.isKnown(dependencyId)) ||
            autoInjectableClasses[dependencyId]
        );
    }

    resolveAutoInjectable<T extends new () => any>(
        SomeClass: T
    ): InstanceType<T> {
        for (const [dependencyId, DependencyClass] of Object.entries(
            autoInjectableClasses
        )) {
            if (DependencyClass === SomeClass) {
                return this.resolve(dependencyId);
            }
        }

        throw new Error(`Class is not auto injectable: ${SomeClass.name}`);
    }

    resolve<T>(dependencyId: DependencyId): T & ContainerizedDependency {
        if (!this.isKnown(dependencyId)) {
            throw new Error(
                `Can't resolve unknown dependency: ${String(dependencyId)}`
            );
        }

        const proxy = this.parentDependencyProxies[dependencyId];
        if (proxy) {
            return proxy as T & ContainerizedDependency;
        }

        const dependency = this.findDependency<T>(dependencyId);
        if (dependency) {
            if (
                dependency[PROXYDY_CONTAINER] !== this &&
                typeof dependency === 'object'
            ) {
                const proxy = makeDependencyProxy(dependency);
                this.injectDependenciesTo(proxy);
                this.parentDependencyProxies[dependencyId] = proxy;
                return proxy as any as T & ContainerizedDependency;
            }
            return dependency;
        }

        const AutoInjectableClass = autoInjectableClasses[dependencyId];
        const autoDependency = new AutoInjectableClass();
        this.registerDependencyImpl(dependencyId, autoDependency);
        this.dependencies[dependencyId] = autoDependency;
        return autoDependency;
    }

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

    bakeInjections() {
        for (const dependency of Object.values(this.dependencies)) {
            const dependencyInjects: Injections = dependency[INJECTIONS] || {};

            Object.values(dependencyInjects).forEach((inject: Injection) => {
                const value = this.resolve(inject.dependencyId);
                inject.set(dependency, value);
            });
        }

        this.settings.allowRewriteDependencies = false;

        for (const child of Object.values(this.children)) {
            child.bakeInjections();
        }
    }

    createChildContainer(): ProxyDiContainer {
        return new ProxyDiContainer(this.settings, this);
    }

    removeDependency(dependencyOrId: DependencyId | ContainerizedDependency) {
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

    destroy() {
        const allDependencies = Object.values(this.dependencies);
        for (const dependency of allDependencies) {
            this.removeDependency(dependency);
        }

        this.dependencies = {};

        for (const child of Object.values(this.children)) {
            child.destroy();
        }
        this.children = {};

        if (this.parent) {
            this.parent.removeChild(this.id);
            (this as any).parent = undefined;
        }
    }

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

    private addChild(child: ProxyDiContainer) {
        if (this.children[child.id]) {
            throw new Error(`ProxyDi already has child with id ${child.id}`);
        }

        this.children[child.id] = child;
    }

    private removeChild(id: number) {
        const child = this.children[id];
        if (child) {
            delete this.children[id];
        }
    }
}

function isDependency(
    dependencyOrId: DependencyId | ContainerizedDependency
): dependencyOrId is ContainerizedDependency {
    return (
        typeof dependencyOrId === 'object' &&
        !!(dependencyOrId as ContainerizedDependency)[DEPENDENCY_ID]
    );
}
