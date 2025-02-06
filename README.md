# ProxyDI

A typed DI container that resolves circular dependencies via Proxy.

Core notes:

- Uses Stage 3 decorators (supported in TypeScript 5.x and babel-plugin-proposal-decorators)
- Automatically resolves circular dependencies
- Matches services by unique identifiers or property names
- Currently in active development

# Quick start

```shell
npm i proxydi
```

If you are using TypeScript be sure that your tsconfig.json set exactly `false` value for `experimentalDecorators`. This could be not obvious, but this setup turns on support of Stage 3 decorators.

```jsonc
{
    "compilerOptions": {
        // ...
        "experimentalDecorators": false,
    },
    //...
}
```

1. @inject your dependencies

```typescript
import { inject } from 'proxydi';

interface Personality {
    greet(): string;
}

class Agent {
    @inject() personality: Personality;
}
```

2. Create, fill ProxyDI container

```typescript
import { ProxyDI } from 'proxydi';

class Jarvis implements Personality {
    greet: () => 'Hello, sir!';
}

const container = new ProxyDI();
container.registerClass('personality', Jarvis);
```

3. Use dependencies

```typescript
const agent = container.resolve(Agent);
console.log(agent.personality.greet());
```

```shell
> Hello, sir!
```

To be continued...
