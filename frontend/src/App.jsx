import { useEffect, useMemo, useState } from 'react';

const emptyForm = {
  name: '',
  type: 'Creature',
  rarity: 'Common',
  attack: 0,
  defense: 0,
  description: '',
  imageUrl: ''
};

async function request(path, options = {}) {
  const fetchOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  };

  const response = await fetch(path, fetchOptions);

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.details = Array.isArray(data.details) ? data.details : [];
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

function formatErrorMessage(error) {
  if (!error?.details?.length) {
    return error?.message || 'Request failed';
  }

  const details = error.details
    .map((detail) => `- ${detail.field}: ${detail.message}`)
    .join('\n');

  return `${error.message}\n${details}`;
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [cards, setCards] = useState([]);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: 'demo', password: 'demo1234' });
  const [cardForm, setCardForm] = useState(emptyForm);
  const [editingCardId, setEditingCardId] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setUser(null);
      setCards([]);
      return;
    }

    localStorage.setItem('token', token);

    (async () => {
      try {
        const me = await request('/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const cardData = await request('/api/cards', {
          headers: { Authorization: `Bearer ${token}` }
        });

        setUser(me.user);
        setCards(cardData.cards);
      } catch (err) {
        setError(err.message);
        setToken('');
        localStorage.removeItem('token');
      }
    })();
  }, [token]);

  const sortedCards = useMemo(() => [...cards], [cards]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setError('');
    setStatus('');

    try {
      const data = await request(`/api/auth/${authMode}`, {
        method: 'POST',
        body: JSON.stringify(authForm)
      });

      setToken(data.token);
      setUser(data.user);
      setStatus(authMode === 'login' ? 'Welcome back.' : 'Account created.');
    } catch (err) {
      setError(formatErrorMessage(err));
    }
  }

  async function loadCards(currentToken) {
    const data = await request('/api/cards', {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    setCards(data.cards);
  }

  async function handleCardSubmit(event) {
    event.preventDefault();
    setError('');
    setStatus('');

    try {
      const method = editingCardId ? 'PUT' : 'POST';
      const path = editingCardId ? `/api/cards/${editingCardId}` : '/api/cards';

      await request(path, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(cardForm)
      });

      setCardForm(emptyForm);
      setEditingCardId(null);
      await loadCards(token);
      setStatus(editingCardId ? 'Card updated.' : 'Card created.');
    } catch (err) {
      setError(formatErrorMessage(err));
    }
  }

  function startEdit(card) {
    setEditingCardId(card.id);
    setCardForm({
      name: card.name,
      type: card.type,
      rarity: card.rarity,
      attack: card.attack,
      defense: card.defense,
      description: card.description,
      imageUrl: card.imageUrl
    });
  }

  async function removeCard(cardId) {
    setError('');
    setStatus('');

    try {
      await request(`/api/cards/${cardId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      await loadCards(token);
      setStatus('Card deleted.');
    } catch (err) {
      setError(formatErrorMessage(err));
    }
  }

  function signOut() {
    setToken('');
    setUser(null);
    setCards([]);
    setCardForm(emptyForm);
    setEditingCardId(null);
    localStorage.removeItem('token');
  }

  async function clearCache() {
    setError('');
    setStatus('');
    if (!token || !user) {
      setError('You must be signed in to delete your cards.');
      return;
    }

    if (!window.confirm('Delete all cards you created? This cannot be undone.')) return;

    try {
      setStatus('Deleting your cards...');

      const myCards = cards.filter((c) => c.ownerId === user.id);

      await Promise.all(
        myCards.map((c) => request(`/api/cards/${c.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }))
      );

      await loadCards(token);
      setStatus(`Deleted ${myCards.length} card(s).`);
    } catch (err) {
      setError(formatErrorMessage(err));
      setStatus('');
    }
  }

  return (
    <div className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Make your own collectible card game!</p>
          <h1>Card Forge API</h1>
          <p className="lede">
            A beginner-friendly collectible card game server with token-based auth and a working browser client.
          </p>
        </div>
        <div className="hero-card">
          <strong>Try it fast</strong>
          <p>Use the demo account or create a new one, then manage cards from the UI.</p>
          <code>demo / demo1234</code>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button className="secondary" onClick={() => { navigator.clipboard && navigator.clipboard.writeText('demo / demo1234'); }}>Copy creds</button>
            <button className="secondary" onClick={clearCache}>Clear cache</button>
          </div>
        </div>
      </header>

      <main className="grid">
        <section className="panel">
          <div className="panel-head">
            <h2>{token ? 'Signed in' : authMode === 'login' ? 'Login' : 'Register'}</h2>
            {token ? (
              <button className="secondary" onClick={signOut}>Sign out</button>
            ) : (
              <button className="secondary" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                Switch to {authMode === 'login' ? 'register' : 'login'}
              </button>
            )}
          </div>

          {!token ? (
            <form className="form" onSubmit={handleAuthSubmit}>
              <label>
                Username
                <input
                  value={authForm.username}
                  onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                  required
                />
              </label>
              <button type="submit">{authMode === 'login' ? 'Login' : 'Create account'}</button>
            </form>
          ) : (
            <div className="session">
              <p>Signed in as <strong>{user?.username}</strong></p>
              <p className="muted">Token stored in localStorage for the browser session.</p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>{editingCardId ? 'Edit card' : 'Create card'}</h2>
            {editingCardId ? <button className="secondary" onClick={() => { setEditingCardId(null); setCardForm(emptyForm); }}>Cancel</button> : null}
          </div>

          <p className="muted form-note">Only name is required. Type, rarity, stats, description, and image URL all have defaults.</p>

          <form className="form" onSubmit={handleCardSubmit}>
            <div className="two-up">
              <label>
                Name
                <input value={cardForm.name} onChange={(event) => setCardForm({ ...cardForm, name: event.target.value })} required />
              </label>
              <label>
                Type (optional)
                <select value={cardForm.type} onChange={(event) => setCardForm({ ...cardForm, type: event.target.value })}>
                  <option>Creature</option>
                  <option>Spell</option>
                  <option>Artifact</option>
                  <option>Legendary</option>
                </select>
              </label>
            </div>
            <div className="two-up">
              <label>
                Rarity (optional)
                <select value={cardForm.rarity} onChange={(event) => setCardForm({ ...cardForm, rarity: event.target.value })}>
                  <option>Common</option>
                  <option>Uncommon</option>
                  <option>Rare</option>
                  <option>Epic</option>
                  <option>Mythic</option>
                </select>
              </label>
              <label>
                Image URL (optional)
                <input value={cardForm.imageUrl} onChange={(event) => setCardForm({ ...cardForm, imageUrl: event.target.value })} />
              </label>
            </div>
            <div className="two-up">
              <label>
                Attack (optional)
                <input type="number" value={cardForm.attack} onChange={(event) => setCardForm({ ...cardForm, attack: Number(event.target.value) })} />
              </label>
              <label>
                Defense (optional)
                <input type="number" value={cardForm.defense} onChange={(event) => setCardForm({ ...cardForm, defense: Number(event.target.value) })} />
              </label>
            </div>
            <label>
              Description (optional)
              <textarea rows="4" value={cardForm.description} onChange={(event) => setCardForm({ ...cardForm, description: event.target.value })} />
            </label>
            <button type="submit" disabled={!token}>{editingCardId ? 'Update card' : 'Create card'}</button>
          </form>
        </section>

        <section className="panel cards-panel">
          <div className="panel-head">
            <h2>Cards</h2>
            <span className="muted">{sortedCards.length} total</span>
          </div>

          <div className="cards">
            {sortedCards.map((card) => (
              <article key={card.id} className="card">
                {card.imageUrl ? <img src={card.imageUrl} alt={card.name} /> : <div className="placeholder" />}
                <div className="card-body">
                  <div className="card-top">
                    <h3>{card.name}</h3>
                    <span>{card.rarity}</span>
                  </div>
                  <p className="muted">{card.type}</p>
                  <p>{card.description}</p>
                  <div className="stats">
                    <span>ATK {card.attack}</span>
                    <span>DEF {card.defense}</span>
                  </div>
                  {user?.id === card.ownerId ? (
                    <div className="actions">
                      <button className="secondary" onClick={() => startEdit(card)}>Edit</button>
                      <button className="danger" onClick={() => removeCard(card.id)}>Delete</button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {(status || error) ? (
        <footer className="message-row">
          {status ? <p className="status">{status}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </footer>
      ) : null}
    </div>
  );
}