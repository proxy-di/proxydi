import { DependencyClass, DependencyId } from '../types';

export const middlewaresClasses: Record<
    DependencyId,
    DependencyClass<any>
> = {};

export function injectable(): any {
    return function (
        value: DependencyClass<any>,
        context: ClassDecoratorContext
    ) {
        if (context?.kind !== 'class') {
            throw new Error('@middleware decorator should decorate classes');
        }

        const name = context.name!;
        if (middlewaresClasses[name]) {
            throw new Error(
                `ProxyDi has already regisered middleware ${String(name)} by @middleware`
            );
        }

        middlewaresClasses[name] = value;
    };
}
