import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import ast
import os
import requests

app = Flask(__name__)
CORS(app)

TMDB_KEY = os.getenv('VITE_TMDB_API_KEY', '')

# Load data
print("Loading dataset...")
movies_df = pd.read_csv('../tmdb_5000_movies.csv')
credits_df = pd.read_csv('../tmdb_5000_credits.csv')

credits_df.rename(columns={'movie_id': 'id'}, inplace=True)
df = movies_df.merge(credits_df[['id', 'cast', 'crew']], on='id', how='left')

def parse_names(obj, key='name', limit=3):
    try:
        items = ast.literal_eval(obj)
        return [i[key] for i in items[:limit]]
    except:
        return []

def get_director(crew_str):
    try:
        crew = ast.literal_eval(crew_str)
        for c in crew:
            if c.get('job') == 'Director':
                return c.get('name', '')
        return ''
    except:
        return ''

print("Processing features...")
df['genres_list']    = df['genres'].apply(lambda x: parse_names(x))
df['keywords_list']  = df['keywords'].apply(lambda x: parse_names(x))
df['cast_list']      = df['cast'].apply(lambda x: parse_names(x, limit=3))
df['director']       = df['crew'].apply(get_director)
df['genres_clean']   = df['genres_list'].apply(lambda x: [g.replace(' ','') for g in x])
df['keywords_clean'] = df['keywords_list'].apply(lambda x: [k.replace(' ','') for k in x])
df['cast_clean']     = df['cast_list'].apply(lambda x: [c.replace(' ','') for c in x])
df['director_clean'] = df['director'].apply(lambda x: x.replace(' ',''))

def build_soup(row):
    genres   = ' '.join(row['genres_clean'])
    keywords = ' '.join(row['keywords_clean'])
    cast     = ' '.join(row['cast_clean'])
    director = row['director_clean'] + ' ' + row['director_clean']
    overview = str(row['overview']) if pd.notna(row['overview']) else ''
    return f"{genres} {genres} {keywords} {cast} {director} {overview}"

df['soup'] = df.apply(build_soup, axis=1)
df = df.dropna(subset=['title']).reset_index(drop=True)

print("Building TF-IDF matrix...")
tfidf = TfidfVectorizer(stop_words='english', max_features=10000)
tfidf_matrix = tfidf.fit_transform(df['soup'])
content_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)

print("Building collaborative similarity...")
df['vote_average'] = pd.to_numeric(df['vote_average'], errors='coerce').fillna(0)
df['vote_count']   = pd.to_numeric(df['vote_count'],   errors='coerce').fillna(0)
df['popularity']   = pd.to_numeric(df['popularity'],   errors='coerce').fillna(0)

def norm(s):
    mn, mx = s.min(), s.max()
    return (s - mn) / (mx - mn) if mx != mn else s * 0

rating_matrix = np.column_stack([norm(df['vote_average']).values, norm(df['popularity']).values, norm(df['vote_count']).values])
collab_sim = cosine_similarity(rating_matrix, rating_matrix)
hybrid_sim = 0.7 * content_sim + 0.3 * collab_sim

print(f"Model ready — {len(df)} movies loaded")

genre_map = {
    'Drama':'Drama','Sci-Fi':'Science Fiction','Horror':'Horror','Comedy':'Comedy',
    'Thriller':'Thriller','Action':'Action','Fantasy':'Fantasy','Romance':'Romance',
    'Documentary':'Documentary','Animation':'Animation','Crime':'Crime',
    'Mystery':'Mystery','Historical':'History','Art-house':'Music'
}

mood_sort = {
    'Mind-bending and cerebral':'vote_average',
    'Heartwarming and feel-good':'popularity',
    'Edge-of-seat thrilling':'popularity',
    'Laugh-out-loud funny':'popularity',
    'Deeply emotional and moving':'vote_average',
    'Dark and unsettling':'vote_average',
    'Epic and adventurous':'popularity',
    'Dreamy and surreal':'vote_average',
    'Thought-provoking and philosophical':'vote_average',
    'Romantic and intimate':'popularity',
}

era_ranges = {
    'Pre-1960s':(None,1959),'1960s-1970s':(1960,1979),
    '1980s-1990s':(1980,1999),'2000s-2010s':(2000,2019),'Any era':(None,None),
}

def fetch_poster(title, year):
    if not TMDB_KEY:
        return None
    try:
        url = f"https://api.themoviedb.org/3/search/movie?api_key={TMDB_KEY}&query={requests.utils.quote(str(title))}&year={year}"
        r = requests.get(url, timeout=5)
        results = r.json().get('results', [])
        if results and results[0].get('poster_path'):
            return f"https://image.tmdb.org/t/p/w500{results[0]['poster_path']}"
    except:
        pass
    return None

@app.route('/api/recommend', methods=['POST'])
def recommend():
    try:
        body   = request.get_json()
        mood   = body.get('mood', '')
        genres = body.get('genres', [])
        era    = body.get('era', 'Any era')
        prefs  = body.get('prefs', [])

        filtered = df.copy()
        filtered['year'] = pd.to_datetime(filtered['release_date'], errors='coerce').dt.year

        yr = era_ranges.get(era, (None, None))
        if yr[0]: filtered = filtered[filtered['year'] >= yr[0]]
        if yr[1]: filtered = filtered[filtered['year'] <= yr[1]]

        if genres:
            tmdb_genres = [genre_map.get(g, g) for g in genres]
            filtered = filtered[filtered['genres_list'].apply(lambda gl: any(tg in gl for tg in tmdb_genres))]

        if 'under 100 minutes runtime' in prefs:
            filtered = filtered[pd.to_numeric(filtered['runtime'], errors='coerce') <= 100]
        if 'hidden gems and underseen films' in prefs:
            filtered = filtered[filtered['vote_count'] < 1000]
        if 'critically acclaimed films' in prefs:
            filtered = filtered[filtered['vote_average'] >= 7.5]
        if 'non-English foreign films' in prefs:
            filtered = filtered[filtered['original_language'] != 'en']

        if len(filtered) < 10:
            filtered = df.copy()
            filtered['year'] = pd.to_datetime(filtered['release_date'], errors='coerce').dt.year

        sort_col = mood_sort.get(mood, 'vote_average')
        filtered = filtered.sort_values(sort_col, ascending=False)

        seed_idx = filtered.index[0]
        filtered_set = set(filtered.index.tolist())
        sim_scores = [(i, hybrid_sim[seed_idx][i]) for i in filtered_set if i != seed_idx]
        sim_scores.sort(key=lambda x: x[1], reverse=True)

        top_indices = [i for i, _ in sim_scores[:30]]
        if len(top_indices) > 10:
            top_indices = sorted(top_indices, key=lambda i: float(df.iloc[i]["vote_average"]), reverse=True)[:10]

        results = []
        for idx in top_indices:
            row = df.iloc[idx]
            year = int(row['year']) if pd.notna(row.get('year')) else '?'
            poster = fetch_poster(row['title'], year)
            results.append({
                'title':      row['title'],
                'year':       year,
                'director':   row['director'] or 'Unknown',
                'genres':     row['genres_list'][:3],
                'overview':   str(row['overview'])[:300] if pd.notna(row['overview']) else '',
                'poster':     poster,
                'tmdb_rating': round(float(row['vote_average']), 1),
                'vibe_score': min(5, round(float(row['vote_average']) / 2)),
                'why_watch':  f"Rated {round(float(row['vote_average']),1)}/10 by {int(row['vote_count']):,} viewers — recommended by our hybrid ML model."
            })

        return jsonify({'movies': results})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=3001, debug=False)
