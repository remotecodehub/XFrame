# XFrame Agent Instructions

## Razor component/page CSS preservation

When editing any Razor page or component, preserve every existing style used by that file. Do not remove, overwrite, relocate, simplify, or regenerate existing CSS or responsive `@media` rules as a side effect of an unrelated change.

Page/component-specific CSS belongs in the same `.razor` file, inside a `<style>...</style>` block placed after the `@code { ... }` block. Preserve the complete existing block when editing the component, including selectors, pseudo-selectors, responsive rules and `@media` rules. Add new helper rules without deleting unrelated rules.

Do not create or depend on a `.razor.css` file as a workaround unless explicitly requested. Do not move component-specific CSS into `app.css`; `app.css` is reserved for genuinely global styles.

If a Razor file must be replaced programmatically, first retrieve its complete current content and reproduce all existing markup, styles and `@media` rules before applying the intended change.
