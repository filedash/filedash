# FileDash Frontend

A modern React-based file browser frontend for FileDash.

## Features Implemented (Stage 1-2)

✅ **Foundation & Core UI**

- Modern React 19 + TypeScript + Tailwind CSS setup
- Responsive layout with header navigation
- Reusable UI component library (shadcn/ui based)
- API service layer with Axios and React Query
- File type detection and icon mapping

✅ **File Browser Core**

- File listing with table view
- Directory navigation with breadcrumbs
- File type icons and metadata display
- Sortable columns (name, size, modified date)
- File selection with checkboxes
- Loading states and error handling

## Tech Stack

- **Frontend Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4.1 + Radix UI
- **Build Tool**: Vite 6.3
- **HTTP Client**: Axios
- **State Management**: React Query + React hooks
- **Routing**: React Router v6
- **Icons**: Lucide React

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Next Steps (Stage 3-6)

🔄 **Stage 3-4 (Weeks 5-8)**

- File upload with drag & drop
- File download functionality
- Delete operations with confirmation
- Search functionality

🔄 **Stage 5-6 (Weeks 9-12)**

- JWT authentication
- Advanced UI features
- Performance optimizations
- Accessibility improvements

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x';
import reactDom from 'eslint-plugin-react-dom';

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
});
```
