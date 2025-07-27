import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';

// ✅ Firebase config for your project
const firebaseConfig = {
  apiKey: "AIzaSyCv5xSMUSt5zu2MKS6AuA-fq2eP7wAXlcA",
  authDomain: "bitcointalk-dashboard-b657b.firebaseapp.com",
  projectId: "bitcointalk-dashboard-b657b",
  storageBucket: "bitcointalk-dashboard-b657b.firebasestorage.app",
  messagingSenderId: "1022590204810",
  appId: "1:1022590204810:web:7088772f9ece555e78a673"
};

// ✅ Init Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- UI Components ---
const Table = ({ children }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full">{children}</table>
  </div>
);

const Thead = ({ children }) => <thead className="bg-gray-50">{children}</thead>;
const Th = ({ children }) => (
  <th className="text-left py-3 px-4 sm:px-6 uppercase font-semibold text-sm text-gray-600 tracking-wider">
    {children}
  </th>
);
const Tbody = ({ children }) => (
  <tbody className="text-gray-700 divide-y divide-gray-200">{children}</tbody>
);
const Tr = ({ children }) => (
  <tr className="hover:bg-gray-50 transition-colors duration-200">{children}</tr>
);
const Td = ({ children, className = '' }) => (
  <td className={`py-4 px-4 sm:px-6 ${className}`}>{children}</td>
);

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
    <p className="mt-4 text-xl font-semibold text-gray-700">Fetching Leaderboard Data...</p>
  </div>
);

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center items-center space-x-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 text-sm font-medium text-gray-600 bg-white rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
        Previous
      </button>
      <span className="text-sm text-gray-700">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 text-sm font-medium text-gray-600 bg-white rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
        Next
      </button>
    </div>
  );
};

// --- MAIN LEADERBOARD COMPONENT ---
function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState({});
  const [usernames, setUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('90d'); // default to 90 days
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const USERS_PER_PAGE = 100;

  // ✅ Fetch merit + username data from Firebase
  useEffect(() => {
    const tabs = ['7d', '30d', '90d', '120d'];
    const usernamesRef = ref(db, 'usernames');

    // Listen for usernames
    onValue(usernamesRef, (snapshot) => {
      setUsernames(snapshot.val() || {});
    });

    // Listen for each timeframe (future-proof)
    tabs.forEach(tab => {
      const refPath = tab === '90d' ? 'merit_90d' : `merit_${tab}`;
      const meritRef = ref(db, refPath);

      onValue(meritRef, (snapshot) => {
        const data = snapshot.val() || {};
        const formatted = Object.entries(data).map(([userId, details]) => ({
          userId,
          merit: details.merit,
        }));
        formatted.sort((a, b) => b.merit - a.merit);

        setLeaderboardData(prev => ({
          ...prev,
          [tab]: formatted
        }));
        setLoading(false);
      });
    });
  }, []);

  // ✅ Filter & paginate leaderboard
  const { currentList, totalPages, searchResult } = useMemo(() => {
    const baseList = leaderboardData[activeTab] || [];

    if (searchTerm.trim()) {
      const results = baseList
        .map((user, index) => ({ ...user, rank: index + 1 }))
        .filter(user => (usernames[user.userId] || '').toLowerCase().includes(searchTerm.toLowerCase()));

      return {
        currentList: results,
        totalPages: 1,
        searchResult: results.length > 0 ? results : { length: 0 }
      };
    }

    const total = Math.ceil(baseList.length / USERS_PER_PAGE);
    const startIndex = (currentPage - 1) * USERS_PER_PAGE;
    const paginatedList = baseList.slice(startIndex, startIndex + USERS_PER_PAGE);

    return { currentList: paginatedList, totalPages: total, searchResult: null };
  }, [leaderboardData, activeTab, usernames, searchTerm, currentPage]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Merit Leaderboard</h1>
          <p className="text-gray-500 mt-1">Live Data</p>
        </div>
        <div className="w-full md:w-auto flex-shrink-0">
          <input
            type="text"
            placeholder="Search by username..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 🔥 TABS */}
      <div className="flex space-x-2 p-1 bg-gray-100 rounded-lg mb-6 self-start">
        {['7d', '30d', '90d', '120d'].map(p => (
          <button
            key={p}
            onClick={() => {
              setActiveTab(p);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              activeTab === p
                ? 'bg-blue-600 text-white shadow'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}>
            {p.replace('d', ' Days')}
          </button>
        ))}
      </div>

      {searchResult && searchResult.length === 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-r-lg mb-6">
          <p>No users found matching "{searchTerm}".</p>
        </div>
      )}

      <Table>
        <Thead>
          <tr>
            <Th>Rank</Th>
            <Th>Username</Th>
            <Th>Merit Earned ({activeTab})</Th>
          </tr>
        </Thead>
        <Tbody>
          {currentList.map((user, index) => (
            <Tr key={user.userId}>
              <Td className="font-bold text-gray-500">
                {searchTerm ? user.rank : (currentPage - 1) * USERS_PER_PAGE + index + 1}
              </Td>
              <Td>
                <a
                  href={`https://bitcointalk.org/index.php?action=profile;u=${user.userId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">
                  {usernames[user.userId] || `User ${user.userId}`}
                </a>
              </Td>
              <Td className="font-semibold text-green-600">{user.merit}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {!searchTerm && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
    </div>
  );
}

export default LeaderboardPage;
