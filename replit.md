# Arithmetic Relay Game

## Overview

This is a multilingual mathematical puzzle game built with React and Express. Players create arithmetic expressions by selecting continuous lines of numbers and operations on a grid-based game board to find target values. The application supports Russian and English languages, features difficulty levels, leaderboards, and responsive design for both desktop and mobile devices.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: React hooks with local state management
- **Routing**: Wouter for lightweight client-side routing
- **Data Fetching**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Internationalization**: Custom i18n implementation with context-based language switching

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **API Design**: RESTful endpoints for leaderboard operations
- **Session Management**: Connect-pg-simple for PostgreSQL-backed sessions
- **Validation**: Zod schemas for request/response validation

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Local Storage**: Browser localStorage for user preferences (language settings)

## Key Components

### Game Logic
- **Grid System**: Dynamic grid generation with alternating numbers and operations
- **Path Selection**: Continuous line selection (horizontal/vertical) with visual feedback
- **Expression Evaluation**: Real-time mathematical expression parsing and calculation
- **Number Concatenation**: Adjacent number cells can be selected without operations, concatenating to form larger numbers (e.g., 1-2 becomes 12)
- **Difficulty Levels**: Three levels (easy, medium, hard) - in standard game tied to operation sets, in custom boards set as subjective author rating
- **Board Sizes**: Configurable grid sizes (5x5, 10x10, 15x15)
- **Solution Detection**: Automatic solution finding for hint system
- **Custom Board Constructor**: Players can create and share their own puzzle boards with unrestricted operation choice
- **Board Validation**: Creators must solve their own puzzles before publishing
- **Subjective Difficulty**: Custom board authors independently choose difficulty label regardless of operations or board size

### User Interface
- **Responsive Design**: Mobile-first approach with touch-optimized controls
- **Component Library**: shadcn/ui components for consistent design system
- **Game Board**: Interactive grid with hover states and selection feedback
- **Drag Selection**: Mouse drag support for continuous path selection on desktop
- **Text Selection Prevention**: User-select disabled on cells to prevent unwanted text highlighting
- **Scrollable Target Lists**: ScrollArea component for viewing many target numbers
- **Statistics Panel**: Real-time game statistics and progress tracking
- **Leaderboard**: Filterable rankings by difficulty and board size
- **Settings Dialog**: Game configuration and language switching
- **Board Constructor**: Visual editor for creating custom puzzle boards with validation
- **Custom Board Browser**: Gallery of player-created boards with filtering
- **Multi-Mode Navigation**: Seamless switching between standard game, constructor, and custom boards

### Database Schema
```sql
-- Users table for future authentication
users (id, username, password)

-- Leaderboard entries for standard game
leaderboard_entries (
  id, nickname, time, attempts, 
  difficulty, board_size, completed_at
)

-- Custom boards created by players
custom_boards (
  id, name, creator_name, difficulty, board_size,
  board_data (jsonb), targets (array), is_solved, 
  completion_count, created_at
)

-- Leaderboard entries for custom boards
custom_board_leaderboards (
  id, custom_board_id, nickname, time, 
  attempts, completed_at
)
```

## Data Flow

1. **Game Initialization**: Generate random grid with numbers and operations
2. **User Interaction**: Cell selection triggers path validation and expression building
3. **Expression Evaluation**: Mathematical expressions are parsed and calculated in real-time
4. **Target Matching**: Results are compared against target numbers for completion
5. **Score Submission**: Completed games submit results to leaderboard API
6. **Leaderboard Display**: Rankings are fetched and filtered by difficulty/board size

## External Dependencies

### Frontend Dependencies
- **UI Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS, Radix UI primitives, class-variance-authority
- **State Management**: TanStack Query for server state
- **Forms**: React Hook Form with Hookform resolvers
- **Validation**: Zod for schema validation
- **Icons**: Lucide React for consistent iconography
- **Build Tools**: Vite with React plugin

### Backend Dependencies
- **Server**: Express.js with TypeScript support
- **Database**: Neon serverless PostgreSQL, Drizzle ORM
- **Validation**: Zod for API request/response validation
- **Development**: tsx for TypeScript execution, esbuild for production builds

### Development Tools
- **Build System**: Vite for frontend, esbuild for backend
- **Type Checking**: TypeScript with strict configuration
- **CSS Processing**: PostCSS with Tailwind CSS and Autoprefixer
- **Database Tools**: Drizzle Kit for migrations and schema management

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Development**: tsx provides hot-reload for server, Vite HMR for client

### Environment Configuration
- **Database**: Requires `DATABASE_URL` environment variable for Neon connection
- **Development**: Uses Vite dev server with Express API proxy
- **Production**: Serves static files from Express with API routes

### Scalability Considerations
- **Database**: Serverless PostgreSQL scales automatically with demand
- **Frontend**: Static assets can be served from CDN
- **Backend**: Stateless Express server suitable for horizontal scaling
- **Sessions**: PostgreSQL-backed sessions for multi-instance support

## Mobile Application

A React Native (Expo) mobile app is available in the `/mobile` directory. It provides the same functionality as the web version:

- Full game experience with touch gestures (swipe to select cells)
- Custom board constructor
- Custom boards gallery
- Leaderboards
- Russian/English language support
- Dark theme optimized for mobile screens

### Mobile Project Structure
```
mobile/
├── App.tsx                    # Entry point
├── src/
│   ├── components/            # UI components (GameBoard, TargetList, etc.)
│   ├── screens/               # App screens (Home, Game, Leaderboard, etc.)
│   ├── navigation/            # React Navigation setup
│   ├── context/               # Language context
│   ├── hooks/                 # Custom hooks
│   └── lib/                   # API client, game logic, i18n
└── assets/                    # Icons and splash screens
```

### Running the Mobile App

```bash
cd mobile
npm install
npm start
```

Then scan the QR code with Expo Go on your mobile device.

### Building for Production

```bash
# Android
npx eas build --platform android

# iOS
npx eas build --platform ios
```

## Licensing

This project is licensed under the Apache License 2.0. All source files include appropriate copyright headers, and the full license text is available in the LICENSE file.

## Changelog
- June 29, 2025: Initial setup
- June 29, 2025: Added comprehensive mobile device support with touch events
- June 29, 2025: Implemented responsive design for all UI components  
- June 29, 2025: Updated copyright year to 2025
- June 29, 2025: Added Apache-2.0 license with proper documentation
- November 7, 2025: Added custom board constructor with concatenation feature
- November 7, 2025: Implemented player-created board gallery with filtering
- November 7, 2025: Added validation requiring creators to solve puzzles before publishing
- November 7, 2025: Enhanced number concatenation logic for adjacent cells
- November 7, 2025: Fixed critical validation bug preventing unsolvable boards from being saved
- November 7, 2025: Added isBoardDirty flag to track modifications after puzzle solving
- November 7, 2025: Fixed drag-selection bug in custom game (mouse events now work properly)
- November 7, 2025: Added ScrollArea for target numbers list to support many targets
- November 7, 2025: Disabled text selection during drag operations for cleaner UX
- November 7, 2025: Fixed critical bug where first cell was ignored during subsequent drag selections
- November 7, 2025: Rewrote drag selection logic to directly initialize selection on mouseDown
- November 7, 2025: Fixed conflict between click and drag handlers by removing onClick
- November 7, 2025: Added custom_board_leaderboards table for tracking scores on custom boards
- November 7, 2025: Implemented completion_count tracking for custom boards
- November 7, 2025: Added top-100 popular boards feature with dedicated leaderboards
- November 7, 2025: Fixed horizontal scroll issue on main page header
- November 7, 2025: Fixed React toast warnings by using useEffect for notifications
- November 7, 2025: Fixed route ordering issue - moved /api/custom-boards/top before /:id route to prevent "top" being parsed as ID parameter
- November 7, 2025: Made difficulty a subjective author rating independent of operations and board size
- November 7, 2025: Removed operation references from difficulty selector in constructor
- November 7, 2025: All operations (+, -, *, /, ^) now available in cell editor regardless of chosen difficulty
- November 7, 2025: Added difficulty badge display in custom game header with board size info
- November 27, 2025: Created React Native (Expo) mobile application in /mobile directory
- November 27, 2025: Mobile app includes all web features: game, constructor, custom boards gallery, leaderboards
- November 27, 2025: Added touch gesture support for cell selection (swipe to select)
- November 27, 2025: Mobile app uses same API endpoints, sharing database with web version

## User Preferences

Preferred communication style: Simple, everyday language.
License preference: Apache-2.0 license for open source distribution.