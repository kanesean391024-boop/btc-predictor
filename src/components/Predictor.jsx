import { useState, useEffect } from 'react';
import axios from 'axios';
import { auth, db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

const Predictor = () => {
  const [predictions, setPredictions] = useState(Array(24).fill(''));
  const [actuals, setActuals] = useState(Array(24).fill(null));
  const [differences, setDifferences] = useState(Array(24).fill(null));
  const [errorMessage, setErrorMessage] = useState(''); // For debugging

  // Fetch BTC hourly prices from CoinGecko
  const fetchActuals = async () => {
    try {
      // Try primary endpoint (hourly data)
      const response = await axios.get('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly');
      let prices = response.data.prices; // [timestamp_ms, price]

      if (!prices || prices.length === 0) {
        throw new Error('Empty or invalid response from CoinGecko');
      }

      // Get current UTC time, align to last 24 full hours
      const now = new Date();
      const startOfDay = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0);
      const oneHourMs = 60 * 60 * 1000;
      const targetTimestamps = Array.from({ length: 24 }, (_, h) => 
        new Date(startOfDay.getTime() - oneHourMs + (h * oneHourMs)).getTime()
      );

      // Map prices to target hours
      const hourlyPrices = targetTimestamps.map(targetTs => {
        let closestPrice = null;
        let minDiff = Infinity;
        prices.forEach(([ts, price]) => {
          const diff = Math.abs(ts - targetTs);
          if (diff < minDiff) {
            minDiff = diff;
            closestPrice = Math.round(price);
          }
        });
        return closestPrice || null;
      });

      setActuals(hourlyPrices);
      setErrorMessage(''); // Clear error on success
      console.log('Loaded BTC prices:', hourlyPrices, 'Timestamps:', targetTimestamps);
    } catch (error) {
      console.error('Fetch error:', error.message, error.response?.status, error.response?.data);
      setErrorMessage(`API Error: ${error.message} (Status: ${error.response?.status || 'N/A'})`);
      // Fallback to single price endpoint
      try {
        const fallback = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        const price = Math.round(fallback.data.bitcoin.usd);
        setActuals(Array(24).fill(price)); // Fill with current price for testing
        setErrorMessage('Using fallback price');
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError.message);
        setActuals(Array(24).fill('Error'));
        setErrorMessage(`Fallback failed: ${fallbackError.message}`);
      }
    }
  };

  // Update differences
  useEffect(() => {
    if (actuals.length > 0 && actuals.every(a => a !== null && a !== 'Error')) {
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

  // Fetch on load and hourly
  useEffect(() => {
    fetchActuals();
    const now = new Date();
    const msUntilNextHour = (60 - now.getUTCSeconds()) * 1000;
    const timer = setTimeout(() => {
      fetchActuals();
      const interval = setInterval(fetchActuals, 60 * 60 * 1000);
      return () => clearInterval(interval);
    }, msUntilNextHour);
    return () => clearTimeout(timer);
  }, []);

  // Submit predictions
  const handleSubmit = async () => {
    if (!auth.currentUser) return alert('Please log in');
    try {
      await addDoc(collection(db, 'predictions'), {
        userId: auth.currentUser.uid,
        predictions: predictions.map(p => parseInt(p) || 0),
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
