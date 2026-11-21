"use client";

import { MessageCircle } from "lucide-react";

export default function WhatsAppFloat() {
  const message = encodeURIComponent("Hello Sabkaam, mujhe assistance chahiye.");
  const url = `https://wa.me/917209992081?text=${message}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Sabkaam on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-green-600 px-4 py-3 text-white shadow-xl hover:bg-green-700"
    >
      <MessageCircle className="h-6 w-6" />
      <span className="font-semibold">WhatsApp Help</span>
    </a>
  );
}
