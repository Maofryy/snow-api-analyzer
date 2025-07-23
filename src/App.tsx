import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { logger } from "./utils/logger";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
        },
        mutations: {
            retry: 1,
        },
    },
});

// Global error handler for React Query
queryClient.setMutationDefaults([], {
    onError: (error) => {
        logger.error("React Query mutation error", "queryClient", undefined, error as Error);
    },
});

queryClient.setQueryDefaults([], {
    onError: (error) => {
        logger.error("React Query query error", "queryClient", undefined, error as Error);
    },
});

const App = () => (
    <ErrorBoundary
        onError={(error, errorInfo) => {
            logger.fatal("Application error boundary triggered", "app", { errorInfo }, error);
        }}
    >
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <Toaster />
                <Sonner />
                <HashRouter>
                    <ErrorBoundary>
                        <Routes>
                            <Route path="/" element={<Index />} />
                            <Route path="/api/x_elosa_api_benc_0/app/home" element={<Index />} />
                            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </ErrorBoundary>
                </HashRouter>
            </TooltipProvider>
        </QueryClientProvider>
    </ErrorBoundary>
);

export default App;
