"use client";

import dynamic from "next/dynamic";

const Chat = dynamic(() => import("./chat"), {
  ssr: false,
  loading: () => <p className="p-6">Loading…</p>,
});

export default function ChatPage() {
  return <Chat />;
}
