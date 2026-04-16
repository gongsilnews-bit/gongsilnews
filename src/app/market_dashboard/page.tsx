"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FaClock, FaLocationDot, FaCity, FaHouse, FaBuilding, FaHouseChimney, FaListCheck, FaArrowUp, FaArrowDown } from "react-icons/fa6";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Constants
const regionsAll = ['전국', '수도권', '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

// Deterministic random
function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Data generation
const genHistory = (base: number, vol: number, baseSeed: number) => {
  let hist = [], cur = base;
  for (let i = 30; i >= 0; i--) {
    const d = new Date(); 
    d.setDate(d.getDate() - i);
    const r = pseudoRandom(baseSeed + i);
    cur += (r * vol * 2 - vol);
    hist.push({ x: d.toISOString().split('T')[0], y: parseFloat(cur.toFixed(2)) });
  }
  return hist;
};

// Helpers
const lastVal = (hist: {x: string, y: number}[]) => hist[hist.length - 1].y;
const prevVal = (hist: {x: string, y: number}[]) => hist[hist.length - 2].y;

export default function MarketDashboard() {
  const [mounted, setMounted] = useState(false);
  const [region, setRegion] = useState("부산");
  const [saleData, setSaleData] = useState<Record<string, {x: string, y: number}[]>>({});
  const [rentData, setRentData] = useState<Record<string, {x: string, y: number}[]>>({});

  useEffect(() => {
    const sd: Record<string, {x: string, y: number}[]> = {};
    const rd: Record<string, {x: string, y: number}[]> = {};
    regionsAll.forEach((reg, i) => {
      const seed1 = i * 100;
      const seed2 = i * 200;
      sd[reg] = genHistory(102 - i * 0.6 + pseudoRandom(seed1) * 3, 0.18, seed1);
      rd[reg] = genHistory(100 - i * 0.4 + pseudoRandom(seed2) * 2, 0.14, seed2);
    });
    setSaleData(sd);
    setRentData(rd);
    setMounted(true);
  }, []);

  if (!mounted || !saleData['전국']) return <div className="min-h-screen bg-[#F6F9FC] flex justify-center items-center">Loading...</div>;

  const renderChange = (hist: {x: string, y: number}[]) => {
    const cur = lastVal(hist), prev = prevVal(hist);
    const up = cur >= prev;
    const diff = Math.abs(cur - prev).toFixed(2);
    return up ? (
      <span className="text-[13px] font-semibold px-[7px] py-[3px] rounded bg-[#d32f2f1a] text-[#d32f2f] inline-flex items-center gap-[3px]">
        <FaArrowUp /> {diff}%
      </span>
    ) : (
      <span className="text-[13px] font-semibold px-[7px] py-[3px] rounded bg-[#1976d21a] text-[#1976d2] inline-flex items-center gap-[3px]">
        <FaArrowDown /> {diff}%
      </span>
    );
  };

  // Line Chart Data
  const lineChartData = {
    labels: saleData['전국'].map(d => d.x),
    datasets: [
      { label: '전국', data: saleData['전국'].map(d => d.y), borderColor: '#bbb', backgroundColor: 'transparent', borderWidth: 1.5, tension: 0.3, pointRadius: 0 },
      { label: '수도권', data: saleData['수도권'].map(d => d.y), borderColor: '#90caf9', backgroundColor: 'transparent', borderWidth: 1.5, tension: 0.3, pointRadius: 0 },
      { label: '서울', data: saleData['서울'].map(d => d.y), borderColor: '#0A2540', backgroundColor: 'rgba(10,37,64,.08)', borderWidth: 2.5, fill: true, tension: 0.3, pointRadius: 0 },
      { label: region, data: saleData[region].map(d => d.y), borderColor: '#e53935', backgroundColor: 'transparent', borderWidth: 2.5, borderDash: [8, 6], tension: 0.3, pointRadius: 4, pointStyle: 'circle' as const, pointBackgroundColor: '#e53935', pointBorderColor: '#fff', pointBorderWidth: 2 },
    ]
  };

  const lineChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const } },
    scales: { y: { min: 80, max: 112 } }
  };

  // Bar Chart Data
  const compareRegions = Array.from(new Set(['전국', '수도권', '서울', region]));
  const barChartData = {
    labels: compareRegions,
    datasets: [
      {
        label: '매매지수',
        data: compareRegions.map(r => lastVal(saleData[r])),
        backgroundColor: compareRegions.map(r => r === region ? 'rgba(229,57,53,0.85)' : '#0A2540'),
        borderColor: compareRegions.map(r => r === region ? '#b71c1c' : '#0A2540'),
        borderWidth: compareRegions.map(r => r === region ? 3 : 0),
        borderRadius: 4
      },
      {
        label: '전세지수',
        data: compareRegions.map(r => lastVal(rentData[r])),
        backgroundColor: compareRegions.map(r => r === region ? 'rgba(255,152,0,0.85)' : '#1976d2'),
        borderColor: compareRegions.map(r => r === region ? '#e65100' : '#1976d2'),
        borderWidth: compareRegions.map(r => r === region ? 3 : 0),
        borderRadius: 4
      }
    ]
  };

  const barChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const } },
    scales: { y: { min: 80 } }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC] text-[#333] font-sans">
      
      {/* Topbar */}
      <div className="bg-white px-[30px] py-[15px] border-b border-[#eaeaea] flex justify-between items-center sticky top-0 z-[100]">
        <Link href="/" className="text-[20px] font-extrabold text-[#0A2540] no-underline flex items-center gap-[10px]">
          <img src="/assets/images/logo.png" style={{ height: "28px" }} alt="공실뉴스" />
          전국데이터지수 대시보드
        </Link>
        <Link href="/" className="px-4 py-2 bg-[#0A2540] text-white no-underline text-[14px] font-semibold rounded hover:bg-black transition-colors">
          메인으로 돌아가기
        </Link>
      </div>

      <div className="max-w-[1400px] w-full mx-auto my-[40px] px-[20px]">
        {/* Dashboard Header */}
        <div className="mb-[28px]">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-[30px] font-extrabold m-0 text-[#111] flex items-center gap-[10px]">
                부동산 시장 종합 분석
              </h1>
              <p className="m-0 mt-[6px] text-[#666] text-[15px]">전국 지역별 매매·전세 가격지수 일간 트렌드 (중개사 전용 패널)</p>
            </div>
            <div className="text-[13px] text-[#888] bg-white px-3 py-1.5 rounded-full border border-[#ddd] whitespace-nowrap">
              <FaClock className="inline mr-1" /> 최종 업데이트: <span id="update-time">Today 09:00</span>
            </div>
          </div>

          <div className="bg-white border border-[#eaeaea] rounded-[10px] py-[18px] px-[24px] mt-[20px] flex items-center gap-[20px] flex-wrap">
            <label className="text-[14px] font-bold text-[#0A2540] whitespace-nowrap">
              <FaLocationDot className="inline mr-1" /> 지역 선택
            </label>
            <div>
              <select 
                value={region} 
                onChange={(e) => setRegion(e.target.value)}
                className="px-[14px] py-[9px] rounded-md border-2 border-[#0A2540] text-[15px] font-semibold bg-white outline-none cursor-pointer text-[#0A2540] focus:border-[#1976d2]"
              >
                {regionsAll.map(reg => (
                  <option key={reg} value={reg}>{reg}</option>
                ))}
              </select>
            </div>
            <span className="text-[13px] text-[#aaa]">* 선택 지역의 지수를 전국·수도권·서울과 비교합니다</span>
          </div>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[20px] mb-[36px]">
          {/* Card 1 */}
          <div className="bg-white p-[25px] rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-black/5">
            <div className="w-[44px] h-[44px] rounded-full bg-[#e8eaf6] text-[#3949ab] flex items-center justify-center text-[20px] mb-[14px]"><FaCity /></div>
            <div className="text-[14px] text-[#666] font-semibold mb-[8px]">매매지수 (전국)</div>
            <div className="text-[26px] font-extrabold tracking-[-0.5px] m-0 flex items-center gap-[8px] flex-wrap">
              {lastVal(saleData['전국'])} {renderChange(saleData['전국'])}
            </div>
          </div>
          {/* Card 2 */}
          <div className="bg-white p-[25px] rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-black/5">
            <div className="w-[44px] h-[44px] rounded-full bg-[#e3f2fd] text-[#1976d2] flex items-center justify-center text-[20px] mb-[14px]"><FaHouse /></div>
            <div className="text-[14px] text-[#666] font-semibold mb-[8px]">전세지수 (전국)</div>
            <div className="text-[26px] font-extrabold tracking-[-0.5px] m-0 flex items-center gap-[8px] flex-wrap">
              {lastVal(rentData['전국'])} {renderChange(rentData['전국'])}
            </div>
          </div>
          {/* Card 3 */}
          <div className="bg-[#f0f4fa] p-[25px] rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] border-2 border-[#0A2540]">
            <div className="w-[44px] h-[44px] rounded-full bg-[#fce4ec] text-[#c62828] flex items-center justify-center text-[20px] mb-[14px]"><FaBuilding /></div>
            <div className="text-[12px] text-[#0A2540] font-bold mb-[4px] bg-[#0A254014] inline-block px-[8px] py-[2px] rounded-[20px]">{region}</div>
            <div className="text-[14px] text-[#666] font-semibold mb-[8px]">선택 지역 매매지수</div>
            <div className="text-[26px] font-extrabold tracking-[-0.5px] m-0 flex items-center gap-[8px] flex-wrap">
              {lastVal(saleData[region])} {renderChange(saleData[region])}
            </div>
          </div>
          {/* Card 4 */}
          <div className="bg-[#f0f4fa] p-[25px] rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] border-2 border-[#0A2540]">
            <div className="w-[44px] h-[44px] rounded-full bg-[#e8f5e9] text-[#2e7d32] flex items-center justify-center text-[20px] mb-[14px]"><FaHouseChimney /></div>
            <div className="text-[12px] text-[#0A2540] font-bold mb-[4px] bg-[#0A254014] inline-block px-[8px] py-[2px] rounded-[20px]">{region}</div>
            <div className="text-[14px] text-[#666] font-semibold mb-[8px]">선택 지역 전세지수</div>
            <div className="text-[26px] font-extrabold tracking-[-0.5px] m-0 flex items-center gap-[8px] flex-wrap">
              {lastVal(rentData[region])} {renderChange(rentData[region])}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-[28px] mb-[36px]">
          <div className="bg-white p-[28px] rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="flex justify-between items-center mb-[18px]">
              <h2 className="text-[18px] font-bold m-0">30일 매매지수 트렌드 (지역 비교)</h2>
            </div>
            <div className="relative h-[340px] w-full">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>
          </div>
          <div className="bg-white p-[28px] rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="flex justify-between items-center mb-[18px]">
              <h2 className="text-[18px] font-bold m-0">매매·전세 비교현황</h2>
            </div>
            <div className="relative h-[340px] w-full">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white p-[28px] rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <h2 className="text-[18px] font-bold m-0 mb-[18px] flex items-center gap-[8px]">
            <FaListCheck /> 전국 시도별 지수 현황보드
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="bg-[#F6F9FC] p-[13px_15px] font-semibold text-[#666] border-b-2 border-[#ddd] text-left">지역</th>
                  <th className="bg-[#F6F9FC] p-[13px_15px] font-semibold text-[#666] border-b-2 border-[#ddd] text-left">매매지수</th>
                  <th className="bg-[#F6F9FC] p-[13px_15px] font-semibold text-[#666] border-b-2 border-[#ddd] text-left">전세지수</th>
                  <th className="bg-[#F6F9FC] p-[13px_15px] font-semibold text-[#666] border-b-2 border-[#ddd] text-left">매매 전일대비</th>
                  <th className="bg-[#F6F9FC] p-[13px_15px] font-semibold text-[#666] border-b-2 border-[#ddd] text-left">전세 전일대비</th>
                  <th className="bg-[#F6F9FC] p-[13px_15px] font-semibold text-[#666] border-b-2 border-[#ddd] text-left">30일 매매추세</th>
                </tr>
              </thead>
              <tbody>
                {regionsAll.map((reg) => {
                  const sv = lastVal(saleData[reg]).toFixed(1);
                  const rv = lastVal(rentData[reg]).toFixed(1);
                  const sUp = Number(sv) >= prevVal(saleData[reg]);
                  const rUp = Number(rv) >= prevVal(rentData[reg]);
                  const sDiff = Math.abs(Number(sv) - prevVal(saleData[reg])).toFixed(2);
                  const rDiff = Math.abs(Number(rv) - prevVal(rentData[reg])).toFixed(2);
                  
                  return (
                    <tr key={reg} className="hover:bg-[#fafafa]">
                      <td className="p-[13px_15px] border-b border-[#eee] text-[14px] font-bold text-[#111]">{reg}</td>
                      <td className="p-[13px_15px] border-b border-[#eee] text-[14px] font-bold">{sv}</td>
                      <td className="p-[13px_15px] border-b border-[#eee] text-[14px] font-bold">{rv}</td>
                      <td className={`p-[13px_15px] border-b border-[#eee] text-[14px] font-semibold ${sUp ? "text-[#d32f2f]" : "text-[#1976d2]"}`}>
                        {sUp ? <FaArrowUp className="inline" /> : <FaArrowDown className="inline" />} {sDiff}%
                      </td>
                      <td className={`p-[13px_15px] border-b border-[#eee] text-[14px] font-semibold ${rUp ? "text-[#d32f2f]" : "text-[#1976d2]"}`}>
                        {rUp ? <FaArrowUp className="inline" /> : <FaArrowDown className="inline" />} {rDiff}%
                      </td>
                      <td className="p-[13px_15px] border-b border-[#eee] text-[14px]">
                        <div className="w-full h-[8px] bg-[#eee] rounded-[4px]">
                          <div 
                            className="h-full rounded-[4px]" 
                            style={{ 
                              width: `${Math.min(Number(sv), 100)}%`, 
                              background: sUp ? '#d32f2f' : '#1976d2' 
                            }} 
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
