"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import iranData from "@/data/iran.json";
import { cn } from "@/lib/utils";
import { RouletteSelection } from "@/app/iran/page";

interface IranSentimentChartProps {
    selection: RouletteSelection;
    onSelectDate?: (day: number) => void;
}

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
const CENTS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export const IranSentimentChart = ({ selection, onSelectDate }: IranSentimentChartProps) => {
    const { selectedEvents, selectedOutcome } = selection;
    const isNo = selectedOutcome === "no";

    // Theme colors
    const themeColor = isNo ? "#EF4444" : "#10B981"; // Red-500 or Emerald-500
    const themeBg = isNo ? "bg-red-50/50" : "bg-emerald-50/50";
    const themeBorder = isNo ? "border-red-100/50" : "border-emerald-100/50";
    const themeText = isNo ? "text-red-600" : "text-emerald-600";

    const onMarket = iranData.markets.find(m => m.type === "on_date");
    const byMarket = iranData.markets.find(m => m.type === "by_date");

    const onData = useMemo(() => {
        return onMarket?.data.map(d => ({
            day: parseInt(d.date.split("-")[2]),
            val: isNo ? d.no_cents : d.yes_cents
        })) || [];
    }, [onMarket, isNo]);

    const byData = useMemo(() => {
        return byMarket?.data.map(d => ({
            day: parseInt(d.date.split("-")[2]),
            val: isNo ? d.no_cents : d.yes_cents
        })) || [];
    }, [byMarket, isNo]);

    const showOn = selectedEvents.includes("on") || selectedEvents.length === 0;
    const showBy = selectedEvents.includes("by") || selectedEvents.length === 0;

    // Dimensions
    const width = 800;
    const height = 400;
    const padding = { top: 20, right: 20, bottom: 50, left: 55 };

    const xScale = (day: number) => padding.left + ((day - 1) / 27) * (width - padding.left - padding.right);
    const yScale = (val: number) => padding.top + (1 - val / 100) * (height - padding.top - padding.bottom);

    const generatePath = (data: { day: number; val: number }[]) => {
        if (data.length === 0) return "";
        return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.day)} ${yScale(d.val)}`).join(' ');
    };

    const getIntensity = (day: number, cent: number) => {
        let minDist = 100;
        if (showOn) {
            const onVal = onData.find(d => d.day === day)?.val || 0;
            minDist = Math.min(minDist, Math.abs(onVal - cent));
        }
        if (showBy) {
            const byVal = byData.find(d => d.day === day)?.val || 0;
            minDist = Math.min(minDist, Math.abs(byVal - cent));
        }

        if (minDist < 5) return 0.8;
        if (minDist < 10) return 0.4;
        if (minDist < 15) return 0.1;
        return 0.05;
    };

    return (
        <div className="w-full bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-6 mb-4">
                {showOn && (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">US Strikes Iran On...</span>
                    </div>
                )}
                {showBy && (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">US Strikes Iran By...</span>
                    </div>
                )}
                {selectedOutcome && (
                    <div className="ml-auto flex items-center gap-2">
                        <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Position:</div>
                        <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-white ${isNo ? 'bg-red-500' : 'bg-emerald-500'}`}>
                            {selectedOutcome}
                        </div>
                    </div>
                )}
            </div>

            <div className="relative aspect-[2.2/1] w-full">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                    {/* Background Grid / Heatmap */}
                    {DAYS.map((day) => {
                        const isSelected = day === selection.selectedDate;
                        return (
                            <g key={day} className="group/day" onClick={() => onSelectDate?.(day)}>
                                {/* Hitbox / Hover Highlight for entire day column */}
                                <rect
                                    x={xScale(day) - (width - padding.left - padding.right) / 56}
                                    y={padding.top}
                                    width={(width - padding.left - padding.right) / 28}
                                    height={height - padding.top - padding.bottom}
                                    fill="transparent"
                                    className="cursor-pointer group-hover/day:fill-gray-50/50 transition-colors"
                                />

                                {CENTS.slice(0, -1).map((cent) => {
                                    const intensity = getIntensity(day, cent + 5);
                                    return (
                                        <rect
                                            key={`${day}-${cent}`}
                                            x={xScale(day) - (width - padding.left - padding.right) / 56}
                                            y={yScale(cent + 10)}
                                            width={(width - padding.left - padding.right) / 28 * 0.9}
                                            height={(height - padding.top - padding.bottom) / 10 * 0.9}
                                            className={cn(
                                                "transition-all duration-300 pointer-events-none",
                                                isSelected ? "stroke-black stroke-1" : "stroke-transparent"
                                            )}
                                            fill={themeColor}
                                            fillOpacity={intensity}
                                            rx={2}
                                        />
                                    );
                                })}
                            </g>
                        );
                    })}

                    {/* Y-Axis Labels */}
                    {CENTS.map(cent => (
                        <g key={cent}>
                            <text
                                x={padding.left - 15}
                                y={yScale(cent)}
                                textAnchor="end"
                                dominantBaseline="middle"
                                className="fill-gray-500 text-[13px] font-black"
                            >
                                {cent}¢
                            </text>
                            <line
                                x1={padding.left}
                                y1={yScale(cent)}
                                x2={width - padding.right}
                                y2={yScale(cent)}
                                stroke="#F3F4F6"
                                strokeWidth="1.5"
                            />
                        </g>
                    ))}

                    {/* X-Axis Labels */}
                    {DAYS.filter(d => d % 5 === 0 || d === 1).map(day => (
                        <text
                            key={day}
                            x={xScale(day)}
                            y={height - padding.bottom + 25}
                            textAnchor="middle"
                            className="fill-gray-500 text-[13px] font-black"
                        >
                            {day} Feb
                        </text>
                    ))}

                    {/* Today Line */}
                    <line
                        x1={xScale(7)}
                        y1={padding.top}
                        x2={xScale(7)}
                        y2={height - padding.bottom}
                        stroke="#9CA3AF"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                    />
                    <rect
                        x={xScale(7) - 20}
                        y={height - padding.bottom + 5}
                        width="40"
                        height="16"
                        fill="#F3F4F6"
                        rx="4"
                    />
                    <text
                        x={xScale(7)}
                        y={height - padding.bottom + 17}
                        textAnchor="middle"
                        className="fill-gray-700 text-[10px] font-black uppercase tracking-tighter"
                    >
                        Today
                    </text>

                    {/* Lines */}
                    {showBy && (
                        <motion.path
                            d={generatePath(byData.filter(d => d.day <= 7))}
                            stroke="#3B82F6"
                            strokeWidth="2.5"
                            fill="none"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                        />
                    )}
                    {showOn && (
                        <motion.path
                            d={generatePath(onData.filter(d => d.day <= 7))}
                            stroke="#F59E0B"
                            strokeWidth="2.5"
                            fill="none"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                        />
                    )}

                    {/* Data Point Circles - By Data */}
                    {showBy && byData.filter(d => d.day <= 7).map((d, i) => (
                        <circle
                            key={`by-${i}`}
                            cx={xScale(d.day)}
                            cy={yScale(d.val)}
                            r="3.5"
                            fill="#3B82F6"
                        />
                    ))}

                    {/* Data Point Circles - On Data */}
                    {showOn && onData.filter(d => d.day <= 7).map((d, i) => (
                        <circle
                            key={`on-${i}`}
                            cx={xScale(d.day)}
                            cy={yScale(d.val)}
                            r="3.5"
                            fill="#F59E0B"
                        />
                    ))}

                    {/* Glowing Today Points */}
                    {showOn && (
                        <g>
                            <circle
                                cx={xScale(7)}
                                cy={yScale(onData.find(d => d.day === 7)?.val || 0)}
                                r="4"
                                fill="#F59E0B"
                                className="animate-pulse"
                            />
                            <circle
                                cx={xScale(7)}
                                cy={yScale(onData.find(d => d.day === 7)?.val || 0)}
                                r="10"
                                fill="#F59E0B"
                                fillOpacity="0.2"
                            />
                        </g>
                    )}
                    {showBy && (
                        <g>
                            <circle
                                cx={xScale(7)}
                                cy={yScale(byData.find(d => d.day === 7)?.val || 0)}
                                r="4"
                                fill="#3B82F6"
                                className="animate-pulse"
                            />
                            <circle
                                cx={xScale(7)}
                                cy={yScale(byData.find(d => d.day === 7)?.val || 0)}
                                r="10"
                                fill="#3B82F6"
                                fillOpacity="0.2"
                            />
                        </g>
                    )}
                </svg>
            </div>
        </div>
    );
};
