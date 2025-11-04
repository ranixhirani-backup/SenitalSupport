import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import CustomerDetails from "./pages/CustomerDetails";
import Alerts from "./pages/Alerts";
import TriageView from "./pages/TriageView";
import FreezeCard from "./pages/FreezeCard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/customer/:id" element={<CustomerDetails />} />
        <Route path="/alerts" element={<Alerts />} />
        {/* <Route path="/triage/:alertId" element={<TriageView />} /> */}
        <Route path="/triage/:runId" element={<TriageView />} />
        <Route path="/freeze-card/:cardId" element={<FreezeCard />} />
        {/* <Route path="/alerts" element={<Alerts />} />
        <Route path="/customer/:id" element={<Customer />} />
        <Route path="/evals" element={<Evals />} /> */}
      </Routes>
    </Router>
  );
}

export default App;
