"use client";

import React, { useState, useEffect } from "react";
import { EventCard } from "./EventCard";
import { fetchTrendingEvents, detectMarketType, CategorizedEvents } from "@/lib/polymarket";

export const EventGrid = () => {
  const [data, setData] = useState<CategorizedEvents>({ politics: [], crypto: [] });
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

  const RenderSection = ({ title, events, category }: { title: string, events: any[], category: string }) => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 px-8">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary border-l-2 border-accent-green pl-4">
          {title}
        </h2>
        <div className="h-px flex-1 bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-8">
        {events.map((event) => (
          <EventCard 
            key={event.id} 
            title={event.title}
            category={category}
            marketType={detectMarketType(event)}
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
    <div className="py-12 space-y-16">
      {data.politics.length > 0 && (
        <RenderSection title="Politics / Social Index" events={data.politics} category="Politics" />
      )}
      
      {data.crypto.length > 0 && (
        <RenderSection title="Crypto / Digital Assets" events={data.crypto} category="Crypto" />
      )}
    </div>
  );
};
