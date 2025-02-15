import {
    INJECTIONS,
    SERVICE_ID,
    IProxyDiContainer as IProxyDiContainer,
    ContainerizedServiceInstance,
    ServiceInstanced,
    ServiceClass,
} from './types';
import { autoInjectableServices } from './autoInjectableService';
import { Injection, ProxyDiSettings, ServiceId } from './types';
import { DEFAULT_SETTINGS } from './presets';
import { makeInjectionProxy } from './Proxy.utils';

export class ProxyDiContainer implements IProxyDiContainer {
    private static idCounter = 0;
    public readonly id: number;

    public readonly parent?: ProxyDiContainer;
    private children: Record<number, IProxyDiContainer> = {};

    private serviceInstances: Record<ServiceId, any> = {};
    private parentWrappers: Record<ServiceId, any> = {};

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
                    `ProxyDI already has registered instance for ${String(serviceId)}`
                );
            }
        }

        if (
            !(typeof instance === 'object') &&
            !this.settings.allowRegisterAnythingAsInstance
        ) {
            throw new Error(
                `Can't register as instance (allowRegisterAnythingAsInstance is off for this ProxyDI contatiner): ${instance}`
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
                    `ProxyDI already has registered class for ${String(serviceId)}`
                );
            }
        }

        const newInstance: T = new ServiceClass();
        this.registerInstanceImplementation(serviceId, newInstance);
    }

    isKnown(serviceId: ServiceId): boolean {
        return !!(
            this.parentWrappers[serviceId] ||
            this.findInstance(serviceId) ||
            (this.parent && this.parent.isKnown(serviceId)) ||
            autoInjectableServices[serviceId]
        );
    }

    resolveDependency<T>(
        serviceId: ServiceId
    ): T & ContainerizedServiceInstance {
        if (!this.isKnown(serviceId)) {
            throw new Error(
                `Can't resolve unknown ProxyDI-service: ${String(serviceId)}`
            );
        }

        // TODO: Any instance's injections should be wrapped by proxy from this container
        // 1. makeContainerWrapperProxy() with real instance as target object
        // 2. Reinject all dependencies by container's injectionProxies

        const proxy = this.parentWrappers[serviceId];
        if (proxy) {
            return proxy;
        }

        const instance = this.findInstance<T>(serviceId);
        if (instance) {
            return instance;
        }

        const AutoInjectableService = autoInjectableServices[serviceId];
        const newInstance = new AutoInjectableService();
        this.registerInstanceImplementation(serviceId, newInstance);
        return newInstance;
    }

    injectDependencies(injectionsOwner: any) {
        const serviceInjects: Injection[] = injectionsOwner[INJECTIONS] || [];

        serviceInjects.forEach((inject: Injection) => {
            // TODO: Hold only real instances in this.serviceInstances
            // TODO: Hold only injectionProxies (or injectionWrappers?) in injection values
            //const value = makeInjectionProxy(inject, instance, this);

            let value = this.findInstance(inject.serviceId);
            if (!value) {
                value = makeInjectionProxy(inject, injectionsOwner, this);
            }

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
            const serviceInjects: Injection[] = instance[INJECTIONS]
                ? instance[INJECTIONS]
                : [];
            serviceInjects.forEach((inject: Injection) => {
                inject.set(instance, undefined);
            });
            delete instance[SERVICE_ID];

            delete this.serviceInstances[id];
        }
    }

    destroy() {
        const allServices = Object.keys(this.serviceInstances);
        for (const serviceId of allServices) {
            const instance = this.serviceInstances[serviceId];
            this.removeService(instance);
        }

        this.serviceInstances = {};

        for (const id of Object.keys(this.children)) {
            const child = this.children[+id];
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

            // TODO: Check if this proxy rewrite new proxy and find the instance

            // if (parentInstance && forContainer) {
            //     const proxy = makeInjectionProxy(parentInstance, this);
            //     this.parentProxies[serviceId] = proxy;
            //     return proxy as T;
            // }

            return parentInstance;
        }

        return instance;
    }

    private addChild(child: ProxyDiContainer) {
        if (this.children[child.id]) {
            throw new Error(`ProxyDI already has child with id ${child.id}`);
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
