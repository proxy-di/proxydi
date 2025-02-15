import { ProxyDiContainer } from './ProxyDI';

export type ServiceId = string | symbol;

// TODO: Leave only one of these
export type ServiceClass<T extends unknown> = new () => T;
export type InstancedServiceClass<T> = new (...args: any[]) => T;
export type ServiceInstanced<T> = T extends { new (...args: any[]): any }
    ? never
    : T;

export type Setter = (object: unknown, value: unknown) => void;

export type Injection = {
    property: string | symbol;
    serviceId: ServiceId;
    set: Setter;
};

export type IProxyDiContainer = {
    id: number;

    isKnown: (serviceId: ServiceId) => boolean;

    injectDependencies: (instance: any) => void;

    registerService: <T>(
        serviceId: ServiceId,
        instance: T extends { new (...args: any[]): any } ? never : T
    ) => void;

    createService: <T>(
        serviceId: ServiceId,
        serviceClass: InstancedServiceClass<T>
    ) => void;

    resolveDependency: <T>(
        serviceId: ServiceId
    ) => T & ContainerizedServiceInstance;

    // resolveFor: <T>(
    //     inject: Injection,
    //     injectionOwner: ContainerizedServiceInstance,
    //     container: IProxyDiContainer
    // ) => T & ContainerizedServiceInstance;

    createChildContainer: () => IProxyDiContainer;

    removeService: (
        serviceId: ServiceId | ContainerizedServiceInstance
    ) => void;
    destroy: () => void;
};

export const INJECTIONS = Symbol('injections');
export const SERVICE_ID = Symbol('ServiceId');

export type ServiceInstance = {
    [INJECTIONS]: Injection[];
};

export type ContainerizedServiceInstance = ServiceInstance & {
    [SERVICE_ID]: ServiceId;
};

export type ProxyDiSettings = {
    allowRegisterAnythingAsInstance?: boolean;

    allowRewriteServices?: boolean;
};
export const IS_PROXY = Symbol('isProxy');
export const INJECTION_OWNER = Symbol('injectionOwner');
export const PROXYDY_CONTAINER = Symbol('proxyDiContainer');

export type InjectionProxy = {
    [IS_PROXY]: true;
    [INJECTION_OWNER]: ContainerizedServiceInstance;
    [PROXYDY_CONTAINER]: IProxyDiContainer;
};
