# ProxyDi

[![Coverage Status](https://coveralls.io/repos/github/proxy-di/proxydi/badge.png)](https://coveralls.io/github/proxy-di/proxydi)

A typed hierarchical DI container that resolves circular dependencies via Proxy.

<img src="https://github.com/proxy-di/proxydi/blob/main/assets/ProxyDiLogo.png?raw=true" width="196">

Core features:

- Uses Stage 3 decorators, supported in TypeScript 5.x ([examples repository](https://github.com/proxy-di/node-ts-examples)) and Babel via babel-plugin-proposal-decorators ([examples repository](https://github.com/proxy-di/node-babel-examples))
- Automatically resolves circular dependencies with no persormance impact
- Resolves dependencies in the context of a particular container
- Matches dependencies by unique identifiers or automatically using class names and property names
- Currently under active development, the API may change until version 0.1.0

## Quick start

> If you are using React, you should use the React wrapper for ProxyDi instead of this library directly: [@proxydi/react](https://github.com/proxy-di/proxydi-react)

Install the `proxydi` package in your JavaScript or TypeScript project:

```shell
npm i proxydi
```

### Configure TypeScript

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

### Configure Babel

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

### Usage

> We will use TypeScript for all examples, because it is easier to remove typing than add it

The process of using ProxyDi consists of 3 stages:

1. Use the [@inject()](https://proxy-di.github.io/proxydi/functions/inject.html) decorator to define the dependencies to be resolved by the ProxyDi container. In this example, we define an interface for characters and ask ProxyDi to resolve the `Role` dependency for actors.

```typescript
interface Character {
    greet(): string;
}

class Actor {
    @inject('Role') role: Character;

    play = () => this.role.greet();
}
```

2. Next, create the [ProxyDiContainer](https://proxy-di.github.io/proxydi/classes/ProxyDiContainer.html)
   and fill it with dependencies using [register()](https://proxy-di.github.io/proxydi/classes/ProxyDiContainer.html#register) metod. For example, let's define an agent 007 role and prepare our first container:

```typescript
class Agent007 implements Character {
    greet = () => 'Bond... James Bond';
}

const container = new ProxyDiContainer();
container.register(Agent007, 'Role');
container.register(Actor, 'Actor');
```

3. At the last stage, take dependencies from the ProxyDi container by [resolve()](https://proxy-di.github.io/proxydi/classes/ProxyDiContainer.html#resolve) method and just use them. To continue our example, let our actor play its role:

```typescript
const actor = container.resolve<Actor>('Actor');
console.log(actor.play());
```

And the result is:

```shell
> Bond... James Bond
```

## The Reason

To illustrate why we should use a container for this simple purpose, let's create a container for another character and ask the actor to play the new role:

```typescript
class M implements Character {
    greet = () => '007, I have a new mission for you';
}

const container = new ProxyDiContainer();
container.register(M, 'Role');
container.register(Actor, 'Actor');

const actor = container.resolve<Actor>('Actor');
console.log(actor.play());
```

```shell
> 007, I have a new mission for you
```

In this example, we changed the behavior of the actor by changing the role dependency in the ProxyDi container. This is exactly the goal of the [Dependency inversion principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle) in SOLID approach to design software. Continuing our metaphor, the actor can play any role, but he is not the one who decides which role he will play. This is a film director's decision, and here we just cosplay him by setting up our containers.

> So, ProxyDi is just a tool to link dependencies, allowing them to freely communicate with each other without worrying about which specific dependency they're dealing with. And nothing more.

## Circular dependencies

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
container.register(Actor, 'Actor');
container.register(Director, 'Director');
container.register(Agent007, 'Role');

const actor = container.resolve<Actor>('Actor');
console.log(actor.play());
```

```shell
> Bond... James Bond!
```

In traditional DI containers, this scene would be tricky to shoot - the Director calls Actor's methods while Actor simultaneously needs Director's guidance.

But take a look, our approach is still the same - we just link dependencies by @inject and use them freely without any worries. ProxyDi handles this tricky issue as elegantly as is even possible. It does this using JavaScript Proxies, more about Proxies and theirs impact on perfomance [later](#injection-proxy-performance).

## Hierarchy of containers

Another tricky part of DI containers is the ability to create multiple instances of the same class. ProxyDi solves this problem in the simplest way possible - it just does not allow it. When you register a class as a dependency, there is only one instance of this class in the container.

Instead, it suggests you to use a hierarchy of containers by using [createChildContainer()](https://proxy-di.github.io/proxydi/classes/ProxyDiContainer.html#createchildcontainer) method. Child container inherits all parent settings and can resolve exactly the same dependencies as their parent (but parent container does not have access to dependencies registered in its children).

For example, imagine you are working on a game level, there are many characters on this level, each character could have many perks.

With ProxyDi we can present all these stuff in a hierarchy of containers. The most top container holds information about game level, the most bottom ones hold information about perks:

```typescript
const tutorialContainer = new ProxyDiContainer();
tutorialContainer.register(new GameLevel({ undewater: true }), 'level');

const heroContainer = tutorialContainer.createChildContainer();
const hero = heroContainer.register<Character>(Character, 'character');

const perksContainer = heroContainer.createChildContainer();
const perk = perksContainer.register(new UnderwaterShield(10), 'perk');
```

This is not how I propose to design games, ECS pattern does it better, but the goal was to demonstrate that with this approach instead of creating bunches of instances to represent your project entities, you can create bunches of containers each of them containing instances related to each other.

As a bonus, each bottom level dependency is free to use any dependency from the top:

```typescript
class UnderwaterShield {
    @inject('level') private level: GameLevel;
    @inject('character') private character: Character;

    constructor(private amount: number) {}

    initialize() {
        this.character.on('hit', this.act);
    }

    act = () =>
        this.level.isUnderwater && (this.character.health += this.amount);
}
```

## Rewriting dependencies

By default, ProxyDi doesn't allow rewriting dependencies in the container. After a dependency becomes known to the container, any attempt to register a new dependency with the same dependency ID will throw an Error:

```typescript
const container = new ProxyDiContainer();
container.register(Actor, 'Actor');
container.register(Actor, 'Actor'); // !!! Error here
```

However, there is an option that allows you to do these kinds of things:

```typescript
const container = new ProxyDiContainer({ allowRewriteDependencies: true });
container.register(Actor, 'Actor');

const actor = container.resolve<Actor>('Actor');
const wrapper = new ActorWrapper(actor);

container.register(wrapper, 'Actor'); // No error is thrown here now
```

### Injection proxy performance

As mentioned before, ProxyDi uses `Proxy` for each field marked by the @inject() decorator. This makes it possible to resolve circular dependencies. By default, these proxies are replaced by the actual dependency instances from the container during their first use, so the performance impact on your application is minimal.

However, if you allow rewriting dependencies in the container, these proxies remain in use to keep injections updated. As a result, every time you access a dependency field, there is a significant performance impact. In our tests, property access via Proxy is up to 100 times slower. For this reason, we recommend not allowing rewriting dependencies in production and keeping the container’s default behavior.

### Baking injections

There is a container method [bakeInjections()](https://proxy-di.github.io/proxydi/classes/ProxyDiContainer.html#bakeinjections) that bakes all injections and freezes the current container’s dependencies. After calling this method, the container restores behaviour by default and denies any attempts to rewrite dependencies. It also bakes the dependencies in all its children.

Therefore, after the container has been baked, the performance impact becomes zero. So, you could use this method even for containers with default settings, ensuring that your application doesn't have to wait for the first use of each injection before they are baked.

To be continued...

## License

This project is licensed under the terms of the MIT License. See the [LICENSE](./LICENSE) file for details.

## Contributing

Contribution documentation is not ready yet but is planned. Feel free to contribute even now though! :)
