"use client";

import React, { useState, useEffect } from "react";
import { EventCard } from "./EventCard";
import { fetchTrendingEvents, detectMarketType, CategorizedEvents } from "@/lib/polymarket";

export const EventGrid = () => {
  const [data, setData] = useState<CategorizedEvents>({
    politics: { active: [], resolved: [] },
    crypto: { active: [], resolved: [] }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      console.log("EventGrid: Starting to load events...");
      try {
        const result = await fetchTrendingEvents();
        console.log("EventGrid: Data received:", result);
        setData(result);
      } catch (error) {
        console.error("EventGrid: Failed to load events:", error);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-12">
        {[1, 2].map((section) => (
          <div key={section} className="space-y-6">
            <div className="h-4 bg-gray-100 rounded w-48 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[280px] rounded-xl bg-gray-50 border border-gray-100 animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const RenderSubsection = ({ title, events, category, status }: { title: string, events: any[], category: string, status: 'Active' | 'Resolved' }) => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 px-8 pt-8">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary border-l-2 border-accent-green pl-4">
          {title} ({status})
        </h3>
        <div className="h-px flex-1 bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-8">
        {events.map((event) => (
          <EventCard
            key={event.id}
            title={event.title}
            category={category}
            marketType={detectMarketType(event)}
            status={status}
            image={event.image}
            volume={event.volume}
            outcomesCount={event.markets?.length || 0}
            slug={event.slug}
            isTrending={Number(event.volume) > 5000000}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="py-12 space-y-24">
      {/* Politics Section */}
      <section className="space-y-2">
        <div className="px-8 mb-8">
          <h2 className="text-xl font-black tracking-tighter text-black uppercase">Politics</h2>
          <div className="h-1 w-20 bg-black mt-2" />
        </div>
        <RenderSubsection title="Current Affairs" events={data.politics.active} category="Politics" status="Active" />
        <RenderSubsection title="Historical Resolutions" events={data.politics.resolved} category="Politics" status="Resolved" />
      </section>

      {/* Crypto Section */}
      <section className="space-y-2">
        <div className="px-8 mb-8">
          <h2 className="text-xl font-black tracking-tighter text-black uppercase">Crypto / Digital Assets</h2>
          <div className="h-1 w-20 bg-black mt-2" />
        </div>
        <RenderSubsection title="Protocol Dynamics" events={data.crypto.active} category="Crypto" status="Active" />
        <RenderSubsection title="Market Closures" events={data.crypto.resolved} category="Crypto" status="Resolved" />
      </section>
    </div>
  );
};
