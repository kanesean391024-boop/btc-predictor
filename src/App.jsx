import { useState, useEffect } from 'react';
import { auth } from './firebase';
import Register from './components/Register';
import Login from './components/Login';
import Predictor from './components/Predictor';
import Leaderboard from './components/Leaderboard';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('auth');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return unsubscribe;
  }, []);

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <h1>Crypto Hourly Price Predictor</h1>
        <Register />
        <Login />
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h1>Crypto Hourly Price Predictor</h1>
      <button onClick={() => auth.signOut()}>Logout</button>
      {view === 'predict' && <Predictor />}
      {view === 'leaderboard' && <Leaderboard />}
      <button onClick={() => setView(view === 'predict' ? 'leaderboard' : 'predict')}>
        {view === 'predict' ? 'View Leaderboard' : 'Make Prediction'}
      </button>
    </div>
  );
}

export default App;
