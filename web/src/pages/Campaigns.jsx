import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "campaigns"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCampaigns(data);
    });
    return () => unsub();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">🎯 Signature Campaigns</h1>

      {campaigns.length === 0 && <p>No campaigns found.</p>}

      <div className="grid gap-4">
        {campaigns.map(campaign => (
          <div key={campaign.id} className="border rounded-xl p-4 shadow bg-white">
            <h2 className="text-xl font-semibold">{campaign.id}</h2>

            <p className="mt-1">
              Status:{" "}
              <span className={
                campaign.status === "OPEN" ? "text-green-600 font-bold" :
                campaign.status === "CFNP" ? "text-yellow-600 font-bold" :
                "text-red-600 font-bold"
              }>
                {campaign.status}
              </span>
            </p>

            {campaign.slots && Object.keys(campaign.slots).length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Slots:</p>
                <ul className="ml-4">
                  {Object.entries(campaign.slots).map(([rank, count]) => (
                    <li key={rank}>{rank}: {count}</li>
                  ))}
                </ul>
              </div>
            )}

            {campaign.thread_id && (
              <a
                href={`https://bitcointalk.org/index.php?topic=${campaign.thread_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline mt-3 inline-block"
              >
                View Thread
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
