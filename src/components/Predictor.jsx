import { useState, useEffect } from 'react';
import axios from 'axios';
import { auth, db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

const Predictor = () => {
  const [predictions, setPredictions] = useState(Array(24).fill(''));
  const [actuals, setActuals] = useState(Array(24).fill(null));
  const [differences, setDifferences] = useState(Array(24).fill(null));

  useEffect(() => {
    const fetchActuals = async () => {
      try {
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly');
        const prices = response.data.prices.map(p => Math.round(p[1])).slice(-24);
        setActuals(prices);
      } catch (error) {
        console.error('Error fetching prices:', error);
      }
    };
    fetchActuals();
    const interval = setInterval(fetchActuals, 3600000); // Hourly
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (actuals.length > 0) {
      const diffs = predictions.map((p, i) => actuals[i] && p ? ((Math.abs(p - actuals[i]) / actuals[i]) * 100).toFixed(2) : null);
      setDifferences(diffs);
    }
  }, [actuals, predictions]);

  const handleSubmit = async () => {
    if (!auth.currentUser) return alert('Please log in');
    try {
      await addDoc(collection(db, 'predictions'), {
        userId: auth.currentUser.uid,
        predictions: predictions.map(p => parseInt(p) || 0),
        date: new Date().toISOString().split('T')[0],
        submittedAt: new Date(),
      });
      alert('Predictions submitted!');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div>
      <h2>Bitcoin Hourly Price Predictor (UTC)</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Hour</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Prediction (USD)</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Actual (USD)</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>% Difference</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 24 }, (_, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{i}:00 - {i + 1}:00</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <input
                  type="number"
                  value={predictions[i]}
                  onChange={(e) => {
                    const newPreds = [...predictions];
                    newPreds[i] = e.target.value;
                    setPredictions(newPreds);
                  }}
                  min="0"
                  style={{ width: '100px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{actuals[i] || 'Pending'}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{differences[i] ? `${differences[i]}%` : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={handleSubmit} style={{ marginTop: '10px', padding: '8px' }}>Submit Predictions</button>
    </div>
  );
};

export default Predictor;