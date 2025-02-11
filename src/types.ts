export type ServiceId = any;

export type ServiceConstructor<T extends unknown> = new () => T;

export type Setter = (object: unknown, value: unknown) => void;

export type Inject = {
    property: string | symbol;
    serviceId: ServiceId;
    set: Setter;
};

export type ProxyDI = {
    isKnown: (serviceId: ServiceId) => boolean;

    injectDependencies: (instance: any) => void;

    registerInstance: <T>(
        serviceId: ServiceId,
        instance: T extends { new (...args: any[]): any } ? never : T
    ) => void;

    registerClass: <T>(
        serviceId: ServiceId,
        serviceClass: ServiceClass<T>
    ) => void;

    resolve: <T>(serviceId: ServiceId) => T;

    createChildContainer: () => ProxyDI;

    removeInstance: (serviceId: ServiceId | ProxydiedInstance) => void;
    removeClass: (serviceId: ServiceId) => void;
    destroy: () => void;
};

export const INJECTS = Symbol('injects');
export const PROXYDI = Symbol('ProxyDI');
export const SERVICE_ID = Symbol('ServiceId');

export type ReadyForProxidyInstance = {
    [INJECTS]: Inject[];
};

export type InjectedInstance = ReadyForProxidyInstance & {
    [PROXYDI]: ProxyDI;
};

export type ProxydiedInstance = InjectedInstance & {
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
