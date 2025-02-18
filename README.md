# ProxyDi

[![Coverage Status](https://coveralls.io/repos/github/proxy-di/proxydi/badge.svg?branch=main)](https://coveralls.io/github/proxy-di/proxydi?branch=main)

A typed hierarchical DI container that resolves circular dependencies via Proxy.

Core notes:

- Uses Stage 3 decorators (supported in TypeScript 5.x and babel-plugin-proposal-decorators)
- Automatically resolves circular dependencies
- Resolves dependencies in context of particular container
- Matches services by unique identifiers, class or property names
- Currently in active development, so API could changes till version 0.1.0

# Quick start

Install `proxydi` package in your JavaScript or TypeScript project:

```shell
npm i proxydi
```

If you are using TypeScript be sure that `experimentalDecorators` has exactly `false` value in your `tsconfig.json`. This could be not obvious, but this turns on support of Stage 3 decorators:

```jsonc
// tsconfig.json
{
    "compilerOptions": {
        // ...
        "experimentalDecorators": false,
    },
    //...
}
```

The pipeline of using ProxyDi has 3 stages:

1. Using @inject decorator you need to define what dependencies should be resolved by ProxyDi .

```typescript
import { inject } from 'proxydi';

interface Character {
    greet(): string;
}

@autoInjectableService()
class Actor {
    @inject() role: Character;

    greet = () => this.role.greet();
}
```

In this example we ask ProxyDi to resolve `role` dependency for actor.

2. Next, you should setup ProxyDi container and fill it by dependencies.

```typescript
import { ProxyDiContainer } from 'proxydi';

class Agent007 implements Character {
    greet = () => 'Bond... James Bond';
}

const container = new ProxyDiContainer();
container.createService('role', Agent007);
```

In this example we setup ProxyDi container to allow atory play role of agent 007.

3. At last stage you takes dependencies from ProxyDi container and just use them.

```typescript
const actor = container.resolveAutoInjectable(Actor);
console.log(actor.greet());
```

```shell
> Bond... James Bond
```

To be continued...
