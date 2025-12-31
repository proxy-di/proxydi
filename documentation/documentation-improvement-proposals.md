# Пропозиції щодо покращення документації ProxyDI

На основі аналізу коду, тестів та реального досвіду використання бібліотеки в проекті vscode-radnyk-one.

---

## 1. Додати секцію про Modern Bundlers конфігурацію

**Де:** Після секції "Configure Babel" (рядок 65 в README.md)

**Проблема:**

- При використанні ProxyDI в проектах з esbuild/Vite/Webpack декоратори не працюють без правильного target
- В документації є тільки TypeScript та Babel, але нічого про bundlers

**Що додати:**

````markdown
### Modern Bundlers (esbuild, Vite, Webpack)

When using ProxyDI with modern bundlers like esbuild, Vite, or Webpack, ensure your `tsconfig.json` has the correct target:

```jsonc
// tsconfig.json
{
    "compilerOptions": {
        "target": "ES2022", // Required for Stage 3 decorators
        "experimentalDecorators": false,
        // ...
    },
}
```
````

**Why ES2022?** Stage 3 decorators require ES2022 or higher. Lower targets (like ES2016) will cause runtime errors or decorator malfunction.

**esbuild configuration example:**

```js
esbuild.build({
    target: 'es2022', // Must match tsconfig
    // ...
});
```

Without proper target configuration, you may encounter errors like:

- `Cannot read properties of undefined`
- Decorators not being applied
- Container unable to resolve dependencies

````

**ПЕРЕД ДОДАВАННЯМ В ДОКУМЕНТАЦІЮ - ТРЕБА ЗРОБИТИ:**

1. **Перевірити конфігурації для кожного bundler:**
   - esbuild - перевірити на проекті vscode-radnyk-one (вже працює)
   - Vite - створити тестовий проект, перевірити що працює з `target: "ES2022"`
   - Webpack - створити тестовий проект, перевірити конфігурацію

2. **Створити приклади проектів:**
   - Аналогічно до `node-babel-examples` та `node-ts-examples` (які є в workspace)
   - Створити окремі репозиторії або папки з прикладами для кожного bundler
   - Кожен приклад має містити:
     - Мінімальну робочу конфігурацію
     - Приклад використання ProxyDI з декораторами
     - README з інструкціями

3. **Додати посилання в документацію:**
   - В README.md додати посилання на приклади проектів (як зараз є для React/Babel)
   - Формат: "For [bundler name] projects, see [examples repository](link)"

4. **Перевірити edge cases:**
   - Що відбувається з нижчим target (ES2016, ES2020)?
   - Які конкретно помилки виникають?
   - Чи потрібні додаткові налаштування крім target?

**Обґрунтування:**
Це критична інформація з реального досвіду. В проекті vscode-radnyk-one саме це було проблемою. Але перед додаванням в документацію треба перевірити що конфігурації працюють для всіх популярних bundlers, а не тільки для esbuild.

---

## 2. Пояснити resolveInContainerContext з performance implications

**Де:** Розділ "Hierarchy of containers", після рядка 563

**Проблема:**
- Є приклад використання (тести 526-563), але не пояснено ЧОМУ це не за замовчуванням
- Користувачі не розуміють trade-offs та performance cost
- Не очевидно коли використовувати цю опцію

**Що додати:**

```markdown
### Performance consideration: resolveInContainerContext

By default, when a child container resolves a dependency from its parent, the dependency uses injections from the parent container:

```typescript
const parent = new ProxyDiContainer();
parent.register(First, 'first');

const child = parent.createChildContainer();
child.register(Second, 'second');

const firstFromChild = child.resolve<First>('first');
// firstFromChild.second throws "Unknown dependency"
// Parent doesn't know about 'second'
````

To resolve parent dependencies with child-specific injections, enable `resolveInContainerContext`:

```typescript
const parent = new ProxyDiContainer({ resolveInContainerContext: true });
parent.register(First, 'first');

const child = parent.createChildContainer();
child.register(Second, 'second');

const firstFromChild = child.resolve<First>('first');
// firstFromChild.second works - uses injections from child
```

**Why is this not default?**

- Creates an additional **Proxy** for each parent dependency resolved from a child (see `ProxyDiContainer.ts:273`)
- This Proxy is **never baked** - it permanently intercepts property access
- Stored in `inContextProxies` and remains active for the container's lifetime
- Significant performance cost compared to default behavior
- Use only when you need context-specific dependency resolution (e.g., multiple children with different implementations of the same dependency)

**When to use:**

- Multiple child containers need different implementations of the same parent dependency
- Building hierarchical features with context-specific behavior (e.g., multi-tenant applications)

**When NOT to use:**

- Simple parent-child relationship where children only add new dependencies
- Performance-critical applications
- Most common use cases (default behavior is usually sufficient)

````

**Обґрунтування:**
З коду видно що це створює постійний Proxy overhead. Користувачі повинні розуміти ціну цієї опції.

---

## 3. Пояснити обмеження register() для instances

**Де:** Розділ "Injectable classes", після рядка 307

**Проблема:**
- Користувачі намагаються `register(instance, SomeClass)` і отримують TypeScript помилку
- Не зрозуміло чому це не працює і як правильно робити
- В тестах є приклади, але без пояснення

**Що додати:**

```markdown
### Registering instances vs classes

When registering a **class**, the dependency ID is optional (uses class name by default):

```typescript
container.register(GameEngine);           // ✅ ID = 'GameEngine'
container.register(GameEngine, 'engine'); // ✅ ID = 'engine'
````

When registering an **instance**, dependency ID is **required** and must be a `string` or `symbol`:

```typescript
const engine = new GameEngine();
container.register(engine, 'engine'); // ✅ Works
container.register(engine, GameEngine); // ❌ TypeScript error
```

**Why this restriction?**

The `register()` method has two overloads (see `ProxyDiContainer.ts:120-127`):

```typescript
// Overload 1: Register class (ID optional)
register<T>(DependencyClass: DependencyClass<T>, dependencyId?: DependencyId): T

// Overload 2: Register instance (ID required, Class forbidden)
register<T>(
    dependency: T extends new (...args: any[]) => any ? never : T,
    dependencyId: DependencyId
): T
```

The second overload uses TypeScript conditional type to reject constructors as `dependencyId`. This design prevents ambiguity - ProxyDi needs to clearly distinguish between "create instance from class" and "register existing instance".

**Correct patterns:**

```typescript
// Pattern 1: Register class, use class name as ID
container.register(Service);

// Pattern 2: Register class with custom ID
container.register(Service, 'myService');

// Pattern 3: Register instance with string ID
const service = new Service();
container.register(service, 'myService');

// Pattern 4: Register instance with symbol ID
const SERVICE_ID = Symbol('service');
container.register(service, SERVICE_ID);
```

````

**Обґрунтування:**
Це реальна проблема з якої користувачі стикаються при використанні бібліотеки. TypeScript помилка не пояснює WHY.

---

## 4. Розширити пояснення Constructor injections

**Де:** Experimental features список, замість рядка 19

**Проблема:**
- Просто відсилання "see unit tests for examples"
- Не пояснено як працює, навіщо потрібно, які обмеження
- Не згадано про performance overhead
- Користувачі не розуміють різницю між `@inject` полями та constructor parameters

**Що змінити:**

Замість:
```markdown
- Construtor injections (see unit tests for examples)
````

На:

```markdown
- **Constructor injections:** Dependencies can be injected via constructor parameters using `@injectable` decorator with dependency IDs array. Example: `@injectable(['Dep1', 'Dep2'])`. **Important:** Constructor parameters use Proxy that is never replaced with actual instances (unlike `@inject` fields which auto-bake after first use). Consider using field injections for better performance. See `ProxyDiContainer.test.ts:731-773` for examples.
```

**Додатково** - Додати нову секцію після "Injectable classes":

````markdown
## Constructor Injections

**Note:** This is an experimental feature. We recommend using field injections (`@inject`) in most cases.

Dependencies can be injected via constructor parameters:

```typescript
@injectable(['Fiancée'])
class Fiancé {
    name = 'John';
    constructor(public readonly fiancee: Fiancée) {}
}

@injectable(['Fiancé'])
class Fiancée {
    name = 'Mary';
    constructor(public readonly fiance: Fiancé) {}
}

const container = new ProxyDiContainer();
const john = container.resolve(Fiancé);
// john.fiancee.name === 'Mary'
```
````

**How it works:**

1. `@injectable(['Dep1', 'Dep2'])` registers dependency IDs in `constructorInjections` map
2. When creating instance, ProxyDi creates `makeConstructorDependencyProxy` for each parameter
3. These proxies resolve dependencies on first property access

**Performance implications:**

Constructor injection proxies are **never replaced** with actual instances (see `makeConstructorDependencyProxy.ts`). Unlike field injections which auto-bake after first use, constructor parameters remain as Proxies permanently.

```typescript
// Field injection (recommended) - auto-bakes
class Service {
    @inject('dep') dep: Dependency; // Proxy → replaced with actual instance
}

// Constructor injection - permanent Proxy
@injectable(['dep'])
class Service {
    constructor(public dep: Dependency) {} // Proxy forever
}
```

**Recommendation:** Use field injections (`@inject`) unless you have a specific reason to use constructor parameters. Field injections provide better performance and are easier to reason about.

See `ProxyDiContainer.test.ts:731-773` for complete examples.

````

**Обґрунтування:**
Це важливо для розуміння trade-offs. Код в `makeConstructorDependencyProxy.ts` показує що це permanent Proxy, на відміну від `makeInjectionProxy.ts` де є auto-baking.

---

## 5. Додати документацію про ON_CONTAINERIZED

**Де:** Після секції "Injectable classes", перед "Rewriting dependencies"

**Проблема:**
- Згадується в experimental features але ВЗАГАЛІ не пояснено
- Не зрозуміло що це, навіщо, як використовувати
- В коді є використання (`ProxyDiContainer.ts:167`) але без документації

**Що додати:**

```markdown
## ON_CONTAINERIZED Hook

Dependencies can implement an `[ON_CONTAINERIZED]` method that is called when the dependency is registered in a container:

```typescript
import { ON_CONTAINERIZED, ProxyDiContainer } from 'proxydi';

class Database {
    private connectionPool?: any;

    [ON_CONTAINERIZED](container: ProxyDiContainer) {
        console.log(`Registered in container ${container.id}`);
        // Initialize connection pool based on container context
        const config = container.resolve<Config>('config');
        this.connectionPool = createPool(config.dbUrl);
    }
}

const container = new ProxyDiContainer();
container.register(Database, 'db');
// → "Registered in container 0"
// → Database connection pool initialized
````

**When to use:**

- Dependency needs to access other dependencies from the same container during registration
- Setup/initialization logic that depends on container context
- Different initialization for different containers in a hierarchy

**Lifecycle:**
The hook is called:

- After the dependency is registered in the container (`ProxyDiContainer.ts:167`)
- After `[PROXYDI_CONTAINER]` and `[DEPENDENCY_ID]` are set
- Before field injections are applied

**Important:** This is an experimental feature. API may change in future versions.

````

**Обґрунтування:**
Це корисна фіча яка взагалі не задокументована. З коду (`types.ts:56`, `ProxyDiContainer.ts:167`) видно як вона працює.

---

## 6. Додати базову документацію про Middleware

**Де:** Після секції "ON_CONTAINERIZED"

**Проблема:**
- Middleware згадується в experimental features
- Є тести (`ProxyDiContainer.test.ts:808-960`) але НУЛЬ документації
- Користувачі не знають що це і як використовувати

**Що додати:**

```markdown
## Middleware

**Note:** This is an experimental feature. API may change before v1.0.0.

ProxyDi supports middleware for intercepting dependency lifecycle events:

```typescript
import { middleware, MiddlewareContext } from 'proxydi';

@middleware()
class Logger {
    onRegister(context: MiddlewareContext<any>) {
        console.log(`[REGISTER] ${String(context.dependencyId)}`);
    }

    onResolve<T>(context: MiddlewareContext<T>): MiddlewareContext<T> {
        console.log(`[RESOLVE] ${String(context.dependencyId)}`);
        return context; // Can modify dependency here
    }

    onRemove(context: MiddlewareContext<any>) {
        console.log(`[REMOVE] ${String(context.dependencyId)}`);
    }
}

const container = new ProxyDiContainer();
container.resolve(Logger); // Auto-registers as middleware

container.register(Service, 'service');
// → [REGISTER] Logger
// → [REGISTER] service

container.resolve<Service>('service');
// → [RESOLVE] service
````

**Middleware methods:**

- `onRegister(context)` - Called when dependency is registered
- `onResolve(context)` - Called when dependency is resolved (can modify returned instance)
- `onRemove(context)` - Called when dependency is removed

**Middleware propagation:**
Middleware registered in a parent container automatically applies to all child containers.

**Advanced: Non-dependency middleware**

Middleware doesn't have to be a dependency itself:

```typescript
class CustomMiddleware implements MiddlewareResolver {
    onResolve<T>(context: MiddlewareContext<T>): MiddlewareContext<T> {
        // Modify all resolved dependencies
        return { ...context, dependency: wrapWithProxy(context.dependency) };
    }
}

const container = new ProxyDiContainer();
container.registerMiddleware(new CustomMiddleware());
```

**Examples:** See `ProxyDiContainer.test.ts:808-960` for complete middleware examples including resolution interceptors and dependency tracking.

````

**Обґрунтування:**
Middleware - це потужна фіча яка ВЗАГАЛІ не задокументована. Тести показують що вона добре працює.

---

## 7. Виправити/уточнити секцію "Injection proxy performance"

**Де:** Секція "Injection proxy performance", рядки 331-336

**Проблема:**
- Не згадується різниця між field injections (які bake-ються) і constructor injections (які ні)
- Не зрозуміло ЩО саме створює overhead
- Плутанина між різними типами Proxy

**Що змінити:**

Замінити абзац (рядки 331-336):

```markdown
As mentioned before, ProxyDi uses `Proxy` for each field marked by the @inject() decorator. This makes it possible to resolve circular dependencies. By default, these proxies are replaced by the actual dependency instances from the container during their first use, so the performance impact on your application is minimal.

However, if you allow rewriting dependencies in the container, these proxies remain in use to keep injections updated. As a result, every time you access a dependency field, there is a significant performance impact. In our tests, property access via Proxy is up to 100 times slower. For this reason, we recommend not allowing rewriting dependencies in production and keeping the container's default behavior.
````

На:

````markdown
ProxyDi uses `Proxy` objects to enable circular dependency resolution. Understanding when these proxies are used is important for performance:

**Field injections (`@inject`)** - Auto-baking (default behavior):

```typescript
class Service {
    @inject('dep') dependency: Dependency; // Proxy initially
}

const service = container.resolve<Service>('service');
service.dependency.someMethod(); // First access: Proxy → replaced with actual instance
service.dependency.anotherCall(); // Subsequent access: direct instance access (no Proxy)
```
````

After first use, the proxy is replaced with the actual instance (`makeInjectionProxy.ts:30-32`). Performance impact is minimal.

**Constructor injections** - Permanent Proxy:

```typescript
@injectable(['dep'])
class Service {
    constructor(public dependency: Dependency) {} // Proxy forever
}
```

Constructor parameters remain as Proxy objects permanently (see `makeConstructorDependencyProxy.ts`). Every property access goes through Proxy.

**Rewritable dependencies** - Permanent Proxy:

```typescript
const container = new ProxyDiContainer({ allowRewriteDependencies: true });
// All @inject fields remain as Proxies to support dynamic updates
```

When dependencies can be rewritten, field injection proxies are never baked. This ensures injections stay updated but costs performance.

**Performance impact:**
In our tests, property access via Proxy is ~100x slower than direct access. For production:

- ✅ Use default settings (auto-baking enabled)
- ✅ Call `bakeInjections()` to freeze and optimize all injections
- ✅ Prefer field injections over constructor injections
- ❌ Avoid `allowRewriteDependencies: true` in production

```

**Обґрунтування:**
Код показує що є три різні сценарії з різним performance behavior. Користувачі повинні це розуміти.

---

## Підсумок

### Критичні зміни (must-have):
1. ✅ **Modern Bundlers (esbuild)** - без цього бібліотека не працює в реальних проектах
2. ✅ **resolveInContainerContext** - користувачі не розуміють чому не за замовчуванням і коли використовувати
3. ✅ **register(instance, Class)** - частая помилка, незрозуміла TypeScript помилка

### Важливі покращення:
4. ✅ **Constructor injections** - розширити пояснення + performance trade-offs
5. ✅ **Injection proxy performance** - уточнити різницю між різними типами Proxy

### Nice-to-have:
6. ✅ **ON_CONTAINERIZED** - корисна фіча без документації
7. ✅ **Middleware** - потужна фіча без документації

### Принципи з writing-documentation.md:
- ✅ Коротко і по суті - кожна секція фокусується на конкретній проблемі
- ✅ Чому саме так - пояснено архітектурні рішення (resolveInContainerContext, register overloads)
- ✅ Посилання на код - вказані конкретні файли та рядки
- ✅ Мінімум цитування коду - тільки ключові приклади

---

**Наступні кроки:**
1. Переглянути пропозиції
2. Застосувати зміни до README.md
3. Протестувати що приклади коректні
4. Можливо додати окремі MD файли для advanced topics (middleware, performance tuning)
```
