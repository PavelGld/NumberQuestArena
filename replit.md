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
- **Difficulty Levels**: Three levels (easy, medium, hard) with different operation sets
- **Board Sizes**: Configurable grid sizes (5x5, 10x10, 15x15)
- **Solution Detection**: Automatic solution finding for hint system

### User Interface
- **Responsive Design**: Mobile-first approach with touch-optimized controls
- **Component Library**: shadcn/ui components for consistent design system
- **Game Board**: Interactive grid with hover states and selection feedback
- **Statistics Panel**: Real-time game statistics and progress tracking
- **Leaderboard**: Filterable rankings by difficulty and board size
- **Settings Dialog**: Game configuration and language switching

### Database Schema
```sql
-- Users table for future authentication
users (id, username, password)

-- Leaderboard entries
leaderboard_entries (
  id, nickname, time, attempts, 
  difficulty, board_size, completed_at
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

## Changelog
- June 29, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.