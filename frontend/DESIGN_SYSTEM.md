# College CMS — Design System

Chosen with the `ui-ux-pro-max` skill (LMS / education product type), adapted to a green palette.

## Style
Flat + Minimalism/Swiss. Clean surfaces, generous spacing, high contrast. Density ~7/10 (compact tables and forms, readable). Motion is subtle (150–300 ms colour/opacity/transform only) and disabled under `prefers-reduced-motion`.

## Typography
- Headings: **Lexend** (`font-heading`, applied to h1–h4 automatically)
- Body: **Source Sans 3** (`font-sans`)
- Use `tabular-nums` for numeric columns (fees, marks, attendance %).

## Colour tokens (HSL channels in `app/globals.css`)
| Token | Light | Dark |
|---|---|---|
| `--background` | soft green-white | deep green-black |
| `--primary` | green-700 (`142 72% 29%`) | green-500 (`142 71% 45%`) |
| `--warning` | amber | amber |
| `--destructive` | red-600 | red |
| `--info` | blue | light blue |

Semantic tokens: `success`, `warning`, `info`, `destructive`, plus `sidebar-*` and `chart-1…5`.
Never hardcode hex in components — use tokens (`bg-primary`, `text-muted-foreground`, …).
Never rely on colour alone to convey meaning (add icon/label).

## Theming
- Mode: **Light / Dark / System** via `next-themes` (`class` strategy).
- Accent presets: **Green** (default), **Royal Blue**, **Crimson** — set with `<html data-accent="…">`, stored in Redux (`ui.accent`) and persisted to `localStorage["cms-ui"]`. A tiny inline script in `app/layout.tsx` applies it before first paint.
- To add an accent: add `html[data-accent="x"]` and `html.dark[data-accent="x"]` blocks in `globals.css`, then add it to `ACCENTS` (`store/slices/ui.slice.ts`), `ACCENT_META` (`components/layout/theme-toggle.tsx`) and the inline script in `app/layout.tsx`. Blue/Red also retint neutrals (background, muted, border, sidebar); `--success/--warning/--destructive` are never overridden.

## Layout
Sidebar (collapsible on desktop, drawer on < `lg`) + sticky topbar (breadcrumbs, notification bell, theme, user menu). Sidebar items come from `config/nav.ts` per role.

## Accessibility rules
- Visible focus ring on every interactive element; skip-to-content link in the shell.
- Icon-only buttons need `aria-label`. Touch targets ≥ 44 px on coarse pointers.
- Form fields: visible `<Label>`, inline error text linked via `aria-describedby`, `aria-invalid`.
- Icons: Lucide only, no emoji as icons.

## Shared components (`components/shared`)
| Component | Use it for |
|---|---|
| `DataTable` | Any list. Handles loading skeleton, error + retry, empty state, optional pagination, clickable (keyboard-focusable) rows. Columns: `{ id, header, cell, align?, hideOnMobile? }` |
| `DataTablePagination` | Used by `DataTable`; matches the backend `meta` shape. |
| `SearchInput` | Debounced search box (calls `onSearch` with trimmed text). |
| `StatCard` | KPI tiles. Trend shows an arrow + "Up/Down" text, not colour only. |
| `StatusBadge` | Maps backend enums (`PAID`, `UNDER_REVIEW`, …) to badge colours + readable label. |
| `FormField` | Label + control + hint/error; injects `id`, `aria-invalid`, `aria-describedby` into the child control. |
| `ConfirmDialog` | Confirm/destructive actions. Stays open until you close it, so async actions can show `loading`. |
| `ErrorState`, `EmptyState`, `PageHeader` | Page-level states and headers. |

### Paginated list recipe
```tsx
const { params, setPage, setLimit, setSearch } = usePageState();
const q = useQuery({
  queryKey: ["students", params],
  queryFn: () => fetchPaginated<Student>("/students", params),
  placeholderData: keepPreviousData,
});

<SearchInput onSearch={setSearch} placeholder="Search students" />
<DataTable
  caption="Students"
  columns={columns}
  data={q.data?.data}
  getRowId={(s) => s.id}
  isLoading={q.isLoading}
  isFetching={q.isFetching}
  isError={q.isError}
  error={q.error}
  onRetry={q.refetch}
  pagination={q.data && { ...q.data.meta, onPageChange: setPage, onLimitChange: setLimit }}
/>
```
Helpers: `lib/format.ts` (`formatDate`, `formatCurrency` PKR, `formatPercent`, `humanize`), `lib/pagination.ts` (`fetchPaginated`, `PAGE_SIZES`), `hooks/use-page-state.ts`, `hooks/use-debounced-value.ts`.
Form controls: `Input`, `Select` (native), `Textarea` in `components/ui`.
