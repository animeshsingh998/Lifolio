# Project: Lifolio — Personal Life Dashboard

I want to build a personal website called **Lifolio**.

Lifolio is a personal life tracking and digital archive website where I can organize and track different aspects of my life.

The idea is to create a single place where I can store information about things I own, things I want to buy, movies I watch, books I read, personal experiences, goals, and anything else I might want to track in the future.

Think of it as a combination of a personal dashboard, digital archive, and flexible collection management system.

This is a personal hobby project. I want it to be simple, beautiful, easy to maintain, and free to operate within reasonable usage limits.

I will be using Claude Code to develop this project.

---

## 1. Technology Stack

Use the following stack:

- **Frontend:** Next.js with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Icons:** Lucide
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth
- **File Storage:** Supabase Storage
- **Hosting:** Vercel
- **Source Control:** GitHub

### Important architectural decisions

- Use Next.js as a single full-stack application.
- Do not create a separate Express.js or Node.js backend.
- Use Next.js Server Actions and Route Handlers where appropriate.
- Use Supabase for database, authentication, and storage.
- Keep infrastructure simple and avoid unnecessary services.
- Do not introduce AWS, Docker, Kubernetes, or other infrastructure unless explicitly required.

The goal is to deploy and maintain this project with minimal operational effort and cost.

---

## 2. Authentication and User Management

Although Lifolio is initially intended for personal use, I want it to have a proper sign-up and login system.

Authentication requirements:

- Sign-up page.
- Login page.
- Logout functionality.
- Persistent login sessions.
- Users should remain logged in when they revisit the website, unless they explicitly log out or their session expires.
- Password reset functionality.
- Protected application routes.
- User-specific data storage.

### User data isolation

Every user must have their own private data.

If multiple users eventually register:

- Each user should see only their own collections and entries.
- Users must not be able to access other users' data.
- All user-owned database records should be associated with the authenticated user.
- Supabase Row Level Security (RLS) must enforce data isolation.

Do not rely exclusively on frontend checks for security.

Never expose Supabase service-role credentials or other secrets in client-side code.

For authentication, use Supabase Auth and follow its recommended Next.js integration practices.

---

## 3. Core Concept: Dynamic Collections

This is the most important architectural requirement.

Lifolio should support dynamically created collections.

Examples:

- Movies
- TV Shows
- Books
- Watches
- Shoes
- Gadgets
- Fragrances
- Travel
- Music
- Restaurants
- Personal achievements

I should be able to create a completely new collection whenever I want without requiring changes to the application's source code or database schema.

For example, if I decide to start tracking fragrances six months after the initial launch, I should be able to create a Fragrances collection directly from the website.

I should not need to ask Claude Code to build another frontend page or database table.

### Collection creation

Users should eventually be able to:

- Create collections.
- Name collections.
- Add descriptions.
- Select icons.
- Configure custom fields.
- Choose collection layouts.
- Edit collections.
- Delete collections.

Each collection should have its own configurable structure and entries.

### Collection-specific fields

Different collections require different attributes.

For example:

Movies:
- Title
- Director
- Release year
- Genre
- Runtime
- Rating
- Watched date
- Status

Books:
- Title
- Author
- ISBN
- Genre
- Number of pages
- Rating
- Reading status
- Completion date

Watches:
- Brand
- Model
- Reference number
- Movement
- Purchase price
- Purchase date
- Ownership status

Shoes:
- Brand
- Model
- Size
- Color
- Purchase price
- Purchase date
- Condition

The collection system should allow custom fields without requiring new database tables for each collection.

Consider PostgreSQL JSONB for flexible attributes while maintaining proper database structure for common fields.

However, avoid building an excessively complicated generic database engine.

Start with simple custom field types:

- Text
- Number
- Date
- Dropdown
- URL
- Checkbox
- Image

More advanced field types can be introduced later if necessary.

---

## 4. Initial Collections

The initial release should include these collections:

### Movies & TV Shows

Track:
- Movies watched.
- Movies planned to watch.
- TV shows watched.
- Currently watching.
- Watchlist.
- Ratings and reviews.
- Completion dates.

### Books

Track:
- Books read.
- Currently reading.
- Planned reading.
- Reading progress.
- Ratings.
- Reviews.
- Authors and genres.

### Watches

Track:
- Watches I own.
- Watches I want to purchase.
- Brand and model.
- Specifications.
- Purchase price.
- Purchase date.
- Images.

### Shoes

Track:
- Shoes I own.
- Shoes I want to purchase.
- Brand and model.
- Size.
- Color.
- Purchase price.
- Purchase date.

These collections should serve as initial examples and templates for the dynamic collection system.

---

## 5. Website Structure

The website should have a modern dashboard layout.

Suggested navigation:

### Dashboard
An overview of my personal life tracking data.

Display:
- Collection statistics.
- Recently added items.
- Recent activities.
- Quick access to collections.
- Items currently being tracked.

### My Collections
A central page containing all collections.

Collections should be displayed using attractive cards.

Users should be able to create new collections directly from this page.

### Individual Collection Pages
Each collection should have its own page generated dynamically based on its configuration.

Support:
- Grid view.
- List view.
- Search.
- Filters.
- Sorting.
- Entry creation.
- Entry editing.
- Entry details.

### Goals & Progress
A future section for personal goals, achievements, and milestones.

### Timeline
A chronological view of activities such as:
- Movies watched.
- Books completed.
- Items purchased.
- Goals completed.

### Settings
- Profile.
- Account settings.
- Theme preferences.
- Data export.

Do not implement all sections immediately. Build the core architecture first.

---

## 6. UI and Design Direction

I want Lifolio to look like a polished modern web application.

Design inspiration:
- Notion.
- Linear.
- Modern personal dashboards.
- Minimalist digital archives.

### Design requirements

- Dark mode as the initial theme.
- Support light mode eventually.
- Clean sidebar navigation.
- Minimal, elegant interface.
- Card-based layouts.
- Responsive design.
- Attractive collection pages.
- Consistent typography.
- Subtle animations only when useful.
- Good desktop experience.
- Mobile-friendly layout.

Avoid:
- Excessive animations.
- Overly colorful interfaces.
- Unnecessary gradients.
- Excessive dashboard widgets.
- Complicated navigation.
- UI clutter.

The application should feel premium, personal, and calm.

---

## 7. Database and Data Management

Use Supabase PostgreSQL.

The architecture should support:

- Users.
- Collections.
- Collection fields.
- Entries.
- Entry custom attributes.
- Tags.
- Images.
- Activity history.

Use proper relational database design for common fields.

Use JSONB where appropriate for flexible custom attributes.

Use Supabase Storage for images rather than storing image binaries directly in PostgreSQL.

Store image paths or URLs in the database.

### Security

- Implement RLS for all user-owned data.
- Ensure authenticated users can access only their own records.
- Protect database operations.
- Use environment variables for credentials.
- Never expose secrets in frontend code.

### Data portability

Eventually, users should be able to export their personal data.

Support:
- JSON export.
- CSV export where appropriate.
- Downloading associated images.

Lifolio should never lock users into its own database.

---

## 8. Development Philosophy

This is a personal hobby project, so simplicity is extremely important.

Prioritize:

1. Maintainability.
2. Simplicity.
3. Clean architecture.
4. Security.
5. Good UI.
6. Low operating costs.
7. Extensibility.

Avoid unnecessary abstractions and overengineering.

Do not add technologies or dependencies just because they are popular.

Do not build complex features before they are needed.

Use reusable components and avoid duplicated code.

Keep database logic, business logic, and UI components reasonably separated.

Follow current stable versions and official documentation for the selected technologies.

---

## 9. Development Roadmap

Build Lifolio incrementally.

### Phase 1: Foundation
- Initialize Next.js.
- Configure TypeScript.
- Configure Tailwind CSS and shadcn/ui.
- Connect Supabase.
- Configure authentication.
- Implement login and signup.
- Implement protected routes.
- Create initial dashboard layout.
- Deploy a basic working application to Vercel.

### Phase 2: Core Collection System
- Design database schema.
- Create collections.
- Create entries.
- Implement CRUD functionality.
- Add search and filtering.
- Add collection-specific views.

### Phase 3: Dynamic Collections
- Create collection templates.
- Implement custom fields.
- Generate collection pages dynamically.
- Generate forms dynamically.
- Implement grid and list layouts.

### Phase 4: Initial Tracking Modules
- Movies and TV Shows.
- Books.
- Watches.
- Shoes.

### Phase 5: Dashboard and Additional Features
- Statistics.
- Activity timeline.
- Wishlist.
- Image uploads.
- Data export.
- Additional collection types.

---

## 10. How I Want You to Work

Do not immediately generate the entire application.

First, analyze the requirements and propose:

1. A suitable architecture.
2. The complete database schema.
3. The authentication and security design.
4. The dynamic collection implementation approach.
5. The recommended folder structure.
6. The development roadmap.
7. Any potential architectural problems or overengineering.

Identify weak decisions and suggest improvements.

Be critical of the architecture rather than blindly agreeing with every requirement.

Explain important technical decisions in simple terms.

After presenting the architecture, wait for my approval before beginning implementation.

Once approved, implement the application incrementally, ensuring each phase works correctly before moving to the next.

The final goal is a beautiful, private, extensible personal website called **Lifolio** that I can continuously expand throughout my life.

## 11. Automatic Image and Metadata Lookup

A key requirement for Lifolio is minimizing manual data entry.

I do not want to manually upload images for every movie, book, watch, shoe, or other collection entry.

Implement a reusable image and metadata lookup system.

### Core User Experience

When creating an entry:

1. The user enters an item name.
2. Lifolio searches the appropriate external provider.
3. Display matching results with images and relevant metadata.
4. The user selects the correct result.
5. Automatically populate available information.
6. Allow the user to edit the information before saving.

For example, when adding a movie, entering its title should automatically retrieve its poster, release year, description, and other available metadata.

### Initial Providers

- TMDB API for movies and TV shows.
- Google Books API and/or Open Library API for books.
- Generic image lookup provider for other collection types.
- Manual image URL and image upload as fallback.

Do not integrate unnecessary APIs initially.

### Architecture

Create a reusable provider-based lookup architecture.

For example:

- Movie metadata provider.
- Book metadata provider.
- Generic image provider.
- Manual image provider.

Collection types should determine which providers are available.

The architecture should allow additional providers to be added later without modifying the core collection system.

### Important Requirements

- Keep API credentials server-side.
- Use environment variables for API keys.
- Never expose secrets in client-side code.
- Implement appropriate loading, error, and empty-result states.
- Allow users to select from multiple search results.
- Allow manual image selection when automatic lookup fails.
- Cache results where appropriate.
- Avoid unnecessary external API calls.
- Respect provider API terms, image attribution requirements, and licensing restrictions.
- Do not automatically scrape websites.
- Do not use AI-generated images as substitutes for actual movie posters, book covers, or product photographs.

### Database

Store relevant image information:

- Image URL or storage path.
- Image source.
- External provider.
- External item identifier.

Use Supabase Storage for user-uploaded images.

For external images, follow the relevant provider's usage requirements.

### Development Approach

Do not implement every provider immediately.

First, design the lookup architecture and implement TMDB integration as the initial example.

Then extend the same architecture to books and other collections.

Keep the feature simple and reusable.
