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

// Register Chart.js components
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
    ctx.save();
    ctx.fillStyle = "white"; // ✅ white background only behind bars
    ctx.fillRect(
      chartArea.left,
      chartArea.top,
      chartArea.right - chartArea.left,
      chartArea.bottom - chartArea.top
    );
    ctx.restore();
  },
};

export default function OrderManagementChart() {
  const data = {
    labels: ["Pending", "In-Progress", "Out for Delivery", "Completed"],
    datasets: [
      {
        label: "Orders",
        data: [50, 200, 100, 450], // example values
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
      title: {
        display: true,
        // text: "Orders Management",
        font: {
          size: 18,
          weight: "bold",
          family: "Inter", // ✅ use Inter font
        },
      },
      tooltip: {
        titleFont: { family: "Inter" },
        bodyFont: { family: "Inter" },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: false, // ✅ remove horizontal lines
          drawBorder: false,
        },
        ticks: {
          font: { family: "Inter" },
          stepSize: 100,
        },
      },
      x: {
        grid: {
          display: false, // ✅ remove vertical lines
          drawBorder: false,
        },
        ticks: {
          font: { family: "Inter" },
        },
      },
    },
  };

  return (
    <div className="font-Inter h-[350px]">
      <Bar data={data} options={options} plugins={[chartAreaBackground]} />
    </div>
  );
}
