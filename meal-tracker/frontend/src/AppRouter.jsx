import { Routes, Route } from "react-router-dom";
import Dashboard from "./Dashboard";
import Login from "./Login"; 

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Dashboard />} />
    </Routes>
  );
}
