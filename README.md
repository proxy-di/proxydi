# ProxyDi

[![Coverage Status](https://coveralls.io/repos/github/proxy-di/proxydi/badge.svg?branch=main)](https://coveralls.io/github/proxy-di/proxydi?branch=main)

A typed hierarchical DI container that resolves circular dependencies via Proxy.

Core features:

- Uses Stage 3 decorators (supported in TypeScript 5.x and babel-plugin-proposal-decorators)
- Automatically resolves circular dependencies
- Resolves dependencies in the context of a particular container
- Matches services by unique identifiers, class, or property names
- Currently in active development, API may change until version 0.1.0

# Quick start

Install the `proxydi` package in your JavaScript or TypeScript project:

```shell
npm i proxydi
```

If you are using TypeScript, ensure that `experimentalDecorators` is set to `false` in your `tsconfig.json`. This enables support for Stage 3 decorators:

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

The process of using ProxyDi consists of 3 stages:

1. Use the @inject decorator to define the dependencies to be resolved by the ProxyDi container. In this example, we define an interface for characters and ask ProxyDi to resolve the `Role` dependency for actors.

```typescript
interface Character {
    greet(): string;
}

class Actor {
    @inject('Role') role: Character;

    play = () => this.role.greet();
}
```

2. Next, set up the ProxyDi container and fill it with dependencies. Let's define an agent 007 role and prepare our first container:

```typescript
class Agent007 implements Character {
    greet = () => 'Bond... James Bond';
}

const container = new ProxyDiContainer();
container.newDependency(Agent007, 'Role');
container.newDependency(Actor, 'Actor');
```

3. At the last stage, take dependencies from the ProxyDi container and just use them. Let our actor play its role:

```typescript
const actor = container.resolve<Actor>('Actor');
console.log(actor.greet());
```

And the result is:

```shell
> Bond... James Bond
```

# The Reason

To illustrate why we should use a container for this simple purpose, let's create a container for another character and ask the actor to play the new role:

```typescript
class M implements Character {
    greet = () => '007, I have a new mission for you';
}

const container = new ProxyDiContainer();
container.newDependency(M, 'Role');
container.newDependency(Actor, 'Actor');

const actor = container.resolve<Actor>('Actor');
console.log(actor.play());
```

```shell
> 007, I have a new mission for you
```

In this example, we changed the behavior of the actor by changing the role dependency in the ProxyDi container. This is the goal of the [Dependency inversion principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle) in SOLID. Continuing our metaphor, the actor can play any role, but it is not he who decides what role he will play. This is a film director's decision, and here we just cosplay him by setting up our containers.

So, ProxyDi is a just tool to link dependencies. And nothing more. But we

# С dependencies

There are several rough edges in traditional DI container implementations that ProxyDi addresses. The first of these is circular dependencies.

Let's illustrate this with a movie set metaphor. During filming, the actor and director work together in a continuous feedback loop:

```typescript
class Director {
    @inject('Actor') private actor: Actor;
    private passionLevel = 1;

    direct(line: string) {
        return this.actor.perform(line, this.passionLevel);
    }
}

class Actor {
    @inject('Role') private role: Character;
    @inject('Director') private director: Director;

    play() {
        const line = this.role.greet();
        // Here actor asks director how to perform the line
        return this.director.direct(line);
    }

    perform(line: string, loudness: number = 0) {
        return line + '!'.repeat(loudness);
    }
}

const container = new ProxyDiContainer();
container.newDependency(Actor, 'Actor');
container.newDependency(Director, 'Director');
container.newDependency(Agent007, 'Role');

const actor = container.resolve<Actor>('Actor');
console.log(actor.play());
```

```shell
> Bond... James Bond!
```

In traditional DI containers, this scene would be tricky to shoot - the Director calls Actor's methods while Actor simultaneously needs Director's guidance. But ProxyDi handles it elegantly using JavaScript Proxies without any worries from you.
