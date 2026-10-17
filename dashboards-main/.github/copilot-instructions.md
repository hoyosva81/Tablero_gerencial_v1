# Dashboards - GitHub Copilot Instructions

## Project Overview
This project is a collection of dashboards for monitoring and analyzing various data sources. Each dashboard is built using React and TypeScript, with a focus on performance and usability.

## Tech Stack
- **Framework**: React 19 with TypeScript
- **Build tool**: Vite 7 (with path alias `@/` pointing to `src/`)
- **Package manager**: pnpm
- **Charts**: ECharts 6 via echarts-for-react
- **Tables**: MUI X DataGrid (`@mui/x-data-grid`) for all data tables
- **UI components**: Material UI (MUI) v9 for production-ready components
- **Styling**: Emotion (CSS-in-JS) + Material UI theming system
- **State management**: Zustand 5
- **Server state / data fetching**: TanStack React Query 5
- **Routing**: React Router 6
- **Icons**: MUI Icons Material (@mui/icons-material)
- **Testing**: Vitest + Testing Library + msw

## Project Structure Conventions
- The project will be SPA, where each dashboard is a separate route under `src/pages/` (e.g., `src/pages/AlertasDashboard.tsx`).
- Reusable UI components (e.g., chart wrappers, table components, filters) go in `src/components/`.
- Data fetching functions for each dashboard go in `src/services/` (e.g., `AlertasService.tsx`).
- Reusable utilities (e.g., date formatting helpers, API clients) go in `src/utils/`.
- Global state (e.g., user preferences, theme) is managed in `src/store/` using Zustand.

## Coding Conventions
- Use **functional components** and React hooks only — no class components.
- Use `async/await` for all data fetching. Return `null` on error and log with `console.error`.
- Use **Zustand** for global UI state (e.g., theme, user settings). Use **TanStack React Query** for server/remote state.
- Use **TypeScript generics** when writing reusable utilities (see `useFetchData<T>()` as an example).
- Prefer named exports over default exports for components and utilities.

## Security Rules
- Never commit secrets: API keys, tokens, passwords, or internal URLs must live in environment variables (.env.local, .env.production) and never appear in source code.
- Sanitize user input: Any text rendered from user input or external APIs must be treated as untrusted. React's default escaping handles most XSS, but avoid using dangerouslySetInnerHTML. If absolutely necessary, sanitize HTML with DOMPurify before injection.
- No inline authentication tokens: Do not store session tokens or credentials in localStorage unless explicitly required; prefer httpOnly cookies set by the backend.
- Validate data at boundaries: Always validate and type-check API responses using Zod or TypeScript guards before passing them into the UI.
- CSP compliance: Avoid inline event handlers (onclick="...") and inline <script> tags. All scripts must be loaded from trusted sources.
- Dependency hygiene: Do not install npm packages with known vulnerabilities. Run pnpm audit regularly.
Route guards: Protect dashboard routes that require authentication. Redirect unauthenticated users to the login page.
Error boundaries: Implement React error boundaries around major dashboard sections to prevent full app crashes and to avoid leaking stack traces to users.
No eval or dynamic code execution: Never use eval(), new Function(), or similar patterns with user-controlled data.

## Styling Conventions

### Material UI Theme System
- The Material UI theme is defined in `src/theme.ts` using `createTheme()`.
- All color tokens (primary, secondary, error, warning, info, success) are centralized in the theme palette.
- Component overrides (e.g., `MuiTableCell`, `MuiTableRow`, `MuiCard`) are defined in the theme's `components` property.
- The theme is applied globally via `<ThemeProvider>` in `src/main.tsx`.

### Design Tokens (defined in `src/theme.ts`)
- **Colors**: defined in the `palette` object:
  - Primary: `#c084fc` (accent/purple) and variants (light, dark)
  - Background: `#16171d` (default), `#1f2028` (paper)
  - Text: `#f3f4f6` (primary), `#9ca3af` (secondary)
  - Status colors: `success`, `warning`, `error`, `info`
- **Typography**: Roboto font family with standard Material Design scales
- **Breakpoints**: Default MUI breakpoints (xs, sm, md, lg, xl)

### Using Material UI Components
- Import components from `@mui/material` (e.g., `Button`, `Card`, `Table`, `TextField`)
- Use the `sx` prop for component-specific styles: `<Box sx={{ p: 2, backgroundColor: '#fff' }} />`
- The `sx` prop accepts theme values and responsive styles
- For complex styling, use `styled()` from `@emotion/styled` with Material UI's `styled` utility

### Styling with sx prop (preferred for single components)
```tsx
<Box sx={{ 
  display: 'flex', 
  gap: 2, 
  p: 3,
  backgroundColor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider'
}} />
```

### Custom Styled Components (for reusable component styles)
```tsx
import { styled } from '@mui/material/styles';

const CustomCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));
```

### Responsive Design
- Use MUI's responsive `sx` syntax: `sx={{ px: { xs: 1, sm: 2, md: 3 } }}`
- Breakpoints: `xs` (0px), `sm` (600px), `md` (960px), `lg` (1280px), `xl` (1920px)

### Dark Mode
- The theme is set to `mode: 'dark'` by default.
- All color tokens automatically adapt to dark mode via the theme definition.
- No need to manually toggle dark classes — Material UI handles this internally.

### Icons
- Import icons from `@mui/icons-material` (e.g., `CloseIcon`, `EditIcon`, `DeleteIcon`)
- Use icon components directly: `<CloseIcon />`
- Icon size is controlled via the `fontSize` prop or `sx={{ fontSize: 20 }}`
- Material Icons automatically inherit text color from the theme

### Tables with MUI X DataGrid
Use `DataGrid` (or `DataGridPro` / `DataGridPremium` for advanced features) from `@mui/x-data-grid` for all data tables. Do **not** use TanStack Table.

```tsx
import { DataGrid, GridColDef } from '@mui/x-data-grid';

const columns: GridColDef<DataType>[] = [
  { field: 'fieldName', headerName: 'Column Header', width: 150 },
];

const MyTable = ({ data }: { data: DataType[] }) => {
  return (
    <DataGrid
      rows={data}
      columns={columns}
      pageSizeOptions={[5, 10, 25, 50]}
      initialState={{
        pagination: { paginationModel: { pageSize: 10 } },
      }}
      disableRowSelectionOnClick
      autoHeight
    />
  );
};
```

- Use `getRowId` when rows do not have an `id` field: `<DataGrid getRowId={(row) => row.customId} />`
- Prefer `GridColDef<T>` typed columns for type safety.
- Use the `sx` prop on `DataGrid` to apply theme-consistent overrides.

## Testing
- Run tests with `pnpm test` (Vitest).
- Test files sit alongside the component they test (e.g., `PrecipitationLayer.test.tsx`).
- Use msw for mocking HTTP requests in tests.

## Naming
- Components: PascalCase (e.g., `PrecipitationLayer`)
- Hooks: camelCase prefixed with `use` (e.g., `useLayersStore`)
- Services/utils: camelCase (e.g., `getLayer`, `regionRiskColor`)
- Types/interfaces: PascalCase (e.g., `PrecipitationProperties`, `LayerData`)

## Language
- Comments, variable names, and documentation are in **Spanish** in this project. Follow that convention when adding new comments.