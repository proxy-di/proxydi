# How to Write User Documentation (README)

User documentation is [README.md](../README.md) at project root. For developers using ProxyDI in their projects.

## Language

English. International audience.

## Tone

Friendly and practical. Focus on helping users solve problems and get started quickly.

## Structure

1. **Quick Start** — minimal working example (3-5 steps maximum)
2. **Core concepts** — explain with practical examples, not theory
3. **Common use cases** — real-world scenarios
4. **Advanced features** — for users who need more control
5. **Troubleshooting** — common issues and solutions

## Writing Style

**Be concise but friendly.** If you can explain in one sentence — use one. But add context when needed.

**Use metaphors and analogies** to explain complex concepts:
```markdown
✅ Good: "Think of the container as a film director who decides which role each actor plays"
❌ Bad: "The container implements the dependency inversion principle"
```

**Show, don't just tell.** Every concept needs a working code example:
```markdown
✅ Good: [Concept explanation] + [Working code example]
❌ Bad: [Long explanation without code]
```

**Step-by-step for setup.** Installation and configuration must be copy-paste ready:
```markdown
✅ Good:
1. `npm i proxydi`
2. Set `experimentalDecorators: false` in tsconfig.json
3. Use `@inject()` decorator

❌ Bad: "Configure your build tools appropriately"
```

## Code Examples

- **Minimal** — only what's needed to understand the concept
- **Complete** — must run without modifications
- **Progressive** — start simple, add complexity gradually
- **Practical** — real use cases, not abstract Foo/Bar

**Good example structure:**
```typescript
// 1. Define what you need
interface Character {
    greet(): string;
}

// 2. Create implementation
class Agent007 implements Character {
    greet = () => 'Bond... James Bond';
}

// 3. Use with ProxyDI
const container = new ProxyDiContainer();
container.register(Agent007, 'Role');
```

## Links

Integrate links naturally into text:

```markdown
✅ Good: "ProxyDi [resolves circular dependencies](./docs/circular-deps.md) automatically"
❌ Bad: "ProxyDi resolves circular dependencies. See docs for details."
```

Link to:
- API documentation (TypeDoc) for reference
- Example repositories for working code
- Other sections of README for details

## What NOT to Include

- Implementation details (those go in developer docs)
- Performance benchmarks (unless critical for user decisions)
- Architectural explanations (unless they help users understand behavior)
- Source code references (users don't need to read source)

## Testing Documentation

Every code example in README should:
- Be tested in `readme.test.ts`
- Actually run and work
- Stay up-to-date with code changes

## Common Patterns

**Introducing a feature:**
1. What it does (one sentence)
2. Why you'd use it (practical scenario)
3. How to use it (code example)
4. Link to details (if complex)

**Explaining a concept:**
1. Analogy or metaphor
2. Simple code example
3. Build on it with more complex example
4. Link to API docs

## Reference

See [Radnyk One documentation guide](../../vscode-radnyk-one/docs/writing-documentation.md) for general documentation principles that also apply here.
