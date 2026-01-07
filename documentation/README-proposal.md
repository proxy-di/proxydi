# ProxyDi

[![Coverage Status](https://coveralls.io/repos/github/proxy-di/proxydi/badge.png)](https://coveralls.io/github/proxy-di/proxydi)

A typed hierarchical DI container that resolves circular dependencies via Proxy.

**Philosophy:** ProxyDI follows the principle of minimum entities solving maximum tasks. No complex data structures, no complex algorithms - just simple tools that work.

<img src="https://github.com/proxy-di/proxydi/blob/main/assets/ProxyDiLogo.png?raw=true" width="196">

Core features:

- Automatically resolves circular dependencies with no performance impact
- Supports hierarchical containers with the ability to resolve dependencies in both directions
- Simple API - mark classes with `@injectable()`, inject with `@inject()`, and you're done
- Uses Stage 3 decorators, supported in TypeScript 5.x and modern bundlers (esbuild, Vite, Webpack)

> **Note:** Currently this library under active development. The API may change until version 1.0.0.

## Quick Start

> If you are using React, you should use the React wrapper for ProxyDi instead of this library directly: [@proxydi/react](https://github.com/proxy-di/proxydi-react)

Install the `proxydi` package in your JavaScript or TypeScript project:

```shell
npm i proxydi
```

### Configure TypeScript and Modern Bundlers

If you are using TypeScript with modern bundlers (esbuild, Vite, Webpack), ensure your `tsconfig.json` has the correct configuration:

```jsonc
// tsconfig.json
{
    "compilerOptions": {
        "target": "ES2022", // Required for Stage 3 decorators in modern bandlers
        "module": "ESNext", // or "NodeNext"
        "experimentalDecorators": false, // Use Stage 3 decorators
        "strictPropertyInitialization": false, // Optional, see note below
    },
}
```

> **strictPropertyInitialization:** Not required, but if set to `true`, you'll need to use `!` assertion or initialize injected fields.

> **Why ES2022?** Stage 3 decorators require ES2022 or higher. Lower targets will cause decorator malfunction.

### Configure Babel (Optional)

For Babel projects, ensure that @babel/plugin-proposal-decorators is configured exactly as follows:

```jsonc
// .babelrc
{
    "plugins": [
        ["@babel/plugin-proposal-decorators", { "version": "2023-11" }],
    ],
}
```

See [Babel examples repository](https://github.com/proxy-di/node-babel-examples) for complete setup.

## Part 1: Core Concepts

Imagine you're implementing a theater production of Hamlet. You have actors, and each actor plays a specific character. The actor playing Hamlet needs to interact with the actor playing Ophelia, but Hamlet doesn't choose who plays Ophelia - the production does.

This is dependency injection. Your classes (actors) declare what they need (other characters), and the container (production) provides it.

ProxyDi makes this simple: mark your classes with `@injectable()`, declare dependencies with `@inject()`, and let the container handle the rest.

### Your First Dependency

Let's create a simple dependency for our production:

```typescript
import { injectable, ProxyDiContainer } from 'proxydi';

@injectable()
class Hamlet {
    speak() {
        return 'To be, or not to be';
    }
}

const production = new ProxyDiContainer();
const hamlet = production.resolve(Hamlet);

console.log(hamlet.speak());
// Output: To be, or not to be
```

That's it. Mark the class with `@injectable()`, and you can resolve it from any container. No manual registration or manual instance creation needed.

> **Note:** Yes, this looks like overkill for printing a simple string. But keep reading - you'll see how this pattern becomes powerful when managing complex dependencies between classes.

### Dependencies Referencing Each Other

Dependencies can reference each other. Let's show Hamlet talking to Ophelia:

```typescript
@injectable()
class Ophelia {
    respond() {
        return 'My lord, I have remembrances of yours';
    }
}

@injectable()
class Hamlet {
    @inject(Ophelia) ophelia: Ophelia;

    speakTo() {
        return `Hamlet: "Are you fair?" | Ophelia: "${this.ophelia.respond()}"`;
    }
}

const production = new ProxyDiContainer();
const hamlet = production.resolve(Hamlet);

console.log(hamlet.speakTo());
// Output: Hamlet: "Are you fair?" | Ophelia: "My lord, I have remembrances of yours"
```

The `@inject(Ophelia)` decorator tells ProxyDi that Hamlet needs Ophelia. When you resolve Hamlet, ProxyDi automatically creates and injects Ophelia. No manual wiring required.

### Circular Dependencies

In conversations, characters reference each other back and forth. This creates circular dependencies, which traditionally cause problems in DI containers.

ProxyDi handles this naturally:

```typescript
@injectable()
class Ophelia {
    @inject(Hamlet) hamlet: Hamlet;

    respond() {
        return `My lord ${this.hamlet.getName()}`;
    }
}

@injectable()
class Hamlet {
    @inject(Ophelia) ophelia: Ophelia;

    getName() {
        return 'Hamlet';
    }

    speakTo() {
        return `Ophelia says: "${this.ophelia.respond()}"`;
    }
}

const production = new ProxyDiContainer();
const hamlet = production.resolve(Hamlet);

console.log(hamlet.speakTo());
// Output: Ophelia says: "My lord Hamlet"
```

Notice that Hamlet needs Ophelia, and Ophelia needs Hamlet. This circular dependency is resolved automatically through JavaScript Proxies. No special configuration needed.

### Hierarchical Containers

Usually each theater production has its own brochure. The brochure needs to show the director's name, and the director works at the theater level:

```typescript
class Director {
    constructor(public name: string) {}
}

@injectable()
class HamletBrochure {
    @inject(Director) director: Director;

    print() {
        return `Hamlet - Directed by ${this.director.name}`;
    }
}

const theater = new ProxyDiContainer();
theater.register(new Director('John Smith'));

const hamletProduction = theater.createChildContainer();
const brochure = hamletProduction.resolve(HamletBrochure);

console.log(brochure.print());
// Output: Hamlet - Directed by John Smith
```

The director is registered in the parent container (theater), while the brochure is created in the child container (production). The brochure automatically receives the director from the parent - child containers naturally access parent dependencies without any special configuration.

Notice how we register a specific director instance (`new Director('John Smith')`) of regular class instead of injectable class. ProxyDI works seamlessly with these like instances.

### Inject Multiple Instances

The director needs to work with all actors in the production.

```typescript
import { injectable, inject, injectAll, ProxyDiContainer } from 'proxydi';

interface Role {
    line(): string;
}

class Hamlet implements Role {
    line() {
        return 'To be, or not to be';
    }
}

class Ophelia implements Role {
    line() {
        return 'My lord, I have remembrances of yours';
    }
}

class Actor {
    @inject('role') role: Role;

    constructor(public readonly name: string) {}

    sayLine() {
        return `${this.name}: "${this.role.line()}"`;
    }
}

@injectable()
class Director {
    @injectAll(Actor) actors: Actor[];

    rehearse() {
        this.actors.forEach((actor) => console.log(actor.sayLine()));
    }
}

const production = new ProxyDiContainer();
const director = production.resolve(Director);

// Laurence Olivier plays Hamlet
const olivierContainer = production.createChildContainer();
olivierContainer.register(new Hamlet(), 'role');
olivierContainer.register(new Actor('Laurence Olivier'));

// Claire Bloom plays Ophelia
const bloomContainer = production.createChildContainer();
bloomContainer.register(new Ophelia(), 'role');
bloomContainer.register(new Actor('Claire Bloom'));

director.rehearse();
// Output:
// Laurence Olivier: "To be, or not to be"
// Claire Bloom: "My lord, I have remembrances of yours"
```

The `@injectAll()` decorator collects all dependencies from the entire container hierarchy recursively. The array updates automatically when dependencies or containers are added or removed.

## Part 2: Technical Details

Now that you understand the basics, let's explore the technical aspects and advanced features of ProxyDi.

### Performance and Baking

Everything we've shown so far works with zero performance overhead. ProxyDi uses JavaScript Proxies to resolve circular dependencies, but these proxies are automatically replaced with real instances on first use (called "auto-baking"). This means after the first access, you're working with direct references - no proxy overhead.

#### Parent Seeing Child Dependencies

Sometimes you need a parent dependency to access child-specific context. For example, a director registered at the theater level needs to know which production they're currently working on. This is possible with `resolveInContainerContext`, but comes with a performance cost:

```typescript
@injectable()
class ProductionInfo {
    name = 'Hamlet';
    date = '2024-03-15';
}

@injectable()
class Director {
    @inject(ProductionInfo) production: ProductionInfo;

    announce() {
        return `I'm directing ${this.production.name} on ${this.production.date}`;
    }
}

const theater = new ProxyDiContainer({
    resolveInContainerContext: true, // Enable context resolution
});
theater.register(Director);

const hamletProduction = theater.createChildContainer();
hamletProduction.register(ProductionInfo);

const director = hamletProduction.resolve(Director);
console.log(director.announce());
// Output: I'm directing Hamlet on 2024-03-15
```

With `resolveInContainerContext: true`, when you resolve Director from a child container, it sees that child's ProductionInfo. This enables powerful scenarios where a single parent dependency adapts to different child contexts.

**Performance Impact**: This feature requires a permanent Proxy layer with **~100x slower property access**. Unlike auto-baking (which happens once), this Proxy remains active for all property accesses.

**When to use**: Only when you specifically need parent dependencies to adapt to child context. For most cases, the default behavior (child accessing parent, like in the Brochure example) is sufficient and has zero overhead after auto-baking.

**Manual Baking**: If you want to ensure all injections are resolved upfront (for example, after configuration is complete), you can manually bake:

```typescript
const production = new ProxyDiContainer();
production.resolve(Hamlet);

// Bake all injections at once
production.bakeInjections();

// Now all @inject fields are direct references, no proxies
```

Baking also:

- Sets `allowRewriteDependencies` to `false` (prevents further modifications)
- Recursively bakes all child containers

**When allowRewriteDependencies is true**: Auto-baking is disabled to keep injections dynamic. This means every property access goes through a Proxy, which is ~100x slower. Only use this for scenarios like testing or hot-reload where you need to replace dependencies at runtime.

### Container Settings

ProxyDiContainer accepts optional settings to control its behavior:

```typescript
const container = new ProxyDiContainer({
    allowRegisterAnything: false, // Allow register literals as dependencies
    allowRewriteDependencies: false, // Prevent accidental overwrites
    resolveInContainerContext: false, // Performance optimization (see below)
});
```

**allowRegisterAnything**: By default, ProxyDi only accepts objects as dependencies. Set this to `true` to register primitive values like strings or numbers.

**allowRewriteDependencies**: When `false` (default), trying to register the same dependency twice throws an error. Set to `true` if you need to replace dependencies at runtime (useful for testing or hot-reload scenarios).

**resolveInContainerContext**: When `true`, parent dependencies resolved from child containers will see child-specific dependencies. This creates an additional Proxy layer with ~100x slower property access. Keep this `false` unless you specifically need this behavior.

### Resolving All Dependencies

Sometimes you need to get all instances of a specific type from a container and all its children. For example, a director might want to gather all actors from all casts:

```typescript
import { injectable, inject, ProxyDiContainer, resolveAll } from 'proxydi';

class Actor {
    constructor(public readonly name: string = 'Actor') {}
}

@injectable()
class Director {
    getAllActors() {
        // resolveAll needs a containerized instance to know which container to search
        return resolveAll(this, 'actor');
    }
}

const mainProduction = new ProxyDiContainer();
const director = mainProduction.resolve(Director);

// Main cast
const mainCast = mainProduction.createChildContainer();
mainCast.register(new Actor('Laurence Olivier'), 'actor');

// Understudy cast
const understudyCast = mainProduction.createChildContainer();
understudyCast.register(new Actor('Kenneth Branagh'), 'actor');

const allActors = director.getAllActors();
console.log(allActors.map((a) => a.name));
// Output: ['Laurence Olivier', 'Kenneth Branagh']
```

The `resolveAll()` function takes an instance that's registered in a container and searches that container plus all its children recursively.

### Custom Dependency IDs

So far, we've used `@injectable()` to automatically register classes by their name. But sometimes you need more control - for example, when you want multiple instances of the same class with different configurations:

```typescript
class Hamlet {
    @inject('stage') stage: Stage;

    constructor(public readonly interpretation: string) {}
}

const production = new ProxyDiContainer();

// Register two different Hamlets
const traditionalHamlet = production.register(
    new Hamlet('traditional'),
    'traditionalHamlet'
);
const modernHamlet = production.register(new Hamlet('modern'), 'modernHamlet');

// Inject specific Hamlet
class Review {
    @inject('traditionalHamlet') hamlet: Hamlet;
}
```

**When to use custom IDs:**

- Multiple instances of the same class with different configurations
- You want explicit control over dependency naming
- Working with interfaces or abstract classes (TypeScript types are erased at runtime)

**When to use @injectable():**

- Most cases - it's simpler and more maintainable
- One instance per class is sufficient
- You want automatic dependency resolution

You can also use `register()` without `@injectable()`:

```typescript
class Stage {
    setup() {
        return 'Castle';
    }
}

const production = new ProxyDiContainer();
production.register(Stage, 'stage');
// or
production.register(new Stage(), 'stage');

const stage = production.resolve('stage');
```

### Advanced Features

#### Lifecycle Hooks: ON_CONTAINERIZED

When a dependency is registered in a container, you can execute custom logic using the `ON_CONTAINERIZED` symbol:

```typescript
import { injectable, ProxyDiContainer, ON_CONTAINERIZED } from 'proxydi';

@injectable()
class Actor {
    private script: string = '';

    [ON_CONTAINERIZED](container: ProxyDiContainer) {
        // Called when this instance is registered
        this.script = 'Hamlet script loaded';
        console.log('Actor received script');
    }
}

const production = new ProxyDiContainer();
const actor = production.resolve(Actor);
// Console output: "Actor received script"
```

This is useful for initialization logic that depends on the container being available.

#### Middleware System

ProxyDi supports middleware that can intercept dependency registration, resolution, and removal:

```typescript
import { middleware, MiddlewareContext } from 'proxydi';

@middleware()
@injectable()
class LoggingMiddleware {
    onRegister(context: MiddlewareContext<any>) {
        console.log(`Registered: ${String(context.dependencyId)}`);
    }

    onResolve(context: MiddlewareContext<any>) {
        console.log(`Resolved: ${String(context.dependencyId)}`);
        return context; // Can modify the context
    }

    onRemove(context: MiddlewareContext<any>) {
        console.log(`Removed: ${String(context.dependencyId)}`);
    }
}

const production = new ProxyDiContainer();
production.resolve(LoggingMiddleware); // Middleware is auto-registered

production.register(Hamlet, 'hamlet');
// Console: "Registered: hamlet"

production.resolve('hamlet');
// Console: "Resolved: hamlet"
```

Middleware is inherited by child containers and receives events from the entire hierarchy.

## Motivation

[Keep existing motivation section or refine]

## Contributing

[Keep existing contributing section]

## License

This project is licensed under the terms of the MIT License. See the [LICENSE](./LICENSE) file for details.
