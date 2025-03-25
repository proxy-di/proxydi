import {
    MiddlewareContext,
    MiddlewareEvent,
    MiddlewareRegistrator,
    MiddlewareRemover,
    MiddlewareResolver,
} from './middleware.api';

export class MiddlewareManager {
    private handlers: {
        [K in keyof MiddlewareEvent]: MiddlewareEvent[K][];
    } = {
        register: [],
        remove: [],
        resolve: [],
    };

    constructor(private parent?: MiddlewareManager) {}

    add(middleware: any) {
        if (isRegistrator(middleware)) {
            middleware.onRegister && this.on('register', middleware.onRegister);
        }

        if (isRemover(middleware)) {
            middleware.onRemove && this.on('remove', middleware.onRemove);
        }

        if (isResolver(middleware)) {
            middleware.onResolve && this.on('resolve', middleware.onResolve);
        }
    }

    remove(middleware: any) {
        if (isRegistrator(middleware)) {
            middleware.onRegister &&
                this.off('register', middleware.onRegister);
        }

        if (isRemover(middleware)) {
            middleware.onRemove && this.off('remove', middleware.onRemove);
        }

        if (isResolver(middleware)) {
            middleware.onResolve && this.off('resolve', middleware.onResolve);
        }
    }

    private on<K extends keyof MiddlewareEvent>(
        event: K,
        listener: MiddlewareEvent[K]
    ) {
        this.handlers[event].push(listener);
    }

    onRegister<T>(context: MiddlewareContext<T>) {
        this.handlers.register.forEach((listener) => listener(context));

        this.parent?.onRegister(context);
    }

    onRemove<T>(context: MiddlewareContext<T>) {
        this.handlers.remove.forEach((listener) => listener(context));
        this.parent?.onRemove(context);
    }

    onResolve<T>(context: MiddlewareContext<T>) {
        let result = context;
        this.handlers.resolve.forEach((listener) => {
            result = listener(result);
        });
        return result;
    }

    private off<K extends keyof MiddlewareEvent>(
        event: K,
        listener: MiddlewareEvent[K]
    ) {
        const index = this.handlers[event].indexOf(listener);
        if (index !== -1) {
            this.handlers[event].splice(index, 1);
        }
    }
}

function isRegistrator(
    middleware: any | MiddlewareRegistrator
): middleware is MiddlewareRegistrator {
    return !!middleware.onRegister;
}

function isRemover(
    middleware: any | MiddlewareRemover
): middleware is MiddlewareRemover {
    return !!middleware.onRemove;
}

function isResolver(
    middleware: any | MiddlewareResolver
): middleware is MiddlewareResolver {
    return !!middleware.onResolve;
}
