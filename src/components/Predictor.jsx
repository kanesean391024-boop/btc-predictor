import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

const Predictor = () => {
  const [price, setPrice] = useState(null);
  const [actuals, setActuals] = useState(Array(24).fill(null));
  const [predictions, setPredictions] = useState(Array(24).fill(''));
  const [differences, setDifferences] = useState(Array(24).fill(null));
  const [errorMessage, setErrorMessage] = useState('');
  const currentHour = new Date().getUTCHours();

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(`https://api.etherscan.io/api?module=stats&action=ethprice&apikey=${process.env.REACT_APP_ETHERSCAN_API_KEY}`);
        const data = await res.json();
        if (data.status === '1') {
          setPrice(data.result.ethusd);
          setActuals(prev => {
            const newActuals = [...prev];
            newActuals[currentHour] = parseFloat(data.result.ethusd);
            return newActuals;
          });
        } else {
          setErrorMessage('Failed to fetch ETH price');
        }
      } catch (error) {
        setErrorMessage('Error fetching ETH price: ' + error.message);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 3600000); // Hourly updates
    return () => clearInterval(interval);
  }, [currentHour]);

  const handlePredictionChange = (index, value) => {
    const newPredictions = [...predictions];
    newPredictions[index] = value === '' ? '' : parseFloat(value);
    setPredictions(newPredictions);
    updateDifferences(index, newPredictions[index]);
  };

  const updateDifferences = (index, pred) => {
    if (actuals[index] && pred !== '') {
      const diff = Math.abs(pred - actuals[index]) / actuals[index] * 100;
      setDifferences(prev => {
        const newDiffs = [...prev];
        newDiffs[index] = diff;
        return newDiffs;
      });
    }
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) return;
    const today = new Date().toISOString().split('T')[0];
    await addDoc(collection(db, 'predictions'), {
      userId: auth.currentUser.uid,
      username: (await getDoc(doc(db, 'users', auth.currentUser.uid))).data().username,
      predictions,
      actuals,
      date: today,
      submittedAt: new Date(),
    });
    alert('Predictions submitted!');
  };

  return (
    <div>
      <h2>Ethereum Hourly Price Predictor (UTC)</h2>
      <p>Current Price: {price ? `$${price}` : 'Loading...'}</p>
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      <table>
        <thead>
          <tr>
            <th>Hour</th>
            <th>Actual Price ($)</th>
            <th>Your Prediction ($)</th>
            <th>% Difference</th>
          </tr>
        </thead>
        <tbody>
          {Array(24).fill().map((_, i) => (
            <tr key={i}>
              <td>{(i + currentHour) % 24}:00</td>
              <td>{actuals[i] ? `$${actuals[i].toFixed(2)}` : 'N/A'}</td>
              <td><input type="number" value={predictions[i]} onChange={(e) => handlePredictionChange(i, e.target.value)} placeholder="Predict" /></td>
              <td>{differences[i] !== null ? `${differences[i].toFixed(2)}%` : 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={handleSubmit}>Submit Predictions</button>
    </div>
  );
};

export default Predictor;
