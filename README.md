# ProxyDi

[![Coverage Status](https://coveralls.io/repos/github/proxy-di/proxydi/badge.png)](https://coveralls.io/github/proxy-di/proxydi)

A typed hierarchical DI container that resolves circular dependencies via Proxy.

Core features:

- Uses Stage 3 decorators, supported in TypeScript 5.x ([examples repository](https://github.com/proxy-di/node-ts-examples)) and Babel via babel-plugin-proposal-decorators ([examples repository](https://github.com/proxy-di/node-babel-examples))
- Automatically resolves circular dependencies with no persormance impact
- Resolves dependencies in the context of a particular container
- Matches dependencies by unique identifiers or automatically using class names and property names
- Currently under active development, the API may change until version 0.1.0

# Quick start

Install the `proxydi` package in your JavaScript or TypeScript project:

```shell
npm i proxydi
```

## TypeScript set up

If you are using TypeScript, ensure that `experimentalDecorators` is set to `false` in your `tsconfig.json`. This enables support for Stage 3 decorators:

```jsonc
// tsconfig.json
{
    "compilerOptions": {
        // ...
        "experimentalDecorators": false,
        "strictPropertyInitialization": false,
    },
    //...
}
```

Changing `strictPropertyInitialization` is not necessary, but if you leave it at the default value, you will need to slightly modify the examples. More about this later.

## Babel set up

For Babel projects, ensure that @babel/plugin-proposal-decorators is configured exactly as follows:

```jsonc
// .babelrc
{
    // ...
    "plugins": [
        // other plugins
        ["@babel/plugin-proposal-decorators", { "version": "2023-11" }],
    ],
}
```

## Usage

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
console.log(actor.play());
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

In this example, we changed the behavior of the actor by changing the role dependency in the ProxyDi container. This is the goal of the [Dependency inversion principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle) in SOLID. Continuing our metaphor, the actor can play any role, but he is not the one who decides which role he will play. This is a film director's decision, and here we just cosplay him by setting up our containers.

So, ProxyDi is just a tool to link dependencies. And nothing more.

# Circular dependencies

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
        // Here, the actor asks the director how to perform the line.
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

In traditional DI containers, this scene would be tricky to shoot - the Director calls Actor's methods while Actor simultaneously needs Director's guidance. But ProxyDi handles it elegantly using JavaScript Proxies, without any worries on your part.

### Rewriting dependencies

By default, ProxyDi doesn't allow rewriting dependencies in the container. After a dependency becomes known to the container, any attempt to register a new dependency with the same dependency ID will throw an Error:

```typescript
const container = new ProxyDiContainer();
container.newDependency(Actor, 'Actor');
container.newDependency(Actor, 'Actor'); // !!! Error here
```

However, there is an option that allows you to do these kinds of things:

```typescript
const container = new ProxyDiContainer({ allowRewriteDependencies: true });
container.newDependency(Actor, 'Actor');

const actor = container.resolve<Actor>('Actor');
const wrapper = new ActorWrapper(actor);

container.registerDependency(wrapper, 'Actor'); // No error is thrown here now
```

## Injection proxy performance

As mentioned before, ProxyDi uses `Proxy` for each field marked by the @inject() decorator. This makes it possible to resolve circular dependencies. By default, these proxies are replaced by the actual dependency instances from the container during their first use, so the performance impact on your application is minimal.

However, if you allow rewriting dependencies in the container, these proxies remain in use to keep injections updated. As a result, every time you access a dependency field, there is a significant performance impact. In our tests, property access via Proxy is up to 100 times slower. For this reason, we recommend not allowing rewriting dependencies in production and keeping the container’s default behavior.

## Baking injections

There is a container method `bakeInjections()` that bakes all injections and freezes the current container’s dependencies. After calling this method, the container will deny any attempts to rewrite dependencies. It also bakes the dependencies in all its children.

After the container has been baked, the performance impact becomes zero. Therefore, you should use this method even for containers with default settings, ensuring that your application don't have to wait for the first use of each injection before they are baked.

To be continued...
