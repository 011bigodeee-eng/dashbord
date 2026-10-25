"use client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { currency } from "@/lib/schemas";
const tooltip = {
  background: "#171c20",
  border: "1px solid #30383e",
  borderRadius: 6,
  color: "#f5f6f7",
  fontSize: 12,
};
export const colors = ["#F47735", "#5DADE2", "#41C995", "#B597EB", "#D7BC76"];
export function GrowthChart({
  data,
  compare = false,
  unit = "alunos",
}: {
  data: { label: string; value: number; previous?: number }[];
  compare?: boolean;
  unit?: string;
}) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 15, bottom: 0, left: -24 }}
        >
          <defs>
            <linearGradient id="orangeFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F47735" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#F47735" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="#252b30"
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#7d8790", fontSize: 10 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#7d8790", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={tooltip}
            formatter={(value) => [`${value} ${unit}`, "Total"]}
          />
          {compare && (
            <Area
              type="monotone"
              dataKey="previous"
              stroke="#59636d"
              fill="none"
              strokeDasharray="4 4"
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke="#F47735"
            strokeWidth={2.5}
            fill="url(#orangeFade)"
            activeDot={{ r: 5, stroke: "#080a0b", strokeWidth: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function RevenueChart({
  data,
}: {
  data: {
    label: string;
    received: number;
    pending: number;
    expected: number;
  }[];
}) {
  return (
    <div className="chart revenue-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          barGap={3}
          margin={{ left: -12, right: 8, top: 12 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="#252b30"
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#7d8790", fontSize: 10 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#7d8790", fontSize: 10 }}
            tickFormatter={(v) => `${v / 1000}k`}
          />
          <Tooltip
            contentStyle={tooltip}
            formatter={(v) => currency(Number(v))}
          />
          <Bar
            name="Recebida"
            dataKey="received"
            fill="#5DADE2"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            name="Prevista"
            dataKey="expected"
            fill="#354956"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            name="Pendente"
            dataKey="pending"
            fill="#F47735"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function Distribution({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <div className="distribution">
      <div className="donut">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius="72%"
              outerRadius="94%"
              paddingAngle={4}
              stroke="none"
              cornerRadius={3}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <b>{data.reduce((s, d) => s + d.value, 0)}</b>
          <span>alunos ativos</span>
        </div>
      </div>
      <div className="chart-legend">
        {data.map((d, i) => (
          <div key={d.name}>
            <i style={{ background: colors[i] }} />
            <span>{d.name}</span>
            <b>{d.value}</b>
            <small>
              {Math.round(
                (d.value / (data.reduce((s, x) => s + x.value, 0) || 1)) * 100,
              )}
              %
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}
