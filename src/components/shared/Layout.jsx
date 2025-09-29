import React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Main from "./Main";

export default function Layout({ content }) {
  return (
    <div>
      <Header />
      <div className="flex">
        <Sidebar />
        <Main content={content} />
      </div>
    </div>
  );
}
