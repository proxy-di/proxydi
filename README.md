# ProxyDi

[![Coverage Status](https://coveralls.io/repos/github/proxy-di/proxydi/badge.png)](https://coveralls.io/github/proxy-di/proxydi)

A typed hierarchical DI container that resolves circular dependencies via Proxy.

<img src="https://github.com/proxy-di/proxydi/blob/main/assets/ProxyDiLogo.png?raw=true" width="196">

Core features:

- Uses Stage 3 decorators, supported in TypeScript 5.x ([examples repository](https://github.com/proxy-di/node-ts-examples)) and Babel via babel-plugin-proposal-decorators ([examples repository](https://github.com/proxy-di/node-babel-examples))
- Automatically resolves circular dependencies with no performance impact
- Resolves dependencies in the context of a particular container
- Supports hierarchical containers with the ability to resolve dependencies in both directions
- Currently under active development, the API may change until version 1.0.0

Experimental features:

- Construtor injections (see unit tests for examples)
- Middleware (see unit tests for examples)
- Matches dependencies by unique identifiers or automatically using class names and property names
- [ON_CONTAINERIZED]() method

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
   and fill it with dependencies using [register()](https://proxy-di.github.io/proxydi/classes/ProxyDiContainer.html#register) method. For example, let's define an agent 007 role and prepare our first container:

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

In this example, we changed the behavior of the actor by changing the role dependency in the ProxyDi container. This is exactly the goal of the [Dependency inversion principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle) in the SOLID approach to software design. Continuing our metaphor, the actor can play any role, but he is not the one who decides which role he will play. This is a film director's decision, and here we just cosplay him by setting up our containers.

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

But take a look, our approach is still the same - we just link dependencies with @inject and use them freely without any worries. ProxyDi handles this tricky issue as elegantly as possible. It does this using JavaScript Proxies, more about Proxies and their impact on performance [later](#injection-proxy-performance).

## Hierarchy of containers

Another tricky part of DI containers is the ability to create multiple instances of the same class. ProxyDi solves this problem in the simplest way possible - it just does not allow it. When you register a class as a dependency, there is only one instance of this class in the container.

Instead, it suggests you to use a hierarchy of containers by using [createChildContainer()](https://proxy-di.github.io/proxydi/classes/ProxyDiContainer.html#createchildcontainer) method. Child container inherits all parent settings and can resolve exactly the same dependencies as their parent (but parent container does not have access to dependencies registered in its children).

For example, imagine you are working on a game level, there are many characters on this level, and each character could have many perks.

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

### Resolving dependencies from parents

As a bonus, each bottom level dependency is free to use any dependency from the top just as if they were registered in its own container:

```typescript
class UnderwaterShield {
    @inject('level') private level: GameLevel;
    @inject('character') private character: Character;

    constructor(private amount: number) {}

    activate = () =>
        this.level.isUnderwater && (this.character.health += this.amount);
}
```

In this example, the shield perk increases character health if it is underwater. The perk receives both level and character using the @inject() decorator, the same way as we have seen so far.

### Resolving dependencies from children

Backward bonus of containers hierarchy, each top level dependency is free to use all dependency from the bottom:

```typescript
class Character {
    public health = 100;

    hit(abount: number) {
        this.health -= abount;

        const perks = resolveAll<Perk>(this, 'perk');
        perks.forEach((perk) => perk.activate());
    }
}
```

In this example, the character activates all its perks, which are registered in all children containers. The way it do this job need a little bit more explanation.

### Reference to the container

Here you should be wondering, how [resolveAll()](https://proxy-di.github.io/proxydi/functions/resolveAll.html) function knows about the container, to which character belongs. The answer - each time when dependency is registered in the ProxyDiContainer, it saves a reference to itself in this dependency instance. So, when you call resolveAll() function, it just takes this reference from the instance and then recursively resolves all asked dependencies from this container and all its children and children of children and so on.

Despite this explanation is a little bit complicated, the example is still simple, the character just activates all its perks.

## Injectable classes

Look at the following example:

```typescript
@injectable()
class GameEngine {
    start = () => console.log('Game started');
}

const container = new ProxyDiContainer();

const gameEngine = container.resolve(GameEngine);
gameEngine.start();
```

```shell
> Game started
```

Two things happen here:

1. We use the [@injectable()](https://proxy-di.github.io/proxydi/functions/injectable.html) decorator to mark the class as injectable. This allows us to resolve the dependency without registering it in the container.

2. To resolve the dependency instance, we pass the injectable class itself as the dependency identifier. This is possible because ProxyDi automatically uses the class name as the dependency identifier when none is explicitly provided. As an additional bonus, the `gameEngine` has a type `GameEngine`.

### Implicitly resolving injectable() dependencies

There are a few important nuances about the `@injectable()` decorator to keep in mind. The first is how these dependencies are resolved. Consider this example:

```typescript
const parent = new ProxyDiContainer();
const child = parent.createChildContainer();

const engine1 = child.resolve(GameEngine);
const engine2 = parent.resolve(GameEngine);

engine1 === engine2; // false
```

Here we create a hierarchy of containers and resolve the same dependency from the child container first and then from the parent container. The result is two different instances of the GameEngine class. This happens because during the first resolution, the child container doesn't find GameEngine in either itself or its parent container, so it creates a new instance and stores it in itself. When the parent container resolves GameEngine, it creates another instance since he knowns nothing about child depenencies

There are two ways to avoid this behavior:

1. Don't use the `@injectable()` decorator and always register dependencies explicitly
2. Use the `registerInjectables()` method to create instances for all injectable dependencies in the container. In this case every time when you resolve injectable dependency, you will get the same instance:

```typescript
const parent = new ProxyDiContainer().registerInjectables();
const child = parent.createChildContainer();

const engine1 = child.resolve(GameEngine);
const engine2 = parent.resolve(GameEngine);

engine1 === engine2; // true now
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

## Motivation

The world and software changes, they become more complex over time. But the main imperative in software development stays the same - managing the complexity. Despite the tendency that software is written more often by artificial intelligence than humans, complexity stays complexity. The less complex conceptions any kind of intelligence should operate, the more efficient it will be.

The main goal of ProxyDi is to decrease complexity in the very small field of connecting different entities of software code between each other, no matter by whom this code was written. This is my attempt to make the linking of dependencies as transparent and simple as possible for developers.

Also, I'm tired of moving this-like code from one project to another. I hope that ProxyDi will be a good enough solution for this problem not only for me. To be honest, this is the 4th attempt to create an "ideal" DI container and my 1st that uses Stage 3 decorators. I hope, this one will be the last one. With your help :) For TS/JS technology stack, of course!

## Contributing

Any reviews, comments, ideas, issues, and pull requests are welcome. Contribution documentation is not ready yet but is planned. Feel free to contribute even now though! :)

## License

This project is licensed under the terms of the MIT License. See the [LICENSE](./LICENSE) file for details.
