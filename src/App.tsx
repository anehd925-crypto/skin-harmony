import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider } from "@/contexts/UserContext";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import Explore from "./pages/Explore.tsx";
import Profile from "./pages/Profile.tsx";
import IngredientAnalysis from "./pages/IngredientAnalysis.tsx";
import AnalysisHistory from "./pages/AnalysisHistory.tsx";
import ShareEntry from "./pages/ShareEntry.tsx";
import HowToShare from "./pages/HowToShare.tsx";
import Compare from "./pages/Compare.tsx";
import Community from "./pages/Community.tsx";
import NotFound from "./pages/NotFound.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import Routine from "./pages/Routine.tsx";
import Diary from "./pages/Diary.tsx";
import ScanHub from "./pages/ScanHub.tsx";
import ScanAnalysis from "./pages/ScanAnalysis.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <UserProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/recommendations" element={<Navigate to="/explore" replace />} />
              <Route path="/analyze" element={<IngredientAnalysis />} />
              <Route path="/history" element={<AnalysisHistory />} />
              <Route path="/price-alerts" element={<Navigate to="/history" replace />} />
              <Route path="/share" element={<ShareEntry />} />
              <Route path="/how-to-share" element={<HowToShare />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/community" element={<Community />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/routine" element={<Routine />} />
              <Route path="/diary" element={<Diary />} />
              <Route path="/scan" element={<ScanHub />} />
              <Route path="/scan-ocr" element={<ScanAnalysis />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </UserProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
