import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import LeaderboardPage from './LeaderboardPage'; // Make sure you have created LeaderboardPage.jsx

// =================================================================================
// YOUR FIREBASE CONFIGURATION
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCv5xSMUSt5zu2MKS6AuA-fq2eP7wAXlcA",
  authDomain: "bitcointalk-dashboard-b657b.firebaseapp.com",
  projectId: "bitcointalk-dashboard-b657b",
  storageBucket: "bitcointalk-dashboard-b657b.firebasestorage.app",
  messagingSenderId: "1022590204810",
  appId: "1:1022590204810:web:7088772f9ece555e78a673"
};
// =================================================================================

// --- Initialize Firebase & Define Data ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const RANK_REQUIREMENTS = {
    'Brand new': { merit: 0, next: 'Newbie' },
    'Newbie': { merit: 0, next: 'Jr. Member' },
    'Jr. Member': { merit: 1, next: 'Member' },
    'Member': { merit: 10, next: 'Full Member' },
    'Full Member': { merit: 100, next: 'Sr. Member' },
    'Sr. Member': { merit: 250, next: 'Hero Member' },
    'Hero Member': { merit: 500, next: 'Legendary' },
    'Legendary': { merit: 1000, next: null }
};

const getNextRankInfo = (currentRank, currentMerit) => {
    const rankData = RANK_REQUIREMENTS[currentRank];
    if (!rankData || !rankData.next) {
        return { needed: 0, nextRank: null };
    }
    const needed = RANK_REQUIREMENTS[rankData.next]?.merit - currentMerit;
    return {
        needed: needed > 0 ? needed : 0,
        nextRank: rankData.next
    };
};

// --- React Components ---

const Header = ({ onNavigate, currentPage }) => (
    <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <div className="text-2xl font-bold text-gray-800 tracking-wider cursor-pointer flex items-center" onClick={() => onNavigate('home')}>
                 <svg className="w-8 h-8 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Bitcointalk Dashboard
            </div>
            {/* --- NEW: Navigation Buttons --- */}
            <nav className="flex space-x-2">
                <button 
                    onClick={() => onNavigate('home')}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${currentPage === 'home' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    Home
                </button>
                <button 
                    onClick={() => onNavigate('leaderboard')}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${currentPage === 'leaderboard' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    Leaderboard
                </button>
            </nav>
        </div>
    </header>
);

const HomePage = ({ onNavigate }) => (
    <div className="text-center">
        <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-5xl font-extrabold text-gray-800 mb-4 leading-tight">User Progress Tracker</h2>
            <p className="text-xl text-gray-500">Live data from the Bitcointalk forum.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div onClick={() => onNavigate('active')} className="group bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 cursor-pointer border-t-4 border-blue-500">
                <h3 className="text-2xl font-bold text-gray-800 mb-3">24h Active Users</h3>
                <p className="text-gray-600 group-hover:text-blue-700">View users active in the last 24 hours.</p>
            </div>
            <div onClick={() => onNavigate('rankup')} className="group bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 cursor-pointer border-t-4 border-green-500">
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Close to Next Rank</h3>
                <p className="text-gray-600 group-hover:text-green-700">Users who are close to a promotion.</p>
            </div>
            <div onClick={() => onNavigate('promoted')} className="group bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 cursor-pointer border-t-4 border-purple-500">
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Recently Promoted</h3>
                <p className="text-gray-600 group-hover:text-purple-700">Users who ranked up in the last 7 days.</p>
            </div>
        </div>
    </div>
);

const UserTable = ({ users, title, description, type }) => {
    if (users.length === 0 && type !== 'active') {
        return (
             <div className="text-center py-10 bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">{title}</h2>
                <p className="text-gray-500 mb-6">{description}</p>
                <p className="mt-4 text-gray-700 text-lg">No users match the criteria right now.</p>
            </div>
        )
    }

    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{title}</h2>
            <p className="text-gray-500 mb-6">{description}</p>
            {type === 'active' && (
                <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 rounded-r-lg mb-8">
                    <div className="flex items-center">
                        <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div>
                            <p className="font-bold">Total Active Users Found: {users.length}</p>
                            <p className="text-sm mt-1">
                                This list shows all unique users seen in the last 24 hours.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {users.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left py-3 px-4 sm:px-6 uppercase font-semibold text-sm text-gray-600 tracking-wider">Username</th>
                                <th className="text-left py-3 px-4 sm:px-6 uppercase font-semibold text-sm text-gray-600 tracking-wider">Rank</th>
                                <th className="text-left py-3 px-4 sm:px-6 uppercase font-semibold text-sm text-gray-600 tracking-wider">Merit</th>
                                <th className="text-left py-3 px-4 sm:px-6 uppercase font-semibold text-sm text-gray-600 tracking-wider">Posts</th>
                                {type === 'rankup' && <th className="text-left py-3 px-4 sm:px-6 uppercase font-semibold text-sm text-gray-600 tracking-wider">Merit for Next Rank</th>}
                                {type === 'promoted' && <th className="text-left py-3 px-4 sm:px-6 uppercase font-semibold text-sm text-gray-600 tracking-wider">Promoted On</th>}
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 divide-y divide-gray-200">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200">
                                    <td className="py-4 px-4 sm:px-6"><a href={user.profileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">{user.username}</a></td>
                                    <td className="py-4 px-4 sm:px-6">{user.rank}</td>
                                    <td className="py-4 px-4 sm:px-6">{user.merit}</td>
                                    <td className="py-4 px-4 sm:px-6">{user.posts}</td>
                                    {type === 'rankup' && <td className="py-4 px-4 sm:px-6 font-bold text-green-600">{user.meritNeeded}</td>}
                                    {type === 'promoted' && <td className="py-4 px-4 sm:px-6">{user.promotedAt ? new Date(user.promotedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                 <p className="mt-4 text-gray-700 text-lg text-center py-8">No active users found in the last 24 hours.</p>
            )}
        </div>
    );
};

const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
        <p className="mt-4 text-xl font-semibold text-gray-700">Fetching Data from Firebase...</p>
    </div>
);

function App() {
    const [page, setPage] = useState('home');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchUsers = async (filterType) => {
        setLoading(true);
        setUsers([]);
        try {
            const usersCollection = collection(db, 'users');
            let q;
            
            if (filterType === 'active') {
                const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
                q = query(usersCollection, where('lastScrapedAt', '>=', twentyFourHoursAgo), orderBy('lastScrapedAt', 'desc'));
            } else if (filterType === 'promoted') {
                const sevenDaysAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
                q = query(usersCollection, where('promotedAt', '>=', sevenDaysAgo), orderBy('promotedAt', 'desc'));
            } else {
                q = query(usersCollection, orderBy('merit', 'desc'));
            }

            const querySnapshot = await getDocs(q);
            let fetchedUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (filterType === 'rankup') {
                fetchedUsers = fetchedUsers.map(user => {
                    const { needed } = getNextRankInfo(user.rank, user.merit);
                    return { ...user, meritNeeded: needed };
                }).filter(user => {
                    const rank = user.rank;
                    const needed = user.meritNeeded;
                    if (rank === 'Brand new' || rank === 'Newbie') return false;
                    if (rank === 'Jr. Member') return needed > 0 && needed <= 2;
                    return needed > 0 && needed <= 20;
                });
            }
            
            setUsers(fetchedUsers);
        } catch (error) {
            console.error("Error fetching users: ", error);
        }
        setLoading(false);
    };

    const handleNavigation = (targetPage) => {
        setPage(targetPage);
        // Only fetch from firebase if it's one of the original pages
        if (['active', 'rankup', 'promoted'].includes(targetPage)) {
            fetchUsers(targetPage);
        }
    };

    const renderPage = () => {
        // --- UPDATED: No longer show loading spinner for leaderboard as it has its own ---
        if (loading && page !== 'leaderboard') {
            return <LoadingSpinner />;
        }

        switch (page) {
            case 'active':
                return <UserTable users={users} title="24h Active Users" description="A list of users who have posted on the forum recently." type="active" />;
            case 'rankup':
                return <UserTable users={users} title="Close to Next Rank" description="Jr. Members needing ≤2 merit, and other ranks needing ≤20." type="rankup" />;
            case 'promoted':
                 return <UserTable users={users} title="Recently Promoted" description="Users who have ranked up in the last 7 days." type="promoted" />;
            case 'leaderboard':
                return <LeaderboardPage />;
            case 'home':
            default:
                return <HomePage onNavigate={handleNavigation} />;
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
            <Header onNavigate={handleNavigation} currentPage={page} />
            <main className="container mx-auto px-4 sm:px-6 py-12">
                {renderPage()}
            </main>
            <footer className="text-center py-8 text-gray-500 text-sm">
                <p>Bitcointalk Dashboard | Data updated in real-time</p>
            </footer>
        </div>
    );
}

export default App;
