import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider } from "@/contexts/UserContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import PageTransition from "@/components/PageTransition";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import Explore from "./pages/Explore.tsx";
import Profile from "./pages/Profile.tsx";
import IngredientAnalysis from "./pages/IngredientAnalysis.tsx";
import AnalysisHistory from "./pages/AnalysisHistory.tsx";
import HowToShare from "./pages/HowToShare.tsx";
import Compare from "./pages/Compare.tsx";
import Community from "./pages/Community.tsx";
import NotFound from "./pages/NotFound.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import Routine from "./pages/Routine.tsx";
import ScanHub from "./pages/ScanHub.tsx";
import ScanAnalysis from "./pages/ScanAnalysis.tsx";
import SkinSolution from "./pages/SkinSolution.tsx";
import BlacklistPage from "./pages/BlacklistPage.tsx";
import SkinTimeline from "./pages/SkinTimeline.tsx";
import MyCabinet from "./pages/MyCabinet.tsx";
import MySkin from "./pages/MySkin.tsx";
import ProductCompare from "./pages/ProductCompare.tsx";
import SkinTest from "./pages/SkinTest.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분 캐시
      retry: 1,
    },
  },
});

const P = ({ children }: { children: React.ReactNode }) => <PageTransition>{children}</PageTransition>;

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
                {/* 공개 라우트 */}
                <Route path="/auth" element={<P><Auth /></P>} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/how-to-share" element={<HowToShare />} />
                <Route path="/explore" element={<P><Explore /></P>} />
                <Route path="/product/:id" element={<P><ProductDetail /></P>} />
                <Route path="/recommendations" element={<Navigate to="/explore" replace />} />
                <Route path="/price-alerts" element={<Navigate to="/history" replace />} />

                {/* 인증 필요 라우트 */}
                <Route path="/" element={<ProtectedRoute><P><Index /></P></ProtectedRoute>} />
                <Route path="/onboarding" element={<ProtectedRoute><P><Onboarding /></P></ProtectedRoute>} />
                <Route path="/analyze" element={<ProtectedRoute><P><IngredientAnalysis /></P></ProtectedRoute>} />
                <Route path="/scan" element={<ProtectedRoute><P><ScanHub /></P></ProtectedRoute>} />
                <Route path="/scan-ocr" element={<ProtectedRoute><P><ScanAnalysis /></P></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute><P><AnalysisHistory /></P></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><P><Profile /></P></ProtectedRoute>} />
                <Route path="/routine" element={<ProtectedRoute><P><Routine /></P></ProtectedRoute>} />
                <Route path="/diary" element={<Navigate to="/myskin" replace />} />
                <Route path="/skin-solution" element={<ProtectedRoute><P><SkinSolution /></P></ProtectedRoute>} />
                <Route path="/blacklist" element={<ProtectedRoute><P><BlacklistPage /></P></ProtectedRoute>} />
                <Route path="/timeline" element={<ProtectedRoute><P><SkinTimeline /></P></ProtectedRoute>} />
                <Route path="/cabinet" element={<ProtectedRoute><P><MyCabinet /></P></ProtectedRoute>} />
                <Route path="/myskin" element={<ProtectedRoute><P><MySkin /></P></ProtectedRoute>} />
                <Route path="/compare" element={<ProtectedRoute><P><Compare /></P></ProtectedRoute>} />
                <Route path="/compare-ai" element={<ProtectedRoute><P><ProductCompare /></P></ProtectedRoute>} />
                <Route path="/skin-test" element={<ProtectedRoute><P><SkinTest /></P></ProtectedRoute>} />
                <Route path="/community" element={<ProtectedRoute><P><Community /></P></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <UserProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AnimatedRoutes />
            </BrowserRouter>
          </UserProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
