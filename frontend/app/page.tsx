"use client";
import { useEffect, useState } from "react";
import LiquidGlass from "../components/LiquidGlass";

export default function Home() {
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("http://localhost:3001/api/tests")
      .then(res => res.json())
      .then(data => setMsg(data.message));
  }, []);

  return (
    <div className="w-full h-screen relative overflow-hidden">
      {/* <LiquidGlass className="w-full h-full" /> */}
      <div className="absolute top-4 left-4 z-10 text-white">
        <h1 className="text-2xl font-bold">Liquid Glass Effect</h1>
        <p className="text-sm opacity-80">Move your mouse to interact</p>
        {msg && <p className="text-sm">Backend says: {msg}</p>}
      </div>
    </div>
  );
}