import React from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

function MainLayout({ usuario, children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <Header usuario={usuario} />
      <main className="pl-56 pt-20 pr-6 pb-6">
        {React.cloneElement(children, { usuario })}
      </main>
    </div>
  );
}

export default MainLayout;
