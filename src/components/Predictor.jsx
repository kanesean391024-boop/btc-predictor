import { useState, useEffect } from 'react';
import axios from 'axios';
import { auth, db } from '../firebase';
import { collection, addDoc, doc, updateDoc, getDoc, query, where, getDocs } from 'firebase/firestore';

const Predictor = () => {
  const [predictions, setPredictions] = useState(Array(24).fill(''));
  const [actuals, setActuals] = useState(Array(24).fill('Pending'));
  const [differences, setDifferences] = useState(Array(24).fill(null));
  const [errorMessage, setErrorMessage] = useState('');
  const [currentHour, setCurrentHour] = useState(new Date().getUTCHours());

  const fetchActuals = async () => {
    try {
      const response = await axios.get('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24');
      const prices = response.data.map(candle => Math.round(parseFloat(candle[4]))); // 24 unique closing prices

      if (prices.length !== 24) throw new Error('Incomplete data');

      const now = new Date();
      const newCurrentHour = now.getUTCHours();
      setCurrentHour(newCurrentHour);

      const alignedActuals = Array(24).fill('Pending');
      for (let i = 0; i < 24; i++) {
        if (i < newCurrentHour) {
          alignedActuals[i] = prices[prices.length - 1 - (newCurrentHour - 1 - i)]; // Align to last 24 full hours
        }
      }

      setActuals(alignedActuals);
      setErrorMessage('');
      console.log('Binance prices:', alignedActuals);
    } catch (error) {
      console.error('Fetch error:', error.message);
      setErrorMessage(`Error: ${error.message}`);
      setActuals(Array(24).fill('Error'));
    }
  };

  useEffect(() => {
    if (actuals.length > 0) {
      const diffs = predictions.map((p, i) => {
        const predNum = parseFloat(p);
        if (typeof actuals[i] === 'number' && predNum) {
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
    const msUntilNextMinute = (60 - now.getUTCSeconds()) * 1000 + (now.getUTCMinutes() % 3 === 0 ? 0 : (3 - now.getUTCMinutes() % 3) * 60 * 1000); // Every 3 min
    const timer = setTimeout(() => {
      fetchActuals();
      const interval = setInterval(fetchActuals, 3 * 60 * 1000);
      return () => clearInterval(interval);
    }, msUntilNextMinute);
    return () => clearTimeout(timer);
  }, []);

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

  const tallyScores = async () => {
    if (!auth.currentUser) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const q = query(collection(db, 'predictions'), where('userId', '==', auth.currentUser.uid), where('date', '==', today));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;

      const predictionData = snapshot.docs[0].data();
      const points = predictionData.predictions.reduce((sum, pred, i) => {
        if (typeof predictionData.actuals[i] === 'number') {
          const diff = Math.abs(pred - predictionData.actuals[i]) / predictionData.actuals[i] * 100;
          return sum + (diff <= 1 ? 10 : diff <= 2 ? 5 : diff <= 5 ? 2 : 0);
        }
        return sum;
      }, 0);

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      const currentPoints = userDoc.data().points || 0;
      await updateDoc(userRef, { points: currentPoints + points });
      alert(`Tally: +${points} points!`);
    } catch (error) {
      console.error('Tally error:', error);
    }
  };

  // Daily tally at 00:03 UTC
  useEffect(() => {
    const now = new Date();
    const msUntilNextDay = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 3, 0).getTime() - now.getTime();
    const dailyTallyTimer = setTimeout(tallyScores, msUntilNextDay);
    return () => clearTimeout(dailyTallyTimer);
  }, []);

  return (
    <div>
      <h2>Bitcoin Hourly Price Predictor (UTC)</h2>
      <p>Prices for {new Date().toISOString().split('T')[0]} (UTC). Pending for future hours. Tally at midnight UTC.</p>
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
                  disabled={i >= currentHour}
                  style={{ width: '100px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{actuals[i]}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{differences[i] ? `${differences[i]}%` : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={handleSubmit} style={{ marginTop: '10px', padding: '8px' }} disabled={actuals.some(a => a === 'Error')}>
        Submit Predictions
      </button>
    </div>
  );
};

export default Predictor;
