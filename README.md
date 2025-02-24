# Flarial Scripting Marketplace

A web-based marketplace for discovering, sharing, and downloading Flarial scripts. Browse available scripts, view their details, and easily download them for use in your Flarial projects.

## Features

- 🌐 Browse available Flarial scripts
- 📖 View detailed script information (name, description, version, author)
- ⬇️ Download scripts as packaged archives
- 🎨 Modern, responsive UI built with Next.js and TailwindCSS

## Tech Stack

### Frontend
- Next.js 15
- React 19
- TypeScript
- TailwindCSS
- ESLint

### Backend
- Go 1.23.6
- RESTful API with OpenAPI documentation

## Setup

### Prerequisites
- Node.js (for frontend)
- Go 1.23.6+ (for backend)

### Frontend Setup
1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Backend Setup
1. Navigate to the backend directory:
```bash
cd backend
```

2. Start the server:
```bash
go run cmd/server/main.go
```

The API will be available at `http://localhost:8080`

## Development

### Frontend Development
- `npm run dev` - Start development server with hot reloading
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Backend Development
The backend follows standard Go project layout:
- `/cmd/server` - Main application entry point
- `/internal/api` - API implementation
- `/docs` - OpenAPI documentation
- `/scripts` - Script storage directory

## API Documentation

API documentation is available in OpenAPI format at `backend/docs/openapi.yaml`. Key endpoints:

- `GET /api/scripts/{scriptId}/download` - Download a script package

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Contribution Guidelines
- Follow existing code style and conventions
- Include tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## License

This project is proprietary software. All rights reserved.
