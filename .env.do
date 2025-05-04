# App
NEXT_PUBLIC_APP_URL=https://qcard.app

# NextAuth - Production values
NEXTAUTH_URL=https://qcard.app
NEXTAUTH_SECRET=cd9f85c2f35dc8f7d9e6a9845fc2dfed765c7215e57e2ec8e661b7bd70fa6fb9

# Database (PostgreSQL for DigitalOcean)
DATABASE_URL="postgresql://user:password@db-qcarddevelopment-do-user-15547991-0.k.db.ondigitalocean.com:25060/defaultdb?sslmode=require"

# Stripe (Replace with actual keys in production)
STRIPE_SECRET_KEY="sk_test_placeholder"
STRIPE_WEBHOOK_SECRET="whsec_placeholder"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_placeholder"