# 🎬 REEL - Cinema Discovery App

REEL is a modern, responsive web application designed to help film enthusiasts discover their next favorite movie. Built with React, Vite, and Express, it uses The Movie Database (TMDB) API to provide tailored movie recommendations based on user mood, preferred genres, era, and specific cinematic preferences.

## ✨ Features

- **Mood-Based Recommendations**: Select how you're feeling (e.g., "Mind-bending and cerebral", "Heartwarming and feel-good") to find perfectly matched films.
- **Granular Filtering**: Filter by specific genres and release eras.
- **Advanced Preferences**: Discover hidden gems, foreign language films, critically acclaimed works, short-runtime movies, and director-driven auteur cinema.
- **"Surprise Me" Option**: Can't decide? Let the app randomly select a mood, genre, and era to recommend something completely unexpected.
- **Where to Watch**: See which streaming platforms (US) currently offer the recommended movies.
- **Dark/Light Mode**: Toggle between themes for an optimal viewing experience.
- **Rich Movie Details**: View movie posters, overviews, directors, TMDB ratings, and a custom "vibe score".

## 🚀 Tech Stack

- **Frontend**: React (v18), Vite, CSS3
- **Backend**: Express.js, Node.js
- **API Requests**: Axios
- **External API**: [TMDB (The Movie Database) API](https://developer.themoviedb.org/docs)

## 🛠️ Installation & Setup

### Prerequisites

- Node.js installed on your machine.
- A free API key from [TMDB](https://www.themoviedb.org/settings/api).

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd movie-recommender
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory of the project and add your TMDB API key:

```env
VITE_TMDB_API_KEY=your_tmdb_api_key_here
```

### 4. Run the application

You need to run both the backend server and the frontend development server.

**Start the Express Backend Server:**
In a terminal, run:
```bash
npm run server
```
*(The server will start on `http://localhost:3001`)*

**Start the Vite Frontend Server:**
Open a new terminal window/tab and run:
```bash
npm run dev
```
*(The app will be available at `http://localhost:5173` or another port specified by Vite)*

## 📂 Project Structure

- `/src`: Contains the React frontend code (Components, Styles, App.jsx, main.jsx).
- `/server.js`: The Express backend that handles API requests to TMDB, protecting the API key and processing data (like fetching streaming providers).
- `package.json`: Project dependencies and npm scripts (`dev`, `server`, `build`, `preview`).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
