import { InstancedServiceClass, ServiceId } from './types';

export const autoInjectableServices: Record<
    ServiceId,
    InstancedServiceClass<any>
> = {};

/**
 * Decorator that registers a class as an auto-injectable service for dependency injection.
 *
 * @param serviceId - Optional service identifier. If omitted, the class name is used.
 * @returns A class decorator function.
 *
 * Note: During dependency resolution, any container that does not have an instance for the specified service identifier
 * will create an instance of the decorated class. However, if a container already has an instance with that identifier
 * prior to resolution, the decorated class will be ignored by that container.
 */
export const autoInjectableService = (serviceId?: ServiceId) => {
    return function (
        value: InstancedServiceClass<any>,
        context: ClassDecoratorContext
    ) {
        if (context?.kind === 'class') {
            const name = serviceId ? serviceId : context.name!;

            if (autoInjectableServices[name]) {
                throw new Error(
                    `ProxyDI autoInjectableService already has service ID: ${String(name)}`
                );
            }

            autoInjectableServices[name] = value;
        } else {
            throw new Error(
                '@autoInjectableService decorator should decorate classes'
            );
        }
    };
};
