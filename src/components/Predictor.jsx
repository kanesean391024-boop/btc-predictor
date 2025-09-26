import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

const Predictor = () => {
  const [predictions, setPredictions] = useState(Array(24).fill(''));
  const [differences, setDifferences] = useState(Array(24).fill(null));
  const [errorMessage, setErrorMessage] = useState('');
  const currentHour = new Date().getUTCHours();
  const staticActuals = [2650, 2655, 2660, 2658, 2662, 2665, 2670, 2668, 2665, 2660, 2655, 2650, 2645, 2640, 2635, 2640, 2645, 2650, 2655, 2660, 2665, 2670, 2668, 2665];

  const handlePredictionChange = (index, value) => {
    const newPredictions = [...predictions];
    newPredictions[index] = value === '' ? '' : parseFloat(value);
    setPredictions(newPredictions);
    updateDifferences(index, newPredictions[index]);
  };

  const updateDifferences = (index, pred) => {
    if (staticActuals[index] && pred !== '') {
      const diff = Math.abs(pred - staticActuals[index]) / staticActuals[index] * 100;
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
      username: 'Anonymous', // Placeholder until username fetch is added
      predictions,
      actuals: staticActuals,
      date: today,
      submittedAt: new Date(),
    });
    alert('Predictions submitted!');
  };

  return (
    <div>
      <h2>Ethereum Hourly Price Predictor (UTC)</h2>
      <p>Current Price: $2650 (Static for Demo)</p>
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
              <td>{staticActuals[i] ? `$${staticActuals[i].toFixed(2)}` : 'N/A'}</td>
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
