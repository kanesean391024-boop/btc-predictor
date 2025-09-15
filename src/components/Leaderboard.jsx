import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const today = new Date().toISOString().split('T')[0];
      const q = query(collection(db, 'predictions'), where('date', '==', today));
      const snapshot = await getDocs(q);
      const scores = snapshot.docs.map(doc => {
        const data = doc.data();
        const points = data.predictions.reduce((sum, pred, i) => {
          if (data.actuals && data.actuals[i]) {
            const diff = Math.abs(pred - data.actuals[i]) / data.actuals[i] * 100;
            return sum + (diff <= 1 ? 10 : diff <= 2 ? 5 : diff <= 5 ? 2 : 0);
          }
          return sum;
        }, 0);
        return { ...data, points };
      });
      setLeaderboard(scores.sort((a, b) => b.points - a.points));
    };
    fetchLeaderboard();
  }, []);

  return (
    <div>
      <h2>Daily Leaderboard</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Rank</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Username</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Points</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{i + 1}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{entry.username || 'Anonymous'}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{entry.points}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{entry.submittedAt?.toDate().toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;