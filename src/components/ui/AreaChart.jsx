import React, { useMemo } from "react";
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
          borderColor: "#379465",
          backgroundColor: "#3794651F",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#379465",
        },
      ],
    }),
    [safeLabels, safeValues]
  );

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { display: false },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  const chartAreaBackground = {
    id: "chartAreaBackground",
    beforeDraw: (chart) => {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      ctx.save();
      ctx.fillStyle = "white";
      ctx.fillRect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
      ctx.restore();
    },
  };

  return (
    <div className="font-Inter" style={{ height: "350px" }}>
      <Line data={data} options={options} plugins={[chartAreaBackground]} />
    </div>
  );
}
