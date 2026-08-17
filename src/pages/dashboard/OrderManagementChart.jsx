import React from "react";
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

const chartAreaBackground = {
  id: "chartAreaBackground",
  beforeDraw: (chart) => {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    ctx.save();
    ctx.fillStyle = "white";
    ctx.fillRect(
      chartArea.left,
      chartArea.top,
      chartArea.right - chartArea.left,
      chartArea.bottom - chartArea.top
    );
    ctx.restore();
  },
};

export default function OrderManagementChart({
  pending = 0,
  inProgress = 0,
  outForDelivery = 0,
  completed = 0,
}) {
  const data = {
    labels: ["Pending", "In-Progress", "Out for Delivery", "Completed"],
    datasets: [
      {
        label: "Orders",
        data: [
          Number(pending) || 0,
          Number(inProgress) || 0,
          Number(outForDelivery) || 0,
          Number(completed) || 0,
        ],
        backgroundColor: ["#FFC107", "#007BFF", "#05A0B7", "#28A745"],
        borderRadius: 0,
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
        titleFont: { family: "Inter" },
        bodyFont: { family: "Inter" },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { display: false, drawBorder: false },
        ticks: { font: { family: "Inter" } },
      },
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { font: { family: "Inter" } },
      },
    },
  };

  return (
    <div className="font-Inter h-[350px]">
      <Bar data={data} options={options} plugins={[chartAreaBackground]} />
    </div>
  );
}
