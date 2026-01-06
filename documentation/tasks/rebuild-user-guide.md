### Rewrite User Documentation with Simplified Syntax

For this refactoring, we chose a theater metaphor. Well, that is, imagine there is a theater building; productions are held in this building. Well, for the audience in the same building, actors and directors work and prepare these productions there. Well, there... Uh... Cringe: And... Well, like, this metaphor allows us to describe the hierarchical structure, the nature of this library. And based on this metaphor, we are making the documentation.

Well, because the previous documentation started to be written when there wasn't this new syntax and inject yet. And so you had to insert IDs manually. And like, the whole stage looked... A bit outdated. Now everything has been simplified. And the idea is that... This documentation needs to be reworked, and along the way, we also redesigned the metaphor.

**Goal:** Radically simplify the entry barrier by showcasing the simplest syntax first.

**Approach:**
- Show examples without explicit dependency IDs as the primary usage pattern
- Start with simple cases where class names are sufficient
- Most use cases don't need custom IDs - this should be the main message
- Move complex cases (multiple instances of same class with different IDs) to advanced section near the end

## Documentation Structure

**Part 1: Core Concepts** (main functionality):
- Basic dependency injection
- Circular dependencies
- Independent containers
- Hierarchical containers (parent-child resolution)

**Part 2: Technical Details** (edge cases and optimizations):
- Container settings
- Custom dependency IDs (multiple instances of same class)
- resolveAll (manual iteration through hierarchy)
- Performance and baking
- Advanced features (ON_CONTAINERIZED, Middleware)

## Example: Hierarchical Containers with Director

**Example to add in Hierarchical Containers section:**

Demonstrates pulling child dependencies when resolving a parent dependency:

- Parent container (Theater) contains Director
- Director has a Script dependency
- Child container (HamletProduction) contains a specific Script named "Hamlet"
- When we pull the Director from the child container, they automatically receive the Script from that child container

In other words: two entities, two containers (one nested in the other), and the top entity (Director) gets access to the entity from the child container (Script) when we pull it from that child container.

## Tasks

- [ ] Use ID-less syntax in Part 1 examples where natural
- [ ] Keep Hierarchical Containers in Part 1
- [ ] Add Director/Actor hierarchy example to Hierarchical Containers section
- [ ] Move resolveAll to Part 2
- [ ] Remove console.log from examples
- [ ] Ensure all code examples work without modifications

---

## Context for AI Agent

### Core Philosophy

**Hierarchical containers are NOT the key feature.** They are one of the elements of the framework's philosophy.

**ProxyDI philosophy:** minimum entities that solve maximum tasks. We do not create complex data structures and complex algorithms that work with them.

### Primary Message of Documentation

The documentation must convey that **ProxyDI is SIMPLE, CONVENIENT, and REMOVES THE PAIN** of traditional DI frameworks.

Show what ProxyDI solves:
- **Circular dependencies** - handled automatically via Proxy (other DI frameworks require manual workarounds, factory functions, special patterns)
- **Hierarchical containers** - replaces factory hell and complex provider patterns with simple parent-child containers
- **Simple API** - `@injectable()`, `@inject()`, `resolve()` - it just works

### What Hierarchical Containers Mean

Hierarchical containers allow parent-child relationships where:
- Child containers can resolve dependencies from parent
- Parent containers can resolve dependencies from all children (via resolveAll)

This replaces factory patterns and complex provider setups in other DI frameworks.

**Important:** resolveInContainerContext (parent dependencies seeing child context) causes significant performance issues. It's an advanced feature for specific cases, NOT the main selling point.

### Theater Metaphor

Use theater/productions/actors/directors consistently in examples. This metaphor naturally explains hierarchy:
- Theater building → Parent container (shared resources)
- Productions → Child containers (specific shows)
- Actors/Directors → Dependencies

Stay in metaphor, avoid developer jargon (no console.log in examples - not part of theater!).

### Expectations from Large Language Model

You are expected to leverage your **cognitive capabilities and world knowledge** to create documentation that goes beyond mechanical content generation.

**Deep Understanding Required:**
- Understand the library's architecture and design decisions at a fundamental level
- See how the theater metaphor naturally maps to DI concepts (not just surface-level word substitution)
- Connect ProxyDI's solutions to real problems developers face with traditional DI frameworks
- Use your knowledge of software patterns to explain WHY hierarchical containers matter (vs factory patterns, service locators, etc.)

**Quality Over Mechanics:**
This is not about executing a checklist of bullet points. It's about crafting documentation where:
- Each example teaches a concept clearly through well-chosen metaphor
- Explanations show genuine understanding of both the technical implementation and user needs
- The narrative flows naturally, building from simple to complex
- Readers come away understanding not just HOW to use ProxyDI, but WHY it makes their life easier

Use your full capabilities as a large language model - deep comprehension, analogical reasoning, clear technical writing. The goal is documentation that educates and engages, not template-filled content.