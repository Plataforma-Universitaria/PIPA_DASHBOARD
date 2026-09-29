"use client";

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

export function ToolUsageChart({ data }: { data: ToolUsage[] }) {
  const rows = data.slice(0, 10);
  if (!rows.length) return <EmptyChart />;
  return <><div className={styles.chartCanvas}><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} margin={{ top: 12, right: 4, left: -22, bottom: 34 }} accessibilityLayer><CartesianGrid stroke="#2c3338" vertical={false} /><XAxis dataKey="toolName" angle={-28} textAnchor="end" interval={0} tick={{ fill: "#9AA2A9", fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fill: "#9AA2A9", fontSize: 10 }} /><Tooltip cursor={{ fill: "rgba(46,120,200,.08)" }} contentStyle={{ background: "#1C2428", border: "1px solid #3a4147", borderRadius: 8 }} formatter={(value) => [formatNumber(Number(value)), "Requisições"]} /><Bar dataKey="requests" fill="#299693" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div><AccessibleTable caption="Top 10 ferramentas por número de requisições" rows={rows.map((item) => ({ label: item.toolName, value: item.requests }))} /></>;
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
