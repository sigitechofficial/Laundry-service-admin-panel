import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const ACCENT = "#2c3ba0";
const ACCENT_FILL = "rgba(44, 59, 160, 0.12)";
const TICK = "#5c6673";
const GRID = "#e6e9f0";
const FONT = "Inter, system-ui, sans-serif";

export default function AreaChart({ labels = [], values = [] }) {
  const safeLabels = useMemo(
    () => (labels.length ? labels : ["No data"]),
    [labels]
  );
  const safeValues = useMemo(
    () =>
      labels.length
        ? values.map((v) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
          })
        : [0],
    [labels, values]
  );

  const data = useMemo(
    () => ({
      labels: safeLabels,
      datasets: [
        {
          label: "Admin revenue",
          data: safeValues,
          borderColor: ACCENT,
          backgroundColor: ACCENT_FILL,
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: ACCENT,
          pointBorderColor: "#fff",
          pointBorderWidth: 1.5,
        },
      ],
    }),
    [safeLabels, safeValues]
  );

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
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
        ticks: { font: { family: FONT, size: 11 }, color: TICK, padding: 8 },
      },
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: {
          font: { family: FONT, size: 11 },
          color: TICK,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
    },
  };

  return (
    <div className="h-[280px] w-full">
      <Line data={data} options={options} />
    </div>
  );
}
