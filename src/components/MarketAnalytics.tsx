/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  HelpCircle, 
  BarChart3, 
  LineChart, 
  Activity, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  Info
} from "lucide-react";
import { playClickSound, playUpgradeSound } from "../utils/audio";

interface DataPoint {
  date: Date;
  priceIdr: number;
  volumeLdr: number;
  totalPayouts: number;
}

export default function MarketAnalytics() {
  const [marketData, setMarketData] = useState<DataPoint[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'price' | 'payouts'>('price');
  
  // Container dimensions state for responsive charts
  const priceChartContainerRef = useRef<HTMLDivElement>(null);
  const payoutChartContainerRef = useRef<HTMLDivElement>(null);
  
  const [priceDimensions, setPriceDimensions] = useState({ width: 500, height: 260 });
  const [payoutDimensions, setPayoutDimensions] = useState({ width: 500, height: 260 });
  
  const priceSvgRef = useRef<SVGSVGElement | null>(null);
  const payoutSvgRef = useRef<SVGSVGElement | null>(null);

  // Stats cards values based on generated data
  const [currentPrice, setCurrentPrice] = useState(13250);
  const [priceChangePct, setPriceChangePct] = useState(5.4);
  const [allTimeHigh, setAllTimeHigh] = useState(15100);
  const [totalNetworkPayout30d, setTotalNetworkPayout30d] = useState(25430);

  // Generate dataset on load
  useEffect(() => {
    // Generate dates up to May 28, 2026 (local time)
    const baseDate = new Date(2026, 4, 28); 
    const generatedData: DataPoint[] = [];
    
    // Seed price series
    let price = 11800;
    let maxPrice = 11800;
    let accumVols = 0;
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      
      // Seeded mathematical fluctuation + random walk for elegant charts
      const trend = Math.sin(i / 4) * 450 + Math.cos(i / 2) * 200;
      const noise = (Math.random() - 0.48) * 350;
      price = 12500 + trend + noise;
      
      if (price < 9500) price = 9520;
      if (price > 16500) price = 16200;
      if (price > maxPrice) maxPrice = Math.round(price);
      
      const volume = Math.round(500 + Math.sin(i / 3) * 200 + Math.random() * 400);
      const totalPayouts = Math.round(8 + Math.cos(i / 2) * 5 + Math.random() * 4);
      accumVols += volume;

      generatedData.push({
        date: d,
        priceIdr: Math.round(price),
        volumeLdr: volume,
        totalPayouts: totalPayouts
      });
    }

    setMarketData(generatedData);
    setAllTimeHigh(maxPrice);
    
    // Calculate final indicators
    const lastPrice = generatedData[generatedData.length - 1].priceIdr;
    const startPrice = generatedData[0].priceIdr;
    const change = (((lastPrice - startPrice) / startPrice) * 100);
    setCurrentPrice(lastPrice);
    setPriceChangePct(parseFloat(change.toFixed(2)));
    setTotalNetworkPayout30d(accumVols);
  }, []);

  // Set up resize observer for responsive layouts
  useEffect(() => {
    if (!priceChartContainerRef.current) return;
    const pObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        setPriceDimensions({
          width: Math.max(280, width),
          height: 250
        });
      }
    });
    pObserver.observe(priceChartContainerRef.current);

    return () => pObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!payoutChartContainerRef.current) return;
    const payObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        setPayoutDimensions({
          width: Math.max(280, width),
          height: 250
        });
      }
    });
    payObserver.observe(payoutChartContainerRef.current);

    return () => payObserver.disconnect();
  }, []);

  // DRAW CHART 1: LDR Value Line/Area Chart using D3
  useEffect(() => {
    if (marketData.length === 0 || !priceSvgRef.current) return;

    // Clear previous elements
    const svg = d3.select(priceSvgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = priceDimensions;
    const margin = { top: 15, right: 20, bottom: 30, left: 55 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const mainGroup = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X Scale (Date domain)
    const xScale = d3.scaleTime()
      .domain(d3.extent(marketData, (d: DataPoint) => d.date) as [Date, Date])
      .range([0, chartWidth]);

    // Y Scale (Price IDR domain)
    const yScale = d3.scaleLinear()
      .domain([
        (d3.min(marketData, (d: DataPoint) => d.priceIdr) || 9000) * 0.95,
        (d3.max(marketData, (d: DataPoint) => d.priceIdr) || 16000) * 1.03
      ])
      .range([chartHeight, 0]);

    // Define Grid lines
    const yGrid = d3.axisLeft(yScale)
      .tickSize(-chartWidth)
      .ticks(5)
      .scale(yScale);

    mainGroup.append("g")
      .attr("class", "grid text-gray-800 opacity-20 font-mono")
      .call(yGrid)
      .call(g => g.selectAll(".tick line").attr("stroke-dasharray", "3,3"))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll("text").remove());

    // Render Gradient Area fill
    const areaGradientId = "price-area-gradient";
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", areaGradientId)
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "0%").attr("y2", "100%");

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#f59e0b")
      .attr("stop-opacity", 0.35);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#f59e0b")
      .attr("stop-opacity", 0);

    const areaGen = d3.area<DataPoint>()
      .x(d => xScale(d.date))
      .y0(chartHeight)
      .y1(d => yScale(d.priceIdr))
      .curve(d3.curveMonotoneX);

    mainGroup.append("path")
      .datum(marketData)
      .attr("fill", `url(#${areaGradientId})`)
      .attr("d", areaGen);

    // Draw Main Line
    const lineGen = d3.line<DataPoint>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.priceIdr))
      .curve(d3.curveMonotoneX);

    mainGroup.append("path")
      .datum(marketData)
      .attr("fill", "none")
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 2.5)
      .attr("d", lineGen);

    // Custom Axes Style
    const xAxis = d3.axisBottom(xScale)
      .ticks(d3.utcDay.every(5))
      .tickFormat((domainValue) => {
        const d = domainValue as Date;
        return d.toLocaleDateString("id-ID", { month: "short", day: "numeric" });
      });

    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(v => `Rp${(v as number).toLocaleString("id-ID")}`);

    // Render X Axis
    mainGroup.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .attr("class", "text-gray-500 font-mono text-[9px]")
      .call(xAxis)
      .call(g => g.select(".domain").attr("stroke", "#2e3b4e"))
      .call(g => g.selectAll(".tick line").attr("stroke", "#2e3b4e"));

    // Render Y Axis
    mainGroup.append("g")
      .attr("class", "text-gray-500 font-mono text-[9px]")
      .call(yAxis)
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke", "#2e3b4e"));

    // Draw interactive tooltip tracker overlay
    const trackingGroup = mainGroup.append("g")
      .attr("class", "tooltip-group")
      .style("display", "none");

    const verticalLine = trackingGroup.append("line")
      .attr("stroke", "#a1a1aa")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4")
      .attr("y1", 0)
      .attr("y2", chartHeight);

    const circleIndicator = trackingGroup.append("circle")
      .attr("r", 5)
      .attr("fill", "#f59e0b")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5);

    const tooltipRect = trackingGroup.append("rect")
      .attr("width", 140)
      .attr("height", 46)
      .attr("fill", "rgba(9, 11, 16, 0.95)")
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 1)
      .attr("rx", 6)
      .attr("ry", 6);

    const tooltipDateCol = trackingGroup.append("text")
      .attr("fill", "#94a3b8")
      .attr("font-size", "10px")
      .attr("font-family", "monospace")
      .attr("x", 8)
      .attr("y", 18);

    const tooltipValCol = trackingGroup.append("text")
      .attr("fill", "#ffffff")
      .attr("font-size", "11px")
      .attr("font-weight", "black")
      .attr("font-family", "monospace")
      .attr("x", 8)
      .attr("y", 35);

    // Interactive pointer invisible surface
    svg.append("rect")
      .attr("width", chartWidth)
      .attr("height", chartHeight)
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("fill", "transparent")
      .on("pointerenter pointermove", (event) => {
        trackingGroup.style("display", null);
        
        // Find closest date point
        const [xCoord] = d3.pointer(event);
        const hoverDate = xScale.invert(xCoord);
        const indexFinder = d3.bisector<DataPoint, Date>((d) => d.date).center;
        const i = indexFinder(marketData, hoverDate);
        const resolvedData = marketData[i];

        if (!resolvedData) return;

        const resolvedX = xScale(resolvedData.date);
        const resolvedY = yScale(resolvedData.priceIdr);

        verticalLine.attr("x1", resolvedX).attr("x2", resolvedX);
        circleIndicator.attr("cx", resolvedX).attr("cy", resolvedY);

        // Position responsive tooltip inside margins to prevent clip bounds
        const tooltipX = resolvedX > chartWidth - 150 ? resolvedX - 150 : resolvedX + 10;
        const tooltipY = resolvedY > chartHeight - 60 ? chartHeight - 60 : resolvedY - 10;

        tooltipRect.attr("x", tooltipX).attr("y", tooltipY);
        
        const dateStr = resolvedData.date.toLocaleDateString("id-ID", { month: "short", day: "numeric", year: "numeric" });
        tooltipDateCol.attr("x", tooltipX + 8).attr("y", tooltipY + 16).text(dateStr);
        tooltipValCol.attr("x", tooltipX + 8).attr("y", tooltipY + 34).text(`Rp ${resolvedData.priceIdr.toLocaleString("id-ID")}/LDR`);
      })
      .on("pointerleave", () => {
        trackingGroup.style("display", "none");
      });

  }, [marketData, priceDimensions]);

  // DRAW CHART 2: Network Payout Volume Histograms using D3
  useEffect(() => {
    if (marketData.length === 0 || !payoutSvgRef.current) return;

    // Clear previous elements
    const svg = d3.select(payoutSvgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = payoutDimensions;
    const margin = { top: 15, right: 15, bottom: 30, left: 55 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const mainGroup = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X Scale Band (Discrete dates)
    const xScale = d3.scaleBand<Date>()
      .domain(marketData.map(d => d.date))
      .range([0, chartWidth])
      .padding(0.25);

    // Y Scale linear (LDR Volume size)
    const yScale = d3.scaleLinear()
      .domain([0, (d3.max(marketData, (d: DataPoint) => d.volumeLdr) || 1200) * 1.1])
      .range([chartHeight, 0]);

    // Define Grid lines
    const yGrid = d3.axisLeft(yScale)
      .tickSize(-chartWidth)
      .ticks(5)
      .scale(yScale);

    mainGroup.append("g")
      .attr("class", "grid text-gray-800 opacity-20 font-mono")
      .call(yGrid)
      .call(g => g.selectAll(".tick line").attr("stroke-dasharray", "3,3"))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll("text").remove());

    // Draw Bars
    mainGroup.selectAll(".bar")
      .data(marketData)
      .enter()
      .append("rect")
      .attr("class", "bar transition-all")
      .attr("x", (d: any) => xScale((d as DataPoint).date) || 0)
      .attr("y", (d: any) => yScale((d as DataPoint).volumeLdr))
      .attr("width", xScale.bandwidth())
      .attr("height", (d: any) => chartHeight - yScale((d as DataPoint).volumeLdr))
      .attr("fill", "url(#teal-histogram-gradient)")
      .attr("rx", 1.5)
      .attr("ry", 1.5)
      .append("title")
      .text((d: any) => `${(d as DataPoint).date.toLocaleDateString("id-ID", { month: "short", day: "numeric" })}: ${(d as DataPoint).volumeLdr} LDR Terbayar`);

    // Define Gradient fill specifically for bars
    const barGradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "teal-histogram-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "0%").attr("y2", "100%");

    barGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#06b6d4");

    barGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#0891b2")
      .attr("stop-opacity", 0.4);

    // Custom formatted axes
    const xAxis = d3.axisBottom<Date>(xScale)
      .tickValues(marketData.filter((_, idx) => idx % 5 === 0).map(d => d.date)) // every 5 ticks
      .tickFormat((domainValue) => {
        return domainValue.toLocaleDateString("id-ID", { month: "short", day: "numeric" });
      });

    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(v => `${v} LDR`);

    // Render X Axis
    mainGroup.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .attr("class", "text-gray-500 font-mono text-[9px]")
      .call(xAxis)
      .call(g => g.select(".domain").attr("stroke", "#2e3b4e"))
      .call(g => g.selectAll(".tick line").attr("stroke", "#2e3b4e"));

    // Render Y Axis
    mainGroup.append("g")
      .attr("class", "text-gray-500 font-mono text-[9px]")
      .call(yAxis)
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke", "#2e3b4e"));

  }, [marketData, payoutDimensions]);

  const handleRefreshAnalytics = () => {
    playClickSound();
    
    // Re-modifying market trends briefly for feeling alive
    setMarketData(prev => {
      return prev.map(pt => {
        const adjustment = (Math.random() - 0.5) * 320;
        let p = Math.round(pt.priceIdr + adjustment);
        if (p < 9500) p = 9520;
        if (p > 16500) p = 16250;
        return {
          ...pt,
          priceIdr: p,
          volumeLdr: Math.round(pt.volumeLdr * (0.95 + Math.random() * 0.12))
        };
      });
    });

    playUpgradeSound();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2 font-sans animate-fade-in text-gray-100">
      
      {/* Header Banner */}
      <div className="bg-[#111420] border border-gray-800 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <Activity className="text-amber-400 shrink-0" size={24} />
              <h3 className="text-lg font-black text-white uppercase tracking-tight leading-none">
                Dasbor Analitik Pasar Koin LDR
              </h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
              Pantau visualisasi interaktif dari penyesuaian fluktuasi nilai koin LDR IDR dan frekuensi total payout global di seluruh federasi penambang galaksi selama 30 hari ke belakang.
            </p>
          </div>

          <button 
            onClick={handleRefreshAnalytics}
            className="self-start md:self-center bg-[#1d2334] border border-gray-750 text-gray-300 hover:text-amber-400 py-2.5 px-4 rounded-xl text-xs font-bold font-mono transition flex items-center gap-2"
          >
            <RefreshCw size={14} className="animate-spin-slow" />
            <span>SINKRONKAN PASAR (REALTIME)</span>
          </button>
        </div>

        {/* Dynamic Key Performance Indicators Indicators Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          
          <div className="bg-[#090b10] border border-gray-850 p-3.5 rounded-xl">
            <span className="text-[10px] font-mono text-gray-400 block uppercase tracking-wide">Kurs LDR Terkini</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black font-mono text-white leading-none">
                Rp {currentPrice.toLocaleString("id-ID")}
              </span>
              <span className={`text-[10px] font-bold font-mono flex items-center leading-none ${priceChangePct >= 0 ? "text-green-400" : "text-rose-400"}`}>
                {priceChangePct >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {priceChangePct >= 0 ? "+" : ""}{priceChangePct}%
              </span>
            </div>
          </div>

          <div className="bg-[#090b10] border border-gray-850 p-3.5 rounded-xl">
            <span className="text-[10px] font-mono text-gray-400 block uppercase tracking-wide">Puncak IDR 30 Hari (ATH)</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-black font-mono text-amber-500 leading-none">
                Rp {allTimeHigh.toLocaleString("id-ID")}
              </span>
              <span className="text-[9px] font-mono text-gray-500 text-nowrap">/ 1 LDR</span>
            </div>
          </div>

          <div className="bg-[#090b10] border border-gray-850 p-3.5 rounded-xl">
            <span className="text-[10px] font-mono text-gray-400 block uppercase tracking-wide">Total Payout Regional (30d)</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg font-black font-mono text-teal-400 leading-none">
                🪙 {totalNetworkPayout30d.toLocaleString("id-ID")}
              </span>
              <span className="text-[9px] text-gray-500 font-mono uppercase">LDR</span>
            </div>
          </div>

          <div className="bg-[#090b10] border border-gray-850 p-3.5 rounded-xl">
            <span className="text-[10px] font-mono text-gray-400 block uppercase tracking-wide">Otoritas Hashrate Pasar</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-black font-mono text-indigo-400 leading-none">
                98.42 TH/s
              </span>
              <span className="text-[9px] text-emerald-400 font-mono uppercase">STABIL</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Charts Containers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart Card 1: LDR Value Fluctuations */}
        <div className="bg-[#111420] border border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <LineChart size={16} className="text-amber-500" />
                <h4 className="text-xs font-black text-white tracking-widest uppercase font-mono">
                  GRAFIK NILAI KOIN LDR (IDR FLUKTUASI)
                </h4>
              </div>
              <span className="text-[9px] font-mono text-gray-500 flex items-center gap-1">
                <Calendar size={10} />
                <span>30 hari terakhir</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-tight mb-4">
              Arahkan kursor / sentuh canvas grafik di bawah ini untuk melihat rincian detail fluktuasi nilai koin pada tanggal khusus secara presisi.
            </p>
          </div>

          {/* D3 Ref Canvas parent */}
          <div ref={priceChartContainerRef} className="w-full bg-[#090b10] border border-gray-850 rounded-xl py-2 relative overflow-visible">
            <svg 
              ref={priceSvgRef} 
              width={priceDimensions.width} 
              height={priceDimensions.height}
              className="mx-auto block overflow-visible"
            />
          </div>

          <div className="mt-3.5 flex items-start gap-2 p-2.5 bg-[#0a0c14] border border-gray-850 rounded-xl text-[10px] font-mono text-gray-400">
            <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <span>
              Nilai koin LDR dihitung secara terpusat oleh algoritma fusi suika reaktor berdasarkan sirkulasi koin tambang global dan mineral yang terakumulasi.
            </span>
          </div>
        </div>

        {/* Chart Card 2: Historical Payout Trends */}
        <div className="bg-[#111420] border border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-teal-400" />
                <h4 className="text-xs font-black text-white tracking-widest uppercase font-mono">
                  TUMPUKAN VOLUME PAYOUT (HARIAN)
                </h4>
              </div>
              <span className="text-[9px] font-mono text-gray-500 flex items-center gap-1">
                <Calendar size={10} />
                <span>30 hari terakhir</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-tight mb-4">
              Representasi batang volumetrik penarikan dana koin LDR milik seluruh operator tambang yang selesai diverifikasi dalam tumpukan blok blockchain.
            </p>
          </div>

          {/* D3 Ref Canvas parent */}
          <div ref={payoutChartContainerRef} className="w-full bg-[#090b10] border border-gray-850 rounded-xl py-2 relative">
            <svg 
              ref={payoutSvgRef} 
              width={payoutDimensions.width} 
              height={payoutDimensions.height}
              className="mx-auto block"
            />
          </div>

          <div className="mt-3.5 flex items-start gap-2 p-2.5 bg-[#0a0c14] border border-gray-850 rounded-xl text-[10px] font-mono text-gray-400">
            <Info size={14} className="text-teal-400 shrink-0 mt-0.5" />
            <span>
              Histogram harian di atas diperbarui setiap akhir epilog pukul 00:00 UTC berdasarkan konsensus bukti kerja (PoW) pada sektor reaktor fusi.
            </span>
          </div>
        </div>

      </div>

      {/* Analytics Explanatory Bottom Panel */}
      <div className="bg-[#111420] border border-gray-800 rounded-2xl p-5 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <h5 className="text-[11px] font-bold text-amber-400 uppercase tracking-widest font-mono mb-2">
            🏷️ MEKANISME DINAMIS HARGA
          </h5>
          <p className="text-xs text-gray-400 leading-relaxed">
            Sejalan dengan tingginya intensitas pemain melakukan fusi material pada <strong>Sektor Fusi Tambang</strong>, kelangkaan mineral teratas seperti Ruby dan Sapphire memicu tarikan harga koin LDR ke atas.
          </p>
        </div>

        <div>
          <h5 className="text-[11px] font-bold text-teal-400 uppercase tracking-widest font-mono mb-2">
            ⏳ SISTEM FIFO PAYOUT JARINGAN
          </h5>
          <p className="text-xs text-gray-400 leading-relaxed">
            Semua penarikan yang Anda kukan melalui <strong>Payout & Cair</strong> akan disinkronasikan di stasiun. Grafik ini menunjukkan tidak ada penumpukan bottleneck sepanjang pekan ini.
          </p>
        </div>

        <div>
          <h5 className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest font-mono mb-2">
            💎 MINING EFFICIENCY RATIO
          </h5>
          <p className="text-xs text-gray-400 leading-relaxed">
            Bila hashrate meningkat di atas batas toleransi, sistem fusi mendinginkan konsumsi dengan meningkatkan radius fusi bertahap demi efisiensi pertambangan yang adil.
          </p>
        </div>
      </div>

    </div>
  );
}
