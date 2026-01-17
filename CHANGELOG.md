# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Added

- `ProxyDiContainer.resolveAll()` method for resolving multiple dependencies directly from container instance

- Added test coverage for Symbol-based dependency IDs with `@injectable`, `@inject`, and `@injectAll` decorators

## [[0.2.0](https://www.npmjs.com/package/proxydi/v/0.2.0)] - 2026-01-01

### Added

- `register()` now accepts class constructors as `dependencyId` - automatically normalized to class name
- `isKnown()` now accepts class constructors - automatically normalized to class name
- `register(instance)` without explicit `dependencyId` now works for class instances - uses `instance.constructor.name`

### Fixed

- Fixed bug where passing class constructor as `dependencyId` in `register()` would store dependency under function reference instead of class name, making it impossible to resolve with `resolve(Class)`

### Removed

- **BREAKING:** Constructor injection support removed from `@injectable` decorator. This experimental feature caused issues with circular dependencies and added unnecessary complexity. Use field injection with `@inject` decorator instead.

## [[0.1.3](https://www.npmjs.com/package/proxydi/v/0.1.3)] - 2025-03-26

### Added

- ON_CONTAINERIZED symbol to inform dependency was registered in container [#19](https://github.com/proxy-di/proxydi/pull/19)

## [[0.1.2](https://www.npmjs.com/package/proxydi/v/0.1.2)] - 2025-03-25

### Fixed

- Export MiddlewareContext

## [[0.1.0](https://www.npmjs.com/package/proxydi/v/0.1.0)] - 2025-03-25

### Changed

- Another middleware API [#16](https://github.com/proxy-di/proxydi/pull/16)

## [[0.0.13](https://www.npmjs.com/package/proxydi/v/0.0.13)] - 2025-03-04

### Added

- dependencies for @inject(), resolve() and register() by class [#15](https://github.com/proxy-di/proxydi/pull/15)

### Changed

- remove event requires dependency

## [[0.0.12](https://www.npmjs.com/package/proxydi/v/0.0.12)] - 2025-03-04

### Added

- Experimental @middleware [#14](https://github.com/proxy-di/proxydi/pull/14)

## [[0.0.11](https://www.npmjs.com/package/proxydi/v/0.0.11)] - 2025-03-03

### Added

- resolveInjectables() method [#13](https://github.com/proxy-di/proxydi/pull/13)

## [[0.0.10](https://www.npmjs.com/package/proxydi/v/0.0.10)] - 2025-03-02

### Changed

- Renamed @autoInjectable to @injectable

### Added

- Experimental constructor injections via @injectable decorator [#12](https://github.com/proxy-di/proxydi/pull/12)

## [[0.0.9](https://www.npmjs.com/package/proxydi/v/0.0.9)] - 2025-02-27

### Added

- resolveAll() function to find all dependencies of a given kind [#11](https://github.com/proxy-di/proxydi/pull/11)

## [[0.0.8](https://www.npmjs.com/package/proxydi/v/0.0.8)] - 2025-02-26

### Changed

- API improvements [#10](https://github.com/proxy-di/proxydi/pull/10)

### Added

- Added access to child containers
- PROXYDI_CONTAINER and DEPENDENCY_ID now public
- Enhanced hierarchy documentation

## [[0.0.7](https://www.npmjs.com/package/proxydi/v/0.0.7)] - 2025-02-21

### Added

- TypeDoc integration [#7](https://github.com/proxy-di/proxydi/pull/7)
- Action to publish documentation on GitHub Pages

## [[0.0.6](https://www.npmjs.com/package/proxydi/v/0.0.6)] - 2025-02-21

### Changed

- Improved API [#6](https://github.com/proxy-di/proxydi/pull/6)

## [[0.0.5](https://www.npmjs.com/package/proxydi/v/0.0.5)] - 2025-02-20

### Changed

- Baking dependencies [#5](https://github.com/proxy-di/proxydi/pull/5)
- 100% test coverage
- Changed API with new terminology

## [[0.0.4](https://www.npmjs.com/package/proxydi/v/0.0.4)] - 2025-02-11

### Changed

- Implemented proxy per instance instead of per container [#2](https://github.com/proxy-di/proxydi/pull/2)
- Ability to register anything as an instance
- Changed settings to object format
- Added settings presets

### Fixed

- Made injectables known

## [[0.0.3](https://www.npmjs.com/package/proxydi/v/0.0.3)] - 2025-02-07

### Added

- Draft DI-container implementation
- @injectable decorator
- Basic project setup with CI/CD
- Testing framework integration
- Basic package configuration
- Repository initialization
