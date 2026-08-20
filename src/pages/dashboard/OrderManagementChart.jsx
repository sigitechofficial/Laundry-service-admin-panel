import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const FONT = "Inter, system-ui, sans-serif";
const TICK = "#5c6673";
const GRID = "#e6e9f0";

const STAGES = [
  { key: "pending", label: "Pending", color: "#b57200", tint: "#fbefd6" },
  { key: "inProgress", label: "In progress", color: "#2a63d6", tint: "#e8effe" },
  { key: "outForDelivery", label: "Out for delivery", color: "#5f47c4", tint: "#efeafe" },
  { key: "completed", label: "Completed", color: "#0b8a5e", tint: "#e2f3ea" },
];

export default function OrderManagementChart({
  pending = 0,
  inProgress = 0,
  outForDelivery = 0,
  completed = 0,
}) {
  const counts = {
    pending: Number(pending) || 0,
    inProgress: Number(inProgress) || 0,
    outForDelivery: Number(outForDelivery) || 0,
    completed: Number(completed) || 0,
  };

  const data = {
    labels: STAGES.map((s) => s.label),
    datasets: [
      {
        label: "Orders",
        data: STAGES.map((s) => counts[s.key]),
        backgroundColor: STAGES.map((s) => s.color),
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 42,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        titleFont: { family: FONT, size: 12 },
        bodyFont: { family: FONT, size: 12 },
        padding: 10,
        backgroundColor: "#0e131c",
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: GRID, drawBorder: false },
        ticks: {
          font: { family: FONT, size: 11 },
          color: TICK,
          precision: 0,
          padding: 8,
        },
      },
      x: {
        border: { display: false },
        grid: { display: false, drawBorder: false },
        ticks: { display: false },
      },
    },
  };

  return (
    <div>
      <div className="h-[240px] font-[Inter,system-ui,sans-serif]">
        <Bar data={data} options={options} />
      </div>
      <ul className="mt-4 mb-0 flex list-none flex-wrap gap-x-4 gap-y-2 p-0">
        {STAGES.map((stage) => (
          <li key={stage.key} className="flex items-center gap-2 text-[12.5px] text-[var(--ink-2)]">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: stage.color }}
              aria-hidden
            />
            <span>{stage.label}</span>
            <span className="font-semibold text-[var(--ink)] [font-variant-numeric:tabular-nums]">
              {counts[stage.key]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
