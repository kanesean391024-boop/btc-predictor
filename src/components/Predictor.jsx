import { useState, useEffect } from 'react';
import axios from 'axios';
import { auth, db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

const Predictor = () => {
  const [predictions, setPredictions] = useState(Array(24).fill(''));
  const [actuals, setActuals] = useState(Array(24).fill(null));
  const [differences, setDifferences] = useState(Array(24).fill(null));
  const [errorMessage, setErrorMessage] = useState('');

  const fetchActuals = async () => {
    try {
      // Proxy to bypass CORS (temporary, replace with your own if needed)
      const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
      const response = await axios.get(`${proxyUrl}https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24`);
      const prices = response.data.map(candle => Math.round(parseFloat(candle[4]))); // 24 unique hourly closing prices

      if (prices.length !== 24) throw new Error('Incomplete data');

      setActuals(prices);
      setErrorMessage('');
      console.log('Binance hourly prices:', prices);
    } catch (error) {
      console.error('Binance error:', error.message, error.response?.status);
      setErrorMessage(`Error: ${error.message} (Status: ${error.response?.status || 'N/A'})`);
      setActuals(Array(24).fill('Error'));
    }
  };

  useEffect(() => {
    if (actuals.length > 0 && actuals.every(a => typeof a === 'number')) {
      const diffs = predictions.map((p, i) => {
        const predNum = parseFloat(p);
        if (actuals[i] && predNum) {
          return ((Math.abs(predNum - actuals[i]) / actuals[i]) * 100).toFixed(2);
        }
        return null;
      });
      setDifferences(diffs);
    }
  }, [actuals, predictions]);

  useEffect(() => {
    fetchActuals();
    const now = new Date();
    const msUntilNextHour = (60 - now.getUTCSeconds()) * 1000;
    const timer = setTimeout(() => {
      fetchActuals();
      const interval = setInterval(fetchActuals, 60 * 60 * 1000); // Hourly
      return () => clearInterval(interval);
    }, msUntilNextHour);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async () => {
    if (!auth.currentUser) return alert('Please log in');
    try {
      await addDoc(collection(db, 'predictions'), {
        userId: auth.currentUser.uid,
        predictions: predictions.map(p => parseInt(p) or 0),
        actuals,
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
      <p>Prices for {new Date().toISOString().split('T')[0]} (UTC). Updates hourly.</p>
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Hour (UTC)</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Prediction (USD)</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Actual (USD)</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>% Difference</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 24 }, (_, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {i.toString().padStart(2, '0')}:00 - {(i + 1).toString().padStart(2, '0')}:00
              </td>
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
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{actuals[i] || 'Loading...'}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{differences[i] ? `${differences[i]}%` : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={handleSubmit} style={{ marginTop: '10px', padding: '8px' }} disabled={actuals.some(a => a === null || a === 'Error')}>
        Submit Predictions
      </button>
    </div>
  );
};

export default Predictor;
