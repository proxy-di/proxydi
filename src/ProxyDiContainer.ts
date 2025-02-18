import {
    INJECTIONS,
    SERVICE_ID,
    IProxyDiContainer as IProxyDiContainer,
    ContainerizedServiceInstance,
    ServiceInstanced,
    ServiceClass,
    PROXYDY_CONTAINER,
    Injections,
} from './types';
import { autoInjectableServices } from './autoInjectableService';
import { Injection, ProxyDiSettings, ServiceId } from './types';
import { DEFAULT_SETTINGS } from './presets';
import { makeInjectionProxy, makeInstanceProxy } from './Proxy.utils';

export class ProxyDiContainer implements IProxyDiContainer {
    private static idCounter = 0;
    public readonly id: number;

    public readonly parent?: ProxyDiContainer;
    private children: Record<number, IProxyDiContainer> = {};

    /**
     * Holds instances of services registered in particular this container
     */
    private serviceInstances: Record<ServiceId, ContainerizedServiceInstance> =
        {};
    private parentInstanceProxies: Record<
        ServiceId,
        ContainerizedServiceInstance
    > = {};

    private settings: Required<ProxyDiSettings>;

    constructor(settings?: ProxyDiSettings, parent?: ProxyDiContainer) {
        this.id = ProxyDiContainer.idCounter++;

        if (parent) {
            this.parent = parent;
            this.parent.addChild(this);
        }

        this.settings = { ...DEFAULT_SETTINGS, ...settings };
    }

    registerService<T>(serviceId: ServiceId, instance: ServiceInstanced<T>) {
        if (this.serviceInstances[serviceId]) {
            if (!this.settings.allowRewriteServices) {
                throw new Error(
                    `ProxyDi already has registered instance for ${String(serviceId)}`
                );
            }
        }

        if (
            !(typeof instance === 'object') &&
            !this.settings.allowRegisterAnythingAsInstance
        ) {
            throw new Error(
                `Can't register as instance (allowRegisterAnythingAsInstance is off for this ProxyDi contatiner): ${instance}`
            );
        }

        this.registerInstanceImplementation(serviceId, instance);
    }

    private registerInstanceImplementation(
        serviceId: ServiceId,
        instance: any
    ) {
        this.injectDependencies(instance);

        if (typeof instance === 'object') {
            (instance as any)[SERVICE_ID] = serviceId;
        }

        this.serviceInstances[serviceId] = instance;
    }

    createService<T>(serviceId: ServiceId, ServiceClass: ServiceClass<T>) {
        if (this.serviceInstances[serviceId]) {
            if (!this.settings.allowRewriteServices) {
                throw new Error(
                    `ProxyDi already has registered class for ${String(serviceId)}`
                );
            }
        }

        const newInstance: T = new ServiceClass();
        this.registerInstanceImplementation(serviceId, newInstance);
    }

    isKnown(serviceId: ServiceId): boolean {
        return !!(
            this.parentInstanceProxies[serviceId] ||
            this.serviceInstances[serviceId] ||
            (this.parent && this.parent.isKnown(serviceId)) ||
            autoInjectableServices[serviceId]
        );
    }

    resolveAutoInjectable<T extends new () => any>(
        service: T
    ): InstanceType<T> {
        for (const [serviceId, ServiceClass] of Object.entries(
            autoInjectableServices
        )) {
            if (ServiceClass === service) {
                return this.resolve(serviceId);
            }
        }

        throw new Error(`Service is not auto injectable: ${service.name}`);
    }

    resolve<T>(serviceId: ServiceId): T & ContainerizedServiceInstance {
        if (!this.isKnown(serviceId)) {
            throw new Error(
                `Can't resolve unknown ProxyDi-service: ${String(serviceId)}`
            );
        }

        const proxy = this.parentInstanceProxies[serviceId];
        if (proxy) {
            return proxy as T & ContainerizedServiceInstance;
        }

        const instance = this.findInstance<T>(serviceId);
        if (instance) {
            if (
                instance[PROXYDY_CONTAINER] !== this &&
                typeof instance === 'object'
            ) {
                const proxy = makeInstanceProxy(instance);
                this.injectDependencies(proxy);
                this.parentInstanceProxies[serviceId] = proxy;
                return proxy as any as T & ContainerizedServiceInstance;
            }
            return instance;
        }

        const AutoInjectableService = autoInjectableServices[serviceId];

        const newInstance = new AutoInjectableService();
        this.registerInstanceImplementation(serviceId, newInstance);
        this.serviceInstances[serviceId] = newInstance;
        return newInstance;
    }

    injectDependencies(injectionsOwner: any) {
        const serviceInjects: Injections = injectionsOwner[INJECTIONS] || {};

        Object.values(serviceInjects).forEach((inject: Injection) => {
            const value = makeInjectionProxy(inject, injectionsOwner, this);
            inject.set(injectionsOwner, value);
        });
    }

    createChildContainer(): ProxyDiContainer {
        return new ProxyDiContainer(this.settings, this);
    }

    removeService(serviceId: ServiceId | ContainerizedServiceInstance) {
        const id = isInstance(serviceId) ? serviceId[SERVICE_ID] : serviceId;
        const instance = this.serviceInstances[id];
        if (instance) {
            const serviceInjects: Injections = instance[INJECTIONS]
                ? instance[INJECTIONS]
                : {};
            Object.values(serviceInjects).forEach((inject: Injection) => {
                inject.set(instance, undefined);
            });
            delete (instance as any)[SERVICE_ID];

            delete this.serviceInstances[id];
        }
    }

    destroy() {
        const allServices = Object.values(this.serviceInstances);
        for (const service of allServices) {
            this.removeService(service);
        }

        this.serviceInstances = {};

        for (const child of Object.values(this.children)) {
            child.destroy();
        }
        this.children = {};

        if (this.parent) {
            this.parent.removeChild(this.id);
            (this as any).parent = undefined;
        }
    }

    private findInstance<T>(
        serviceId: ServiceId
    ): (T & ContainerizedServiceInstance) | undefined {
        const instance = this.serviceInstances[serviceId];
        if (!instance && this.parent) {
            const parentInstance = this.parent.findInstance<
                T & ContainerizedServiceInstance
            >(serviceId);

            return parentInstance;
        }

        return instance as T & ContainerizedServiceInstance;
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

function isInstance(
    service: ServiceId | ContainerizedServiceInstance
): service is ContainerizedServiceInstance {
    return (
        typeof service === 'object' &&
        !!(service as ContainerizedServiceInstance)[SERVICE_ID]
    );
}
