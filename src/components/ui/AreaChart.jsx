import React from "react";
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

// Register components
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

export default function AreaChart() {
  const data = {
    labels: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    datasets: [
      {
        label: "Revenue",
        data: [60, 130, 90, 70, 75, 110, 100, 80, 55, 40, 65, 50],
        borderColor: "#379465",
        backgroundColor: "#3794651F",
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: "#379465",
      },
    ],
  };

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
        ticks: {
          stepSize: 200,
        },
        grid: { display: false },
      },
      x: {
        grid: { display: false },
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
      ctx.fillStyle = "white";
      ctx.fillRect(left, top, width, height);
      ctx.restore();
    },
  };

  return (
    <div className="font-Inter" style={{ height: "350px" }}>
      <Line data={data} options={options} plugins={[chartAreaBackground]} />
    </div>
  );
}
