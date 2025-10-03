# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js project that serves as a theme renderer for ES-DE (EmulationStation Desktop Edition), an open-source emulator frontend. The project converts ES-DE themes from XML format to JSON and renders them in a web browser. The application uses static export with pure browser rendering and Zustand for state management.

## Key Technologies

- Next.js 15.4.2 with React 19.1.0
- TypeScript
- Tailwind CSS v4
- Zustand for state management
- xml2js for XML parsing
- Static export (`output: 'export'`) - no server-side code

## Project Structure

- `src/` - Main source code
  - `app/` - Next.js app directory with pages and components
    - `components/elements/` - Theme element components (Text, Image, TextList, Carousel, Grid, HelpSystem, Clock, SystemStatus)
    - `hooks/` - Custom React hooks including navigation
    - `store/` - Unified directory for all Zustand stores
      - `theme.ts` - Theme state management
      - `modal.ts` - Modal state management
          - `keyboardManager.ts` - Keyboard event handling and management
    - `focusManager.ts` - Focus management for keyboard navigation
    - `elementNavigation.ts` - Element-specific navigation logic
  - `themeUtils.ts` - Theme utilities and type definitions
  - `theme-converter.ts` - Core theme conversion logic from XML to JSON
- `es-de_themes/` - Input directory for ES-DE themes (XML format)
- `public/themes/` - Output directory for converted themes (JSON format)
- `public/mock.json` - Mock data for testing theme rendering
- `scripts/` - Utility scripts for theme and metadata conversion

## Common Commands

### Development
```bash
npm run dev
# Starts development server with Turbopack
```

### Build
```bash
npm run build
# Builds for production and exports static files to out/ directory
```

### Start Production
```bash
npm run start
# Starts production server (for non-static builds)
```

### Linting
```bash
npm run lint
# Runs ESLint
```

### Theme Conversion
```bash
npm run convert-themes
# Converts ES-DE themes from XML to JSON in es-de_themes/ to public/themes/
```

### Metadata Conversion
```bash
npm run convert-metadata
# Converts metadata files
```

## Architecture Overview

### Theme Conversion Pipeline
1. **Source Themes**: ES-DE themes in XML format are placed in `es-de_themes/` directory
2. **Conversion Process**: The conversion script processes `theme.xml`, `capabilities.xml`, `colors.xml`, and included XML files
3. **JSON Output**: Converted themes are saved as JSON files in `public/themes/`
4. **Asset Management**: Theme assets (fonts, images, sounds) are copied to theme directories

### Theme Rendering System
1. **Theme Loading**: Themes are loaded from `/public/themes/[theme-name].json`
2. **State Management**: Zustand store manages theme state including current theme, variant, color scheme, and aspect ratio
3. **Element Rendering**: Each ES-DE element type has a corresponding React component in `src/app/components/elements/`
4. **Dynamic Elements**: Themes support variants, color schemes, and aspect ratios that can be dynamically applied

### View System
The application supports three main views:
- **system**: System selection view (`/system`)
- **gamelist**: Game list view (`/gamelist`)
- **menu**: Settings menu view (modal overlay)

### State Management Architecture
- **Unified Store Directory**: All Zustand stores are now organized in `src/app/store/`
- **Theme Store**: Manages theme state including current theme, variant, color scheme, aspect ratio, and view
- **Modal Store**: Handles modal state and menu navigation
- **Keyboard Store**: Manages keyboard navigation state, focus, and key mappings
- **Navigation**: Custom hooks and managers provide comprehensive keyboard navigation support

## Key Implementation Details

### Theme Structure
Converted themes follow this JSON structure:
- `name`: Theme identifier
- `variables`: Theme variables including color schemes
- `capabilities`: Available variants, color schemes, and aspect ratios
- `views`: Array of view configurations (system, gamelist)
- `variant`: Optional theme variants with custom views and variables
- `aspectRatio`: Optional aspect ratio configurations
- `assets`: Theme assets (fonts, images, sounds)

### Element Positioning
- Uses percentage-based coordinates with origin points
- Default origin is `{ x: 0.5, y: 0.5 }` (center)
- Position is relative to parent container
- All elements use absolute positioning

### Theme Variables and Overrides
- Base variables defined in theme root
- Color scheme-specific variables override base variables
- Variant-specific variables override color scheme and base variables
- Aspect ratio variables provide additional overrides

### Mutually Exclusive Elements
- TextList, Carousel, and Grid elements are mutually exclusive per view
- Only one of these element types can exist per view
- Later elements override earlier ones of the same type

### Asset Path Handling
- Image paths starting with `./_inc/` are automatically converted to full theme asset paths
- Fonts are loaded dynamically from theme assets
- Fallback to system fonts if loading fails

### Keyboard Navigation System
- **Unified Keyboard Management**: All keyboard-related code is now organized in a unified structure
- **Keyboard Manager**: Singleton class for handling keyboard events (`src/app/keyboardManager.ts`)
- **Focus Manager**: Centralized focus management (`src/app/focusManager.ts`)
- **Element Navigation**: Element-specific navigation logic (`src/app/elementNavigation.ts`)
- **Navigation Hooks**: Custom React hooks for keyboard navigation (`src/app/hooks/useKeyboardNavigation.ts`)
- All interactive elements support keyboard navigation
- Custom navigation hooks handle arrow keys, enter, and escape
- Focus management and visual indicators provided

## Development Guidelines

### Component Development
- Element components must follow the established pattern in `src/app/components/elements/`
- Use TypeScript interfaces from `themeUtils.ts` for type safety
- Implement proper error handling and graceful degradation
- Support keyboard navigation with `tabIndex` and key event handlers

### Theme Development
- Place ES-DE themes in `es-de_themes/` directory
- Run `npm run convert-themes` to generate JSON
- Test with `public/mock.json` for consistent test data
- Verify theme switching and responsive behavior

### Static Export Considerations
- No server-side code allowed due to static export
- Use client-side data fetching for theme and mock data
- All assets must be accessible from the static build

### Performance Optimization
- Use `React.memo` for element components to prevent unnecessary re-renders
- Optimize style calculations and asset loading
- Monitor bundle size and loading performance