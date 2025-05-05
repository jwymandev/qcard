# QCard - Casting Platform

A multi-tenant web application for tracking and casting Extras for video and movie production. This platform connects talent with casting companies/studios.

## Features

- **For Talent:**
  - Create and manage casting profiles
  - Select specific locations for casting opportunities
  - Subscription-based pricing per location
  - Complete questionnaires from studios
  
- **For Studios:**
  - Search and find talent based on custom criteria
  - Manage casting projects and opportunities
  - Custom pricing via negotiation
  - Create custom questionnaires for talents
  - Custom profile fields for better talent management

## Tech Stack

- **Frontend:** Next.js 14 with React 18
- **Backend:** Next.js API routes
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js
- **Payments:** Stripe
- **Styling:** Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+

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
   npx prisma migrate dev
   ```

5. Start the development server
   ```
   npm run dev
   ```

6. Open [http://localhost:3001](http://localhost:3001) in your browser

## Project Structure

```
qcard/
├── prisma/            # Database schema and migrations
├── public/            # Static assets
├── src/
│   ├── app/           # Next.js app router pages
│   │   ├── api/       # API routes
│   │   ├── studio/    # Studio user pages
│   │   ├── talent/    # Talent user pages
│   │   └── ...        # Other app pages
│   ├── components/    # Reusable UI components
│   ├── lib/           # Utility functions and shared code
│   └── middleware.ts  # Next.js middleware (auth)
├── .env.example       # Example environment variables
├── package.json       # Project dependencies
└── README.md          # Project documentation
```

## Authentication

The application uses NextAuth.js for authentication with a JWT-based session strategy. The authentication flow:

1. Users sign up or sign in through the `/sign-up` or `/sign-in` pages
2. After authentication, users are redirected to `/role-redirect`
3. The role redirect page directs users to the appropriate dashboard based on their tenant type (Studio or Talent)

Make sure the following environment variables are properly set in your `.env` file:

```
# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=a-strong-secret-key
```

## Database

The application uses PostgreSQL as the database. The database schema is defined in `prisma/schema.prisma`.

## New Feature: Questionnaires

A new questionnaire feature has been added to allow studios to create custom forms and gather information from talent profiles. 

### Deploying the Questionnaire Feature

To deploy this feature:

1. Run the enhanced migration script: `./update-schema-and-migrate-enhanced.sh`
2. The script will:
   - Update the Prisma schema with questionnaire models
   - Detect the correct database URL for your environment
   - Create and apply the database migration
   - Restore temporarily disabled components
   - Verify the build passes with the new schema

3. After running the migration, the feature will be fully functional

For detailed instructions on running migrations, see [MIGRATION_README.md](MIGRATION_README.md)

If you encounter any issues with database URLs during migration, refer to [QUESTIONNAIRE_MIGRATION_FIX.md](QUESTIONNAIRE_MIGRATION_FIX.md)

### Using Questionnaires

Studios can:
- Create questionnaires with various question types (text, multiple choice, etc.)
- Send questionnaire invitations to talent profiles
- View and review responses
- Use responses in talent search/selection

Talents can:
- View questionnaire invitations
- Accept or decline invitations
- Complete questionnaires with different response types
- Review their submitted responses

## Troubleshooting

If you encounter module loading errors after login:
1. Delete the `.next` directory: `rm -rf .next`
2. Run a clean build: `npm run build`
3. Restart the development server: `npm run dev`

For authentication issues:
1. Check that NextAuth environment variables are properly set in `.env`
2. Clear your browser cookies and local storage
3. Verify the database is properly migrated

## Deployment

This application is designed to be deployed on platforms like DigitalOcean App Platform, Vercel, or any other Node.js hosting service.

## License

[MIT](LICENSE)