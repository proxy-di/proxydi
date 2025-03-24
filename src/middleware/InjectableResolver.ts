import { MiddlewareContext, MiddlewareResolver } from './resolver';

export class InjectableResolver implements MiddlewareResolver {
    resolveNext<T>(context: MiddlewareContext<T>): T {}
}
