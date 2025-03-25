import { InjectionProxy } from './makeInjectionProxy';
import { IS_INSTANCE_PROXY } from './types';

export function makeDependencyProxy(dependency: any) {
    const injectionValues: Record<string | symbol, any> = {};

    return new Proxy(dependency, {
        get: function (
            target: InjectionProxy,
            prop: string | symbol,
            receiver: any
        ) {
            if (prop === IS_INSTANCE_PROXY) {
                return true;
            }
            if (injectionValues[prop]) {
                return injectionValues[prop];
            }

            return Reflect.get(target, prop, receiver);
        },

        set: function (
            target: InjectionProxy,
            prop: string | symbol,
            value: any
        ) {
            injectionValues[prop] = value;
            return Reflect.set(target, prop, value);
        },
    });
}

export function isDependencyProxy(value: any): boolean {
    return !!(value && value[IS_INSTANCE_PROXY]);
}
