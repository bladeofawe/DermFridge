import { Routes, Route } from "react-router-dom";
import { Hero, Auth, Forgot, Home, NotFound, Sign, CameraCapture, AnalysisResults, History, Inventory } from "@/pages";
import { ProtectedRoute } from "@/components";

function App() {
  return (
    <div>
      <Routes>
        {/* publics */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/sign" element={<Sign />} />
        <Route path="/forgot" element={<Forgot />} />

        {/* protected */}
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/capture" element={<ProtectedRoute><CameraCapture /></ProtectedRoute>} />
        <Route path="/analysis/:photoId" element={<ProtectedRoute><AnalysisResults /></ProtectedRoute>}/>
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>}/>
        <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        {/* default */}
        <Route path="/" element={<Hero />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;