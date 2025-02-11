export type ServiceId = any;

export type ServiceConstructor<T extends unknown> = new () => T;

export type Setter = (object: unknown, value: unknown) => void;

export type Inject = {
    property: string | symbol;
    serviceId: ServiceId;
    set: Setter;
};

export type ProxyDI = {
    registerInstance: <T>(
        serviceId: ServiceId,
        instance: T extends { new (...args: any[]): any } ? never : T
    ) => void;

    registerClass: <T>(
        serviceId: ServiceId,
        serviceClass: ServiceClass<T>
    ) => void;

    isKnown: (serviceId: ServiceId) => boolean;

    resolve: <T>(serviceId: ServiceId) => T;

    injectDependencies: (instance: any) => void;

    createChildContainer: () => ProxyDI;

    removeInstance: (serviceId: ServiceId) => void;
    removeClass: (serviceId: ServiceId) => void;
    destroy: () => void;
};

export const INJECTS = Symbol('injects');
export const PROXYDI = Symbol('ProxyDI');
export const SERVICE_ID = Symbol('ServiceId');

export type ReadyForProxidyInstance = {
    [INJECTS]: Inject[];
};

export type ProxydiedInstance = ReadyForProxidyInstance & {
    [PROXYDI]: ProxyDI;
    [SERVICE_ID]: ServiceId;
};

export type ServiceClass<T> = new (...args: any[]) => T;

export type ProxyDISettings = {
    allowRegisterAnythingAsInstance?: boolean;

    allowRewriteClasses?: boolean;
    allowRewriteInstances?: boolean;
};
export const IS_PROXY = Symbol('isProxy');
export const INSTANCE = Symbol('instance');

export type InstanceProxy = {
    [IS_PROXY]: true;
    [INSTANCE]: ProxydiedInstance;
};
