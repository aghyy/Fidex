"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("http://localhost:3001/api/tests")
      .then(res => res.json())
      .then(data => setMsg(data.message));
  }, []);

  return (
    <div className="p-10">
      <h1 className="text-2xl">Frontend</h1>
      <p>Backend says: {msg}</p>
    </div>
  );
}