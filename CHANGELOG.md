# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [[0.0.13](https://www.npmjs.com/package/proxydi/v/0.0.13)] - 2025-03-04

### Added

- inject, resolve register by class [#15](https://github.com/proxy-di/proxydi/pull/15)

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
