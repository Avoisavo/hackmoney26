"use client";

import React, { useState, useEffect } from "react";
import { EventCard } from "./EventCard";
import { DetailedEventCard } from "./DetailedEventCard";
import { CryptoPriceCard } from "./CryptoPriceCard";
import { ElectionCard } from "./ElectionCard";
import { IranWarCard } from "./IranWarCard";
import { fetchTrendingEvents, detectMarketType, CategorizedEvents } from "@/lib/polymarket";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    id: 3,
    category: "2028 Election",
    title: "2028 U.S. Presidential Election",
    leftImage: "/market/jdvance.png",
    rightImage: "/market/gavin.png",
    outcomes: [
      { label: "JD VANCE", value: "52%", color: "#DC2626" },
      { label: "GAVIN", value: "48%", color: "#2563EB" }
    ],
    chartPaths: [
      "M 0,50 Q 50,45 100,55 T 200,40 T 300,60 T 400,30",
      "M 0,55 Q 50,60 100,50 T 200,65 T 300,45 T 400,75"
    ]
  },
  {
    id: 2,
    category: "Crypto",
    title: "What price will Bitcoin hit?",
    subtitle: "February 2-8",
    leftImage: "/market/bitcoin.png",
    rightImage: "/market/usd.png",
    outcomes: [
      { label: "$100k+", value: "42¢", color: "#F7931A" },
      { label: "$95k-100k", value: "35¢", color: "#4ADE80" },
      { label: "Below $95k", value: "23¢", color: "#F87171" }
    ],
    chartPaths: [
      "M 0,40 Q 50,35 100,20 T 200,30 T 300,15 T 400,5",
      "M 0,60 Q 50,65 100,70 T 200,55 T 300,60 T 400,50",
      "M 0,80 Q 50,85 100,90 T 200,80 T 300,85 T 400,95"
    ]
  },
  {
    id: 1,
    category: "Global Event",
    title: "Who will Trump talk to?",
    leftImage: "/market/trump.png",
    rightImage: "/market/putin.png",
    outcomes: [
      { label: "TRUMP", value: "68%", color: "#00C896" },
      { label: "PUTIN", value: "32%", color: "#EF4444" }
    ],
    chartPaths: [
      "M 0,80 Q 50,75 100,85 T 200,60 T 300,30 T 400,10",
      "M 0,85 Q 50,88 100,82 T 200,88 T 300,92 T 400,95"
    ]
  }
];

const SidebarImage = ({ src, side }: { src: string, side: 'left' | 'right' }) => (
  <motion.div
    initial={{ x: side === 'left' ? -300 : 300, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: side === 'left' ? -300 : 300, opacity: 0 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
    className={`absolute ${side === 'left' ? (src.includes('bitcoin') ? '-left-24' : src.includes('jdvance') ? '-left-32' : '-left-12') : (src.includes('arab') ? '-right-20' : src.includes('usd') ? '-right-28' : src.includes('gavin') ? '-right-24' : 'right-0')} ${src.includes('bitcoin') || src.includes('usd') ? 'bottom-12' : 'bottom-0'} ${src.includes('bitcoin') || src.includes('usd') ? 'h-[80%]' : 'h-[110%]'} z-10`}
  >
    <AnimatePresence mode="wait">
      <motion.img
        key={src}
        src={src}
        alt={side}
        initial={{ x: side === 'right' ? 50 : -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: side === 'right' ? 50 : -50, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="h-full object-contain filter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]"
      />
    </AnimatePresence>
  </motion.div>
);

const PoliticsHero = () => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [dynamicRightImage, setDynamicRightImage] = useState(SLIDES.find(s => s.id === 1)?.rightImage || "/market/putin.png");

  const nextSlide = () => {
    setDirection(1);
    setIndex((prev) => (prev + 1) % SLIDES.length);
  };

  const prevSlide = () => {
    setDirection(-1);
    setIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, 9000); // Adjusted for 3s Putin + 6s Arab
    return () => clearInterval(timer);
  }, [isPaused]);

  useEffect(() => {
    const currentSlide = SLIDES[index];
    if (currentSlide.id === 1) {
      let timeoutId: NodeJS.Timeout;
      const startPutin = () => {
        setDynamicRightImage(currentSlide.rightImage);
        timeoutId = setTimeout(startArab, 2500); // Putin for 2.5s
      };
      const startArab = () => {
        setDynamicRightImage("/market/arab.png");
        timeoutId = setTimeout(startPutin, 3000); // Arab for 3s
      };

      startArab();
      return () => clearTimeout(timeoutId);
    }
  }, [index]);

  const slide = SLIDES[index];

  return (
    <div className="relative group">
      <div className="mx-8 mb-12 rounded-3xl overflow-hidden bg-black relative min-h-[440px] flex items-center justify-center border border-zinc-800 shadow-2xl">
        {/* Decorative Neon Glows */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00C896] to-transparent opacity-50" />
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-[#00C896]/10 rounded-full blur-[100px]" />
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-red-500/10 rounded-full blur-[100px]" />

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.id}
            custom={direction}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="w-full flex items-center justify-center relative min-h-[440px]"
          >
            {slide.leftImage && <SidebarImage src={slide.leftImage} side="left" />}
            {((slide.id === 1) ? dynamicRightImage : slide.rightImage) && (
              <SidebarImage src={(slide.id === 1) ? (dynamicRightImage || "") : (slide.rightImage || "")} side="right" />
            )}

            <div className="relative z-20 text-center space-y-8 flex flex-col items-center w-full max-w-4xl px-4 py-12">
              <div className="space-y-2">
                <div className="text-[12px] font-black uppercase tracking-[0.5em] text-[#00C896]">
                  {slide.category} {slide.subtitle && <span className="text-zinc-500 ml-2">· {slide.subtitle}</span>}
                </div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase italic leading-tight">
                  {slide.title.split(' vs ').length > 1 ? (
                    slide.title
                  ) : (
                    <>
                      {slide.title.split(' ').slice(0, -2).join(' ')} <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00C896] to-white">
                        {slide.title.split(' ').slice(-2).join(' ')}
                      </span>
                    </>
                  )}
                </h1>

                {/* Secondary Odds Indicator (Image Style) */}
                <div className="flex gap-4 justify-center py-2">
                  {slide.outcomes.map((o) => (
                    <div key={o.label} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: o.color }} />
                      <span className="text-[11px] font-bold text-zinc-400">
                        {o.label} <span className="text-white">{o.value}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart Area */}
              <div className="w-full relative px-12">
                <svg className="w-full h-28 fill-none stroke-2 overflow-visible" viewBox="0 0 400 100" preserveAspectRatio="none">
                  {slide.chartPaths.map((path, i) => (
                    <motion.path
                      key={i}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 2, delay: 0.2 * i }}
                      d={path}
                      style={{ stroke: slide.outcomes[i].color }}
                    />
                  ))}
                </svg>
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-4 w-full max-w-3xl">
                {slide.outcomes.map((o) => (
                  <button
                    key={o.label}
                    className="flex-1 font-black py-4 rounded-full transition-all transform hover:scale-[1.02] active:scale-[0.98] uppercase text-[12px] tracking-wider"
                    style={{
                      backgroundColor: o.color,
                      color: slide.id === 1 && (o.label === 'TRUMP' || o.label === 'PUTIN') ? 'black' : 'white',
                      opacity: 0.9
                    }}
                  >
                    {o.label} MARKET - {o.value}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Layer */}
      <div className="flex flex-col items-center gap-6 -mt-6 relative z-30">
        <div className="flex items-center gap-8">
          <button
            onClick={prevSlide}
            className="p-2 text-zinc-500 hover:text-black transition-colors"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="flex gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > index ? 1 : -1);
                  setIndex(i);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === index ? 'bg-black w-4' : 'bg-zinc-300'}`}
              />
            ))}
          </div>

          <button
            onClick={nextSlide}
            className="p-2 text-zinc-500 hover:text-black transition-colors"
          >
            <ChevronRight size={24} />
          </button>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 text-zinc-500 hover:text-black transition-colors ml-4"
          >
            {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
          </button>
        </div>
      </div>
    </div>
  );
};

// Static crypto events for Bitcoin, Ethereum, and UNI
const STATIC_CRYPTO_EVENTS = [
  {
    id: "btc-price",
    title: "What price will Bitcoin hit?",
    slug: "bitcoin-price",
    image: "/market/bitcoin.png",
    volume: "10000000",
    markets: [
      { id: "1", question: "$100k+", outcomes: ["Yes", "No"], outcomePrices: ["0.42", "0.58"] },
      { id: "2", question: "$95k-100k", outcomes: ["Yes", "No"], outcomePrices: ["0.35", "0.65"] },
      { id: "3", question: "Below $95k", outcomes: ["Yes", "No"], outcomePrices: ["0.23", "0.77"] },
    ]
  },
  {
    id: "eth-price",
    title: "What price will Ethereum hit?",
    slug: "ethereum-price",
    image: "/market/ethereum.png",
    volume: "8000000",
    markets: [
      { id: "1", question: "$4k+", outcomes: ["Yes", "No"], outcomePrices: ["0.38", "0.62"] },
      { id: "2", question: "$3.5k-4k", outcomes: ["Yes", "No"], outcomePrices: ["0.32", "0.68"] },
      { id: "3", question: "Below $3.5k", outcomes: ["Yes", "No"], outcomePrices: ["0.30", "0.70"] },
    ]
  },
  {
    id: "uni-price",
    title: "What price will UNI hit?",
    slug: "uni-price",
    image: "/market/uni.png",
    volume: "5000000",
    markets: [
      { id: "1", question: "$20+", outcomes: ["Yes", "No"], outcomePrices: ["0.25", "0.75"] },
      { id: "2", question: "$15-20", outcomes: ["Yes", "No"], outcomePrices: ["0.35", "0.65"] },
      { id: "3", question: "Below $15", outcomes: ["Yes", "No"], outcomePrices: ["0.40", "0.60"] },
    ]
  }
];

export const EventGrid = () => {
  const [data, setData] = useState<CategorizedEvents>({
    politics: { active: [], resolved: [] },
    crypto: { active: STATIC_CRYPTO_EVENTS as any, resolved: [] }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      console.log("EventGrid: Starting to load events...");
      try {
        const result = await fetchTrendingEvents();
        console.log("EventGrid: Data received:", result);
        // Keep static crypto events, only load politics from API
        setData(prev => ({
          ...result,
          crypto: prev.crypto
        }));
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
      <div className={cn(
        "grid gap-6 px-8",
        category === "Politics" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      )}>
        {events.map((event) => (
          category === "Politics" ? (
            <DetailedEventCard
              key={event.id}
              event={event}
              category={category}
              status={status}
            />
          ) : (
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
          )
        ))}
      </div>
    </div>
  );

  return (
    <div className="py-12 space-y-24">
      {/* Politics Section */}
      <section className="space-y-2">
        <PoliticsHero />
        <div className="px-8 mb-8">
          <h2 className="text-xl font-black tracking-tighter text-black uppercase">Politics</h2>
          <div className="h-1 w-20 bg-black mt-2" />
        </div>
        <div className="space-y-6">
          <div className="grid gap-6 px-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
            <ElectionCard />
            <IranWarCard />
          </div>
        </div>
      </section>

      {/* Crypto Section */}
      <section className="space-y-2">
        <div className="px-8 mb-8">
          <h2 className="text-xl font-black tracking-tighter text-black uppercase">Crypto</h2>
          <div className="h-1 w-20 bg-black mt-2" />
        </div>
        <div className="px-8">
          <CryptoPriceCard />
        </div>
      </section>
    </div>
  );
};
