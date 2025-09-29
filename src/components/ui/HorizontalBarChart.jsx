import React from "react";
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

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function HorizontalBarChart() {
  const data = {
    labels: ["Dry Cleaning", "Wash & Fold", "Ironing", "Repair", "Washing"], // left side labels
    datasets: [
      {
        label: "Number of Requests",
        data: [150, 250, 100, 300, 100], // your values
        backgroundColor: [
          "#27AE60",
          "#2980B9",
          "#16A085",
          "#D35400",
          "#8E44AD",
        ], // different color for each bar
        borderRadius: 4,
      },
    ],
  };

  const options = {
    indexAxis: "y", // horizontal bars
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        ticks: { stepSize: 100 },
        grid: {
          drawTicks: false,
          drawBorder: false,
          color: "transparent", // remove grid lines
        },
      },
      y: {
        grid: {
          drawTicks: false,
          drawBorder: false,
          color: "transparent", // remove grid lines
        },
      },
    },
  };

  // Plugin to fill only chart area with white
  const chartAreaBackground = {
    id: "chartAreaBackground",
    beforeDraw: (chart) => {
      const {
        ctx,
        chartArea: { left, top, width, height },
      } = chart;
      ctx.save();
      ctx.fillStyle = "white"; // white background
      ctx.fillRect(left, top, width, height);
      ctx.restore();
    },
  };

  return (
    <div className="font-Inter" style={{ height: "350px" }}>
      <Bar data={data} options={options} plugins={[chartAreaBackground]} />
    </div>
  );
}
