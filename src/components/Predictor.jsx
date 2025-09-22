```jsx
     import React, { useState, useEffect } from 'react';
     import { db, auth } from '../firebase'; // Adjust path to your Firebase config
     import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

     const Predictor = () => {
       const [price, setPrice] = useState(null);
       const [actuals, setActuals] = useState(Array(24).fill(null));
       const [predictions, setPredictions] = useState(Array(24).fill(''));
       const [differences, setDifferences] = useState(Array(24).fill(null));
       const [errorMessage, setErrorMessage] = useState('');
       const currentHour = new Date().getUTCHours();

       // Fetch ETH price hourly
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

       // Calculate differences
       useEffect(() => {
         if (actuals.some(a => a !== null)) {
           const diffs = predictions.map((p, i) => {
             const predNum = parseFloat(p);
             if (typeof actuals[i] === 'number' && !isNaN(predNum)) {
               const diff = ((Math.abs(predNum - actuals[i]) / actuals[i]) * 100);
               return diff.toFixed(2);
             }
             return null;
           });
           setDifferences(diffs);
         }
       }, [actuals, predictions]);

       // Submit predictions to Firebase
       const handleSubmit = async () => {
         if (!auth.currentUser) return alert('Please log in');
         try {
           await addDoc(collection(db, 'predictions'), {
             userId: auth.currentUser.uid,
             predictions: predictions.map(p => parseFloat(p) || 0),
             actuals,
             date: new Date().toISOString().split('T')[0],
             submittedAt: new Date(),
           });
           alert('Predictions submitted!');
         } catch (error) {
           alert('Submit error: ' + error.message);
         }
       };

       // Tally scores
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
           const currentPoints = userDoc.data()?.points || 0;
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
           <h2>Ethereum Hourly Price Predictor (UTC)</h2>
           <p>Current Price: {price ? `$${price}` : 'Loading...'}</p>
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
               {Array.from
