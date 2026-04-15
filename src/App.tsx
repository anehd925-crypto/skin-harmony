import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider } from "@/contexts/UserContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import SkinSolution from "./pages/SkinSolution.tsx";
import BlacklistPage from "./pages/BlacklistPage.tsx";
import SkinTimeline from "./pages/SkinTimeline.tsx";
import MyCabinet from "./pages/MyCabinet.tsx";
import MySkin from "./pages/MySkin.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분 캐시
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <UserProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* 공개 라우트 */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/how-to-share" element={<HowToShare />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/recommendations" element={<Navigate to="/explore" replace />} />
                <Route path="/price-alerts" element={<Navigate to="/history" replace />} />

                {/* 인증 필요 라우트 */}
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                <Route path="/analyze" element={<ProtectedRoute><IngredientAnalysis /></ProtectedRoute>} />
                <Route path="/scan" element={<ProtectedRoute><ScanHub /></ProtectedRoute>} />
                <Route path="/scan-ocr" element={<ProtectedRoute><ScanAnalysis /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute><AnalysisHistory /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/routine" element={<ProtectedRoute><Routine /></ProtectedRoute>} />
                <Route path="/diary" element={<ProtectedRoute><Diary /></ProtectedRoute>} />
                <Route path="/skin-solution" element={<ProtectedRoute><SkinSolution /></ProtectedRoute>} />
                <Route path="/blacklist" element={<ProtectedRoute><BlacklistPage /></ProtectedRoute>} />
                <Route path="/timeline" element={<ProtectedRoute><SkinTimeline /></ProtectedRoute>} />
                <Route path="/cabinet" element={<ProtectedRoute><MyCabinet /></ProtectedRoute>} />
                <Route path="/myskin" element={<ProtectedRoute><MySkin /></ProtectedRoute>} />
                <Route path="/compare" element={<ProtectedRoute><Compare /></ProtectedRoute>} />
                <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </UserProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
