'use client';

import React, { useEffect, useState } from "react";

interface LeaderboardUser {
  id: string;
  username: string;
  reputation: number;
  contributions: number;
  projects: number;
}

const leaderboardTypes = ["reputation", "contributions", "projects"] as const;
type LeaderboardType = typeof leaderboardTypes[number];

export default function LeaderboardPage() {
  const [type, setType] = useState<LeaderboardType>("reputation");
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/v1/users/leaderboard?type=${type}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch leaderboard");
        return res.json();
      })
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [type]);

  return (
    <main className="container mx-auto py-12">
      <h1 className="text-3xl font-bold mb-4">Leaderboard</h1>
      <div className="mb-6 flex gap-2">
        {leaderboardTypes.map((t) => (
          <button
            key={t}
            className={`px-4 py-2 rounded border ${type === t ? "bg-blue-600 text-white" : "bg-white text-blue-600"}`}
            onClick={() => setType(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && users.length === 0 && <p>No users found.</p>}
      {!loading && !error && users.length > 0 && (
        <table className="w-full border mt-4">
          <thead>
            <tr>
              <th className="p-2 border">Rank</th>
              <th className="p-2 border">Username</th>
              <th className="p-2 border">Reputation</th>
              <th className="p-2 border">Contributions</th>
              <th className="p-2 border">Projects</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr key={user.id}>
                <td className="p-2 border">{idx + 1}</td>
                <td className="p-2 border">{user.username}</td>
                <td className="p-2 border">{user.reputation}</td>
                <td className="p-2 border">{user.contributions}</td>
                <td className="p-2 border">{user.projects}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
