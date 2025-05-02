# QCard - Casting Platform

A multi-tenant web application for tracking and casting Extras for video and movie production. This platform connects talent with casting companies/studios.

## Features

- **For Talent:**
  - Create and manage casting profiles
  - Select specific locations for casting opportunities
  - Subscription-based pricing per location
  
- **For Studios:**
  - Search and find talent based on custom criteria
  - Manage casting projects and opportunities
  - Custom pricing via negotiation

## Tech Stack

- **Frontend:** Next.js 14 with React 18
- **Backend:** Next.js API routes
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Clerk
- **Payments:** Stripe
- **Styling:** Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database

### Installation

1. Clone the repository
   ```
   git clone https://your-repository-url/qcard.git
   cd qcard
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Copy the example environment file and update with your values
   ```
   cp env.example .env
   ```

4. Set up the database
   ```
   npx prisma migrate dev --name init
   ```

5. Start the development server
   ```
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
qcard/
├── prisma/            # Database schema and migrations
├── public/            # Static assets
├── src/
│   ├── app/           # Next.js app router pages
│   ├── components/    # Reusable UI components
│   ├── lib/           # Utility functions and shared code
│   └── middleware.ts  # Next.js middleware (auth)
├── .env.example       # Example environment variables
├── package.json       # Project dependencies
└── README.md          # Project documentation
```

## Deployment

This application is designed to be deployed on platforms like DigitalOcean App Platform, Vercel, or any other Node.js hosting service.

## License

[MIT](LICENSE)