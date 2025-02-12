import {
    INJECTS,
    PROXYDI,
    SERVICE_ID,
    ProxyDI as IProxyDI,
    ProxydiedInstance,
} from './types';
import { injectableClasses } from './injectable';
import { Inject, ProxyDISettings, ServiceClass, ServiceId } from './types';
import { DEFAULT_SETTINGS } from './presets';
import { makeProxy } from './Proxy.utils';

export class ProxyDI implements IProxyDI {
    private static idCounter = 0;
    public readonly id: number;

    public readonly parent?: ProxyDI;
    private children: Record<number, IProxyDI> = {};

    private serviceInstances: Record<ServiceId, any> = {};
    private serviceClasses: Record<ServiceId, ServiceClass<any>> = {};

    private settings: Required<ProxyDISettings>;

    constructor(settings?: ProxyDISettings, parent?: ProxyDI) {
        this.id = ProxyDI.idCounter++;

        if (parent) {
            this.parent = parent;
            this.parent.addChild(this);
        }

        this.settings = { ...DEFAULT_SETTINGS, ...settings };
    }

    registerInstance<T>(
        serviceId: ServiceId,
        instance: T extends { new (...args: any[]): any } ? never : T
    ) {
        if (this.serviceInstances[serviceId]) {
            if (!this.settings.allowRewriteInstances) {
                throw new Error(
                    `ProxyDI already has registered instance for ${serviceId}`
                );
            }
        }

        const isObject = typeof instance === 'object';
        if (!isObject && !this.settings.allowRegisterAnythingAsInstance) {
            throw new Error(
                `Can't register as instance (allowRegisterAnythingAsInstance is off for this ProxyDI contatiner): ${instance}`
            );
        }

        this.injectDependencies(instance);

        if (isObject) {
            (instance as any)[SERVICE_ID] = serviceId;
        }

        this.serviceInstances[serviceId] = instance;
    }

    registerClass<T>(serviceId: ServiceId, serviceClass: ServiceClass<T>) {
        if (this.serviceClasses[serviceId]) {
            if (!this.settings.allowRewriteClasses) {
                throw new Error(
                    `ProxyDI already has registered class for ${serviceId}`
                );
            }
        }
        this.serviceClasses[serviceId] = serviceClass;
    }

    isKnown(serviceId: ServiceId) {
        return !!(
            this.findInstance(serviceId) ||
            this.findServiceClass(serviceId) ||
            injectableClasses[serviceId]
        );
    }

    resolve<T>(serviceId: ServiceId): T {
        if (!this.isKnown(serviceId)) {
            throw new Error(
                `Can't resolve unknown ProxyDI-service: ${serviceId}`
            );
        }

        const instance = this.findInstance<T>(serviceId);
        if (instance) {
            return instance;
        } else {
            const ServiceClass = this.findServiceClass(serviceId)!;

            const newInstance = new ServiceClass();
            this.registerInstance(serviceId, newInstance);

            return newInstance as T;
        }
    }

    injectDependencies(instance: any) {
        const serviceInjects: Inject[] = instance[INJECTS] || [];
        serviceInjects.forEach((inject: Inject) => {
            // TODO: Return only proxies
            //const value = makeProxy(inject.serviceId, instance);

            let value = this.findInstance(inject.serviceId);
            if (!value) {
                value = makeProxy(inject.serviceId, instance);
            }

            inject.set(instance, value);
        });

        if (typeof instance === 'object') {
            instance[PROXYDI] = this;
        }
    }

    createChildContainer(): ProxyDI {
        return new ProxyDI(this.settings, this);
    }

    removeInstance(serviceId: ServiceId | ProxydiedInstance) {
        const id = isInstance(serviceId) ? serviceId[SERVICE_ID] : serviceId;
        const instance = this.serviceInstances[id];
        if (instance) {
            const serviceInjects: Inject[] = instance[INJECTS]
                ? instance[INJECTS]
                : [];
            serviceInjects.forEach((inject: Inject) => {
                inject.set(instance, undefined);
            });
            delete instance[PROXYDI];
            delete instance[SERVICE_ID];

            delete this.serviceInstances[id];
        }
    }

    removeClass(serviceId: ServiceId) {
        delete this.serviceClasses[serviceId];
    }

    destroy() {
        const allServices = Object.keys(this.serviceInstances);
        for (const serviceId of allServices) {
            const instance = this.serviceInstances[serviceId];
            this.removeInstance(instance);
        }

        this.serviceInstances = {};
        this.serviceClasses = {};

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

    private findInstance<T>(serviceId: ServiceId): T | undefined {
        const instance = this.serviceInstances[serviceId];
        if (!instance && this.parent) {
            const parentInstance = this.parent.findInstance<T>(serviceId);
            // TODO: Make copy, inject container dependencies?
            return parentInstance;
        }

        return instance;
    }

    private findServiceClass(
        serviceId: ServiceId
    ): ServiceClass<any> | undefined {
        let ServiceClass = this.serviceClasses[serviceId];
        if (!ServiceClass && !!this.parent) {
            return this.parent.findServiceClass(serviceId);
        }
        if (!ServiceClass) {
            return injectableClasses[serviceId];
        }
        return ServiceClass;
    }

    private addChild(child: ProxyDI) {
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
    service: ServiceId | ProxydiedInstance
): service is ProxydiedInstance {
    return (
        typeof service === 'object' &&
        !!(service as ProxydiedInstance)[SERVICE_ID]
    );
}
