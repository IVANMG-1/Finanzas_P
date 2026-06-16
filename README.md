# Finanzas Personales PWA

A responsive personal finance dashboard built with React, Vite, TypeScript, Tailwind CSS, Recharts and the Supabase client. It runs without a custom backend server and can work in local demo mode when Supabase variables are not configured.

## Features

- Register income and expenses with amount, date, description, category and payment method.
- User-editable expense categories with sensible defaults.
- Dashboard cards for monthly income, monthly expenses, current balance, savings rate and projected annual cash flow.
- Charts for income vs expenses, expenses by category, annual cash-flow projection and savings goal progress.
- Savings plan module with monthly goal, achieved savings, gap and recommended adjustment.
- Manual dark/light mode toggle.
- PWA-ready manifest and service worker for installability and basic offline caching.
- Supabase realtime subscription hooks for transaction and category updates.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the Vite URL shown in the terminal. Without Supabase credentials, the app uses local demo data stored in `localStorage`.

## Configure Supabase

1. Create a free Supabase project.
2. Copy `.env.example` to `.env.local` and set:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Create the tables below in the Supabase SQL editor. Categories are intended to be per user through the `user_id` column and row-level security policies can be tightened once authentication is added.

```sql
create table if not exists public.transactions (
  id uuid primary key,
  user_id uuid default auth.uid(),
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount >= 0),
  date date not null,
  description text not null,
  category text not null,
  payment_method text not null,
  created_at timestamptz default now()
);

create table if not exists public.expense_categories (
  id uuid primary key,
  user_id uuid default auth.uid(),
  name text not null,
  created_at timestamptz default now(),
  unique (user_id, name)
);

create table if not exists public.savings_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  monthly_goal numeric not null default 0,
  updated_at timestamptz default now(),
  unique (user_id)
);

alter table public.transactions enable row level security;
alter table public.expense_categories enable row level security;
alter table public.savings_plans enable row level security;
```

For a production multi-user app, add Supabase Auth and RLS policies that restrict rows to `auth.uid() = user_id`. For a quick private prototype, you can keep access limited to your project and anon key while testing.

4. Enable realtime for `transactions` and `expense_categories` in Supabase Database > Replication.

## Deploy on Vercel

1. Push this repository to GitHub.
2. Import the project in Vercel using the free Hobby plan.
3. Set the environment variables in Vercel Project Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Use the default Vite settings:
   - Build command: `npm run build`
   - Output directory: `dist`
5. Deploy. The app does not require a paid API or a self-managed server.

## Scripts

- `npm run dev` - start local development server.
- `npm run build` - type-check and build production assets.
- `npm run preview` - preview the production build locally.
- `npm run lint` - run ESLint.
