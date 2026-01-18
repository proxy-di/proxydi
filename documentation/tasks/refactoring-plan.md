Refactoring plan for 0.4.x version:

- ~~resolveAll() as container method~~

- ~~scope to resolve() and isKnown()~~

    - Current+Parent by default

- ~~remove allowRegisterAnything option~~

    - allow register anything always

- ~~scope to @inject()~~

    - the same logic as in resolve() method

- Split ResolveScope.Parent to ResolveScope.DirectParent and ResolveScope.FistAncestor

- ~~replace resolveInContainerContext option by contextResolve() method~~

- polish baking:

    - remove public direct baking method
    - remember all baked instances to:
        - replace them by proxy after removing baked instance
        - replace baked instance in hierarchy if added new instance clother to client (depends on injected scope)

- remove allowRewriteDependencies

    - register() always throws Error if dependency already exists
    - new replace() method as syntax sugar for remove()-register() chain

- dependencies aliases:

    - strict separating between dependencyId and aliasId
    - aliases to @injectable() and register()
    - allow many dependencies by one aliasId
    - resolve first alias in @inject() and resolve()

- remove container settings

- add iniitialize() function to container constructor()
  const rootContainer = new ProxyDiContainer({initializer: (container) => {
  container.register(UserService);
  container.register(AuthService);
  }})

- rebranding aka rename:
  @inject() to @resolve()
  @injectAll to @resolveAll() (and remove current separaete resolveAll function)
  @injectable() to @register()/resolvable()

- make injectDependenciesTo() private?
