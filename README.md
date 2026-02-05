# 🚀 TeamSync

**Zero friction task management for small teams.**

TeamSync is a simplified task management platform designed for small project teams. It eliminates the complexity of enterprise tools by focusing on what matters: **Active** vs. **Done**.

![TeamSync Dashboard](https://via.placeholder.com/800x450/1a1a24/36bcfa?text=TeamSync+Dashboard)

## ✨ Features

- **🔥 Simple Two-Column Board**: Active tasks on the left, Done tasks on the right
- **🎉 Confetti Celebrations**: Visual reward when completing tasks
- **👥 Team Roles**: Assign custom roles like "AI Developer" or "Frontend Lead"
- **🔗 Instant Invite Links**: Share a link to add team members
- **💬 Task Comments**: Collaborate with your team on task details
- **🏷️ Priority Tags**: Color-coded priority indicators (High/Medium/Low)
- **📅 Due Dates**: Never miss a deadline

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS with custom glass morphism design
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Email + Google)
- **Animations**: canvas-confetti
- **Icons**: Lucide React

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (free tier works great)

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd teamsync
   npm install
   ```

2. **Set up Supabase**:
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to SQL Editor and run the contents of `supabase-schema.sql`
   - Enable Google Auth in Authentication > Providers (optional)

3. **Configure environment variables**:
   ```bash
   cp .env.local.example .env.local
   ```
   Then edit `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** 🎉

## 📁 Project Structure

```
teamsync/
├── src/
│   ├── app/
│   │   ├── auth/page.tsx       # Login/Register page
│   │   ├── invite/[code]/      # Invite link handler
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Main dashboard (Dashboard, TaskModal, etc.)
│   ├── lib/
│   │   ├── store.ts            # Local state store
│   │   └── supabase/           # Supabase client
│   └── types/
│       └── database.ts         # TypeScript types
├── supabase-schema.sql         # Database schema
├── tailwind.config.ts          # Tailwind configuration
└── package.json
```

## 🎨 Design Philosophy

TeamSync follows these design principles:

1. **Glass Morphism**: Subtle transparency and blur effects for depth
2. **Dark Theme**: Easy on the eyes for long work sessions  
3. **Micro-interactions**: Smooth animations for delightful UX
4. **Mobile-First**: Responsive design that works on any device

## 📝 Usage

### Creating Tasks
1. Type in the input field at the top of the Active column
2. Press Enter to create the task
3. Click the task to add details (description, assignee, priority, due date)

### Completing Tasks
1. Click the checkbox on any task
2. Watch the confetti celebration! 🎉
3. Task moves to the Done column

### Inviting Team Members
1. Click "Copy Invite" in the header
2. Share the link with your team
3. They join instantly with their own role

### Managing Roles
1. Click "Team" in the header
2. Click on any member's role to edit
3. Press Enter to save

## 🚧 Development Roadmap

- [x] Phase 1: MVP (Core task management)
- [x] Phase 2: Collaboration (Invite links, roles)
- [x] Phase 3: Polish (Confetti, priorities)
- [ ] Phase 4: Real-time sync with Supabase
- [ ] Phase 5: Mobile app (React Native)

## 📄 License

MIT License - feel free to use this for your own projects!

---

Built with ❤️ by the TeamSync team
