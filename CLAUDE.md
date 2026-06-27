# CLAUDE.md

## Overview

## UI Guidelines

- Use **Mantine** (`@mantine/core`, `@mantine/hooks`) components for all UI. Prefer built-in Mantine components over building custom ones.
- Use **`@phosphor-icons/react`** for icons.
- Avoid custom CSS. Use Mantine's built-in style props (`p`, `px`, `h`, `w`, `gap`, `justify`, `align`) and inline `style` objects only when Mantine props are insufficient. Do not create `.module.css` files for layout or cosmetic concerns that Mantine already covers.

## Commands

```bash
# Development
npm run tauri dev       # Start full Tauri dev environment
npm run dev             # Vite dev server only (no Tauri shell)

# Build
npm run tauri build     # Production build
npm run build           # TypeScript check + Vite build only

# Linting & Formatting
npm run lint            # ESLint
npm run format          # Prettier

# Testing
npm run test            # Vitest unit tests
npm run coverage        # Coverage report

# Rust backend only
cd src-tauri && cargo test
cd src-tauri && cargo clippy
```

`npm run prepare` installs husky and sets up Rust tools (rustfmt, clippy, sqlx-cli) — run once after cloning.

## Backend Architecture (`src-tauri/src/`)

The backend follows **onion architecture** (Clean Architecture) with custom dependency injection.

### Layers (inner → outer)

| Layer          | Directory                                         | Role                                                                    |
| -------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| Domain         | `entities/`, `value_objects/`                     | Pure data models, no I/O                                                |
| Application    | `services/`                                       | Reusable business logic; keeps presentation handlers thin               |
| Presentation   | `api/`                                            | Tauri command handlers; resolves dependencies and delegates to services |
| Infrastructure | `repositories/infrastructure/`, `infrastructure/` | SQLite, HTTP clients                                                    |

### Dependency Injection

A custom `injector` crate (with derive macros in `injector_derive`) wires everything together. Services are registered in `common/utils/create_injector.rs`. Every Tauri command handler follows this pattern:

```rust
#[tauri::command]
async fn some_command(injector: State<'_, Arc<Injector>>, ...) -> Result<Dto, ApiError> {
    let scope = injector.start_scope();
    let service = scope.resolve::<dyn SomeService>();
    let result = service.do_work(...).await?;
    scope.save_changes().await?;  // Unit of Work — commits DB transaction
    Ok(result)
}
```

### Domain Modules

- **fsrs** — Spaced repetition profiles (FSRS algorithm config)
- **backend** — Remote auth (sign-up, sign-in, etc.)
- **secrets** — `SecretsRepository` trait for reading/writing OS-level secrets; keyring implementation lives in `infrastructure/repositories/keyring/`
- **settings** — User preferences
- **sync** — Cloud sync via protobuf messages
- **backup** — Background auto-backup service

### Naming Conventions

- DTOs: `*RequestDto`, `*ResponseDto` (used at the API boundary)
- Entities: plain struct names
- Repository traits live in `repositories/`, implementations in `repositories/infrastructure/sqlite/`
- Error types use `thiserror`; all commands return `Result<T, ApiError>`

### Element Duplication

Elements (`Folder`, `Reading`, `Extract`, `Card`) share significant structure — all implement `Element` (for `meta`) and `Tagged` (for `tags`); `Extract` and `Card` also implement `Derived` (for `parent`). Avoid duplicating logic that can be expressed through these traits:

- Use `element.meta()` (via `Element`) instead of repeating `element.meta.id / .name / .position` patterns across element types.
- Use `tag_strings(tagged)` or equivalent helpers rather than inlining `.tags().iter().map(|t| t.to_string()).collect()` per element.
- Use `ExtractParent::from_type_and_id` / `CardParent::from_type_and_id` and their `type_str()` / `id()` methods instead of repeating the `"reading" / "extract" / "folder"` match arms. `Extract` uses `ExtractParent` (Reading | Extract | Folder); `Card` uses `CardParent` (Reading | Extract | Folder).
- Use generic helpers for patterns that repeat over different element types.

## Frontend Architecture (`src/`)

**React 19** with Redux Toolkit, React Router 7, and Vite.

### Key Directories

- `api/` — Typed wrappers around `invoke()` calls, mirroring backend modules
- `features/` — Route-scoped feature modules (Editor, Reviewer, Home, AiChatWidget, FileTree, etc.)
- `stores/` — Redux slices: `fileSystem`, `user`, `sync`, `settings`, `app`
- `hooks/` — Reusable hooks; notably `useApi` for loading/error state around API calls
- `utils/`, `config/`, `types/` — Helpers, constants, shared types

### Routing

Routes are defined in `src/router.tsx`. For type-safe navigation and param reading:

- **Navigate** using builders from `src/paths.ts` (e.g. `paths.element(type, id)`) — never interpolate route strings manually.
- **Read params** using `useElementParams()` from `src/hooks/useElementParams.ts` — returns `ElementId | null`, never call `useParams()` directly.
- When adding a new route, add a builder to `paths.ts` and update `useElementParams` if the route has params.

### Data Flow

1. Component calls a typed wrapper from `src/api/`
2. Wrapper calls `invoke("command_name", params)` (Tauri IPC)
3. Backend handler runs and returns `Result<ResponseDto, ApiError>`
4. Errors surface via `ApiError`; success updates local or Redux state

The `useApi` hook standardizes async calls.

### Rich Text

The editor uses **Lexical**. Cell content is stored and transferred as Lexical JSON.

### CSS Naming Conventions

CSS Modules are used throughout the frontend. Class names use kebab-case in `.module.css` files and camelCase when referenced in TypeScript/TSX:

```css
/* styles.module.css */
.my-class-name { ... }
```

```tsx
// Component.tsx
<div className={styles.myClassName} />
```

## Testing Conventions

These conventions apply to both Rust (`src-tauri/`) and TypeScript (`src/`) tests.

### Naming

- **Rust:** function names follow `MethodName_Scenario_ExpectedResult` in `snake_case`, e.g. `set_content_on_cloze_added_new_repetitions_correctly`
- **TypeScript:** the string passed to `it()` follows `Should <expected behavior> when <input>`, e.g. `"Should return null when id is invalid"`

### Structure

Each test is divided into three sections using AAA comments, with a blank line between each section:

```rust
#[test]
fn method_name_scenario_expected_result() {
    // Arrange

    let input = ...;

    // Act

    let actual = subject.method(input);

    // Assert

    assert_eq!(expected, actual);
}
```

```typescript
it("Should <expected behavior> when <input>", () => {
    // Arrange

    const input = ...;

    // Act

    const actual = subject.method(input);

    // Assert

    expect(actual).toBe(expected);
});
```

### File locations

- Rust: inline `#[cfg(test)] mod tests { ... }` at the bottom of the source file
- TypeScript: `src/__test__/` mirroring the source tree

## Adding a Feature

1. **Backend:** Add entity/DTO → repository trait + SQLite impl → service → register in `create_injector.rs` → expose as Tauri command in `api/`
2. **Frontend:** Add typed wrapper in `src/api/` → build UI in the appropriate `features/` module → dispatch to Redux if global state is needed
