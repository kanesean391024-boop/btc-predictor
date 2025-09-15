import { useState, useEffect } from 'react';
import axios from 'axios';
import { auth, db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

const Predictor = () => {
  const [predictions, setPredictions] = useState(Array(24).fill(''));
  const [actuals, setActuals] = useState(Array(24).fill(null));
  const [differences, setDifferences] = useState(Array(24).fill(null));

  // Fetch BTC hourly prices from CoinGecko (UTC-aligned, last 24 hours)
  const fetchActuals = async () => {
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly');
      let prices = response.data.prices; // Array of [timestamp_ms, price]

      // Get current UTC time and calculate the start of the last 24 full hours (00:00-01:00, etc.)
      const now = new Date();
      const currentHour = now.getUTCHours(); // Current UTC hour (0-23)
      const startOfDay = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0); // Start of current UTC day (00:00)
      const oneHourMs = 60 * 60 * 1000; // 1 hour in milliseconds

      // Filter to the last 24 full hours (from 00:00 yesterday to 23:00 today, excluding current incomplete hour)
      const targetTimestamps = [];
      for (let h = 0; h < 24; h++) {
        const targetTime = new Date(startOfDay.getTime() - oneHourMs + (h * oneHourMs)); // Back from start of day
        targetTimestamps.push(targetTime.getTime()); // Convert to ms
      }

      // Map API prices to target hours (find closest timestamp, use as closing price for that hour)
      const hourlyPrices = targetTimestamps.map(targetTs => {
        let closestPrice = null;
        let minDiff = Infinity;
        prices.forEach(([ts, price]) => {
          const diff = Math.abs(ts - targetTs);
          if (diff < minDiff) {
            minDiff = diff;
            closestPrice = Math.round(price); // Round to whole USD
          }
        });
        return closestPrice || null; // Fallback if no match
      });

      setActuals(hourlyPrices);
      console.log('Loaded hourly BTC prices:', hourlyPrices); // Debug log
    } catch (error) {
      console.error('Error fetching BTC prices:', error);
      setActuals(Array(24).fill('Error')); // Fallback display
    }
  };

  // Update differences when predictions or actuals change
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

  // Initial fetch and hourly update (on the hour)
  useEffect(() => {
    fetchActuals(); // Fetch immediately on load

    // Set timer to fetch on the next full hour (UTC)
    const now = new Date();
    const msUntilNextHour = (60 - now.getUTCSeconds()) * 1000; // Wait until next minute 00 seconds
    const timer = setTimeout(() => {
      fetchActuals(); // Fetch on the hour
      // Set interval for every hour after that
      const hourlyInterval = setInterval(fetchActuals, 60 * 60 * 1000); // 1 hour
      return () => clearInterval(hourlyInterval);
    }, msUntilNextHour);

    return () => clearTimeout(timer); // Cleanup
  }, []);

  // Submit predictions to Firestore
  const handleSubmit = async () => {
    if (!auth.currentUser) return alert('Please log in');
    try {
      await addDoc(collection(db, 'predictions'), {
        userId: auth.currentUser.uid,
        username: 'User', // Fetch from users collection if needed
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
      <p>Prices load on the hour (e.g., 00:00-01:00 uses price at 01:00 UTC). Actuals update hourly.</p>
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
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{i.toString().padStart(2, '0')}:00 - {(i + 1).toString().padStart(2, '0')}:00</td>
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
      <button onClick={handleSubmit} style={{ marginTop: '10px', padding: '8px' }} disabled={actuals.some(a => a === null || a === 'Error')}>Submit Predictions</button>
    </div>
  );
};

export default Predictor;
