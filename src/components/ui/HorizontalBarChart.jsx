import React, { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const COLORS = ["#27AE60", "#2980B9", "#16A085", "#D35400", "#8E44AD"];

export default function HorizontalBarChart({ labels = [], values = [] }) {
  const safeLabels = labels.length ? labels : ["No data"];
  const safeValues = labels.length ? values : [0];

  const data = useMemo(
    () => ({
      labels: safeLabels,
      datasets: [
        {
          label: "Number of orders",
          data: safeValues,
          backgroundColor: safeLabels.map((_, i) => COLORS[i % COLORS.length]),
          borderRadius: 4,
        },
      ],
    }),
    [safeLabels, safeValues]
  );

  const options = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          drawTicks: false,
          drawBorder: false,
          color: "transparent",
        },
      },
      y: {
        grid: {
          drawTicks: false,
          drawBorder: false,
          color: "transparent",
        },
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
      <Bar data={data} options={options} plugins={[chartAreaBackground]} />
    </div>
  );
}
