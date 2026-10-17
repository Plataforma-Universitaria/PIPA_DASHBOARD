"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "@/app/page.module.css";
import { formatNumber, formatPercent } from "@/lib/observability/format";
import { formatToolLabel } from "@/lib/observability/tool-labels";
import type { DailyTrend, Distribution, ToolUsage } from "@/lib/observability/types";

const COLORS = ["#44A866", "#AB4645", "#D89A45", "#2E78C8", "#299693"];

function EmptyChart() {
  return <div className={styles.emptyChart}>Não há dados para os filtros selecionados.</div>;
}

function AccessibleTable({
  caption,
  rows,
}: {
  caption: string;
  rows: Array<{ label: string; value: number }>;
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead><tr><th>Categoria</th><th>Requisições</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.label}><th>{row.label}</th><td>{row.value}</td></tr>)}</tbody>
    </table>
  );
}

function wrapToolLabel(label: string, maxCharacters: number): string[] {
  const lines: string[] = [];
  for (const word of label.split(" ").flatMap((word) => word.match(new RegExp(`.{1,${maxCharacters}}`, "g")) ?? [])) {
    const last = lines.length - 1;
    if (last >= 0 && lines[last].length + word.length + 1 <= maxCharacters) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  return lines;
}

function ToolLabelTick({ x = 0, y = 0, payload, width }: {
  x?: number | string;
  y?: number | string;
  payload?: { value: string };
  width: number;
}) {
  const label = payload?.value ?? "";
  const maxCharacters = Math.max(12, Math.floor((width - 16) / 7));
  const lines = wrapToolLabel(label, maxCharacters);
  return <text x={x} y={y} textAnchor="end" fill="#9AA2A9" fontSize={12}>
    <title>{label}</title>
    {lines.map((line, index) => <tspan key={index} x={x} dy={index === 0 ? 4 - (lines.length - 1) * 7 : 14}>{line}</tspan>)}
  </text>;
}

export function ToolUsageChart({ data, toolLabels }: { data: ToolUsage[]; toolLabels?: Record<string, string> }) {
  const [chartWidth, setChartWidth] = useState(640);
  const rows = data.slice(0, 10).map((item) => ({ ...item, toolLabel: formatToolLabel(item.toolName, toolLabels) }));
  const labelWidth = chartWidth < 600 ? 150 : 290;
  const rowHeight = Math.max(56, ...rows.map((item) => wrapToolLabel(item.toolLabel, Math.floor((labelWidth - 16) / 7)).length * 14 + 20));
  if (!rows.length) return <EmptyChart />;
  return <>
    <div className={styles.toolChartCanvas} style={{ height: Math.max(240, rows.length * rowHeight + 40) }}>
      <ResponsiveContainer width="100%" height="100%" onResize={(width) => setChartWidth(width)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 4 }} accessibilityLayer>
          <CartesianGrid stroke="#2c3338" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: "#9AA2A9", fontSize: 11 }} />
          <YAxis type="category" dataKey="toolLabel" width={labelWidth} interval={0} tick={<ToolLabelTick width={labelWidth} />} />
          <Tooltip cursor={{ fill: "rgba(46,120,200,.08)" }} contentStyle={{ background: "#1C2428", border: "1px solid #3a4147", borderRadius: 8 }} formatter={(value) => [formatNumber(Number(value)), "Requisições"]} />
          <Bar dataKey="requests" fill="#299693" radius={[0, 5, 5, 0]} maxBarSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <AccessibleTable caption="Top 10 ferramentas por número de requisições" rows={rows.map((item) => ({ label: item.toolLabel, value: item.requests }))} />
  </>;
}

export function DailyTrendChart({ data }: { data: DailyTrend[] }) {
  if (!data.length) return <EmptyChart />;
  return <><div className={styles.chartCanvas}><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 12, right: 8, left: -22, bottom: 4 }} accessibilityLayer><defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2E78C8" stopOpacity={0.38} /><stop offset="100%" stopColor="#2E78C8" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#2c3338" vertical={false} /><XAxis dataKey="date" tick={{ fill: "#9AA2A9", fontSize: 10 }} tickFormatter={(value) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))} /><YAxis allowDecimals={false} tick={{ fill: "#9AA2A9", fontSize: 10 }} /><Tooltip contentStyle={{ background: "#1C2428", border: "1px solid #3a4147", borderRadius: 8 }} formatter={(value) => [formatNumber(Number(value)), "Requisições"]} /><Area type="monotone" dataKey="requests" stroke="#4A91DC" strokeWidth={2} fill="url(#trendFill)" /></AreaChart></ResponsiveContainer></div><AccessibleTable caption="Tendência diária de requisições" rows={data.map((item) => ({ label: item.date, value: item.requests }))} /></>;
}

export function StatusChart({ data, successRate }: { data: Distribution[]; successRate: number | null }) {
  if (!data.length) return <EmptyChart />;
  return <><div className={styles.donutChart}><ResponsiveContainer width="100%" height="100%"><PieChart accessibilityLayer><Pie data={data} dataKey="requests" nameKey="label" innerRadius="62%" outerRadius="84%" paddingAngle={2}>{data.map((item, index) => <Cell key={item.label} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: "#1C2428", border: "1px solid #3a4147", borderRadius: 8 }} formatter={(value) => [formatNumber(Number(value)), "Requisições"]} /></PieChart></ResponsiveContainer><div className={styles.donutLabel}><strong>{formatPercent(successRate)}</strong><span>sucesso</span></div></div><div className={styles.statusLegend}>{data.map((item, index) => <span key={item.label}><i style={{ background: COLORS[index % COLORS.length] }} />{item.label}: {formatNumber(item.requests)}</span>)}</div><AccessibleTable caption="Distribuição do status das requisições" rows={data.map((item) => ({ label: item.label, value: item.requests }))} /></>;
}

export function ChannelChart({ data }: { data: Distribution[] }) {
  if (!data.length) return <EmptyChart />;
  return <><div className={styles.chartCanvas}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 12, right: 22, left: 10, bottom: 4 }} accessibilityLayer><CartesianGrid stroke="#2c3338" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fill: "#9AA2A9", fontSize: 10 }} /><YAxis type="category" dataKey="label" width={82} tick={{ fill: "#9AA2A9", fontSize: 11 }} /><Tooltip cursor={{ fill: "rgba(46,120,200,.08)" }} contentStyle={{ background: "#1C2428", border: "1px solid #3a4147", borderRadius: 8 }} formatter={(value) => [formatNumber(Number(value)), "Requisições"]} /><Bar dataKey="requests" fill="#2E78C8" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div><AccessibleTable caption="Requisições agrupadas por canal" rows={data.map((item) => ({ label: item.label, value: item.requests }))} /></>;
}
