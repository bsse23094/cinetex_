# 🎬 Cinetex

<div align="center">

![Cinetex Logo](https://img.shields.io/badge/Cinetex-Streaming%20Companion-00c67a?style=for-the-badge&logo=film&logoColor=white)

**Your modern streaming companion for movies, TV shows, and anime.**

[![Angular](https://img.shields.io/badge/Angular-19-dd0031?style=flat-square&logo=angular)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-f38020?style=flat-square&logo=cloudflare)](https://workers.cloudflare.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Live Demo](https://bsse23094.github.io/cinetex_/) • [Report Bug](https://github.com/bsse23094/cinetex_/issues) • [Request Feature](https://github.com/bsse23094/cinetex_/issues)

</div>

---

## ✨ Features

### 🎥 Content Discovery
- **Multi-source Search** - Search movies, TV shows, and anime from TMDB
- **Detailed Information** - View cast, crew, ratings, reviews, and similar titles
- **Category Browsing** - Browse popular movies, TV shows, and anime
- **Smart Filtering** - Filter by genre, year, and rating

### 🤖 CineBot AI Assistant
- **Movie Recommendations** - Get personalized suggestions based on your mood or preferences
- **Cast & Crew Info** - Ask about actors, directors, and filmographies
- **Movie Details** - Get quick info about any movie or TV show
- **Powered by Gemini AI** - Intelligent responses via Cloudflare Workers proxy

### 📚 Personal Library
- **Custom Lists** - Create and manage custom movie lists
- **Favorites** - Save your favorite movies and shows
- **Ratings** - Rate movies and track what you've watched
- **Watch Progress** - Resume where you left off

### 🎨 Modern Design
- **Dark Theme** - Sleek, Netflix-inspired dark interface
- **Typography-focused** - Clean, readable layouts with Syncopate & Elm Sans fonts
- **Smooth Animations** - Fluid transitions and micro-interactions
- **Responsive** - Optimized for desktop, tablet, and mobile

### 🔒 Privacy-First
- **No Accounts Required** - Start using immediately
- **Local Storage Only** - All data stays on your device
- **No Tracking** - Zero cookies, zero analytics
- **Full Control** - Clear your data anytime

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Angular CLI (`npm install -g @angular/cli`)

### Installation

```bash
# Clone the repository
git clone https://github.com/bsse23094/cinetex_.git
cd cinetex_

# Install dependencies
npm install

# Start development server
ng serve
```

Open [http://localhost:4200](http://localhost:4200) in your browser.

### Production Build

```bash
# Build for production
ng build --configuration production --base-href /cinetex_/

# The build artifacts will be in dist/cinetex/browser/
```

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── core/                    # Core services and models
│   │   ├── models/              # TypeScript interfaces
│   │   └── services/            # API services (TMDB, Chatbot, Storage)
│   ├── features/                # Feature modules
│   │   ├── lists/               # Custom lists management
│   │   ├── movie/               # Movie search, detail, player
│   │   └── user/                # Favorites, ratings, profile
│   ├── pages/                   # Static pages (About, Privacy, Terms)
│   └── shared/                  # Shared components and utilities
│       ├── components/          # Reusable UI components
│       │   ├── chatbot/         # CineBot AI assistant
│       │   ├── footer/          # App footer
│       │   ├── movie-card/      # Movie display card
│       │   └── ...
│       └── pipes/               # Custom Angular pipes
├── assets/                      # Static assets
├── environments/                # Environment configurations
└── styles.css                   # Global styles

cloudflare-worker/               # Cloudflare Worker for AI chatbot
├── worker.js                    # Worker script
├── wrangler.toml               # Wrangler configuration
└── README.md                   # Deployment instructions
```

---

## 🤖 CineBot Setup

CineBot uses a Cloudflare Worker to securely proxy requests to Google's Gemini AI.

### Cloudflare Worker Deployment

```bash
# Navigate to worker directory
cd cloudflare-worker

# Install Wrangler CLI (if not installed)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy the worker
wrangler deploy
```

The worker will be deployed to: `https://cinetex-chatbot.<your-subdomain>.workers.dev`

### Configuration

Update the worker URL in `src/app/core/services/chatbot.service.ts`:

```typescript
private readonly WORKER_URL = 'https://cinetex-chatbot.your-subdomain.workers.dev';
```

---

## 📱 Mobile Optimization

Cinetex is fully optimized for mobile devices:

- **Touch-friendly** - Large tap targets and swipe gestures
- **Responsive Layout** - Adapts to any screen size
- **Fast Loading** - Optimized assets and lazy loading
- **PWA Ready** - Can be installed as a mobile app

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Angular 19 |
| Language | TypeScript 5.0 |
| Styling | CSS3 with CSS Variables |
| Fonts | Syncopate, Elm Sans |
| Icons | Font Awesome 6 |
| API | TMDB (The Movie Database) |
| AI | Google Gemini via Cloudflare Workers |
| Hosting | GitHub Pages |

---

## 📄 Pages

| Page | Description |
|------|-------------|
| **Home** | Browse and search movies, TV shows, anime |
| **Movie Detail** | View comprehensive movie/show information |
| **My Library** | Manage custom lists |
| **Favorites** | View saved favorites |
| **Rated** | View your rated movies |
| **About** | Learn about Cinetex |
| **Privacy** | Privacy policy |
| **Terms** | Terms of service |

---

## 🚀 Deployment

### GitHub Pages

```bash
# Build for GitHub Pages
ng build --configuration production --base-href /cinetex_/

# Deploy using angular-cli-ghpages
npx angular-cli-ghpages --dir=dist/cinetex/browser
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for the movie database API
- [Google Gemini](https://deepmind.google/technologies/gemini/) for AI capabilities
- [Cloudflare Workers](https://workers.cloudflare.com/) for serverless infrastructure
- [Angular](https://angular.io/) for the awesome framework

---

<div align="center">

Made with ❤️ by [bsse23094](https://github.com/bsse23094)

⭐ Star this repo if you find it useful!

</div>
