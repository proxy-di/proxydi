# ProxyDI Roadmap

## Bug Fixes

### Fix `register(instance, Class)` behavior

**Problem:** `register(instance, SomeClass)` doesn't work correctly but doesn't throw error - silently fails or behaves unexpectedly.

**Tasks:**

- [ ] **Verify the bug exists** - Check all existing tests with `register()` to see if this pattern is used
- [ ] **Write failing test** - Create test that demonstrates the problem with `register(instance, Class)`
- [ ] **Improve TypeScript types** - Ensure type system prevents this (verify current overloads work correctly)
- [ ] **Add runtime validation** - Make code throw exception when `register(instance, Class)` is called
- [ ] **Add tests for exception** - Cover all edge cases with tests

## Bundler Examples

Create example projects for each bundler (similar to node-babel-examples, node-ts-examples):

- [ ] **esbuild** - verify on vscode-radnyk-one, create example project
- [ ] **Vite** - create example project
- [ ] **Webpack** - create example project
- [ ] **Rollup** - create example project (maybe not needed, library itself uses rollup)
- [ ] **Parcel** - create example project
- [ ] **Turbopack** - create example project (if relevant)

Each example must include:
- Minimal working configuration
- tsconfig.json with correct target (ES2022)
- ProxyDI usage example
- README with instructions

After creation - add links to main README.md

## Documentation Website

### Migration to Nextra (Next.js)

- [ ] Install and configure Nextra
- [ ] Migrate content from README.md
- [ ] Integrate TypeDoc API generation with Nextra
- [ ] Update GitHub Actions for Nextra deployment
- [ ] Add ProxyDi logo to navigation

### Content Expansion

- [ ] Interactive examples (CodeSandbox/StackBlitz)
- [ ] Playground for code experiments
- [ ] More tutorials and use cases
- [ ] Comparison with other DI containers (InversifyJS, TSyringe, Angular DI)

### Design Improvements

- [ ] Custom theme with brand colors
- [ ] Animations and interactivity
- [ ] Better code examples styling

### SEO and Metadata

- [ ] Meta tags for social media (Open Graph, Twitter Cards)
- [ ] Sitemap
- [ ] Analytics
