import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import './App.css';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function Leaderboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const snapshot = await getDocs(collection(db, 'leaderboard'));
      const data = snapshot.docs.map(doc => doc.data());
      const sorted = data.sort((a, b) => b.currentMerit - a.currentMerit);
      setUsers(sorted);
    }
    fetchData();
  }, []);

  return (
    <div className="container">
      <h1>📈 Full Merit Leaderboard</h1>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Username</th>
            <th>Merit (7d)</th>
            <th>Merit (30d)</th>
            <th>Merit (90d)</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <tr key={u.userId}>
              <td>{i + 1}</td>
              <td>{u.username}</td>
              <td>{u['7dMerit']}</td>
              <td>{u.merit30d}</td>
              <td>{u.merit90d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Leaderboard;
