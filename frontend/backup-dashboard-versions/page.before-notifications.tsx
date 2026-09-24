"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Activity,
  BarChart3,
  Bell,
  BrainCircuit,
  Check,
  ChevronDown,
  Clock,
  ChevronRight,
  CircleDollarSign,
  HeartCrack,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Network,
  Receipt,
  RefreshCw,
  Search,
  ShoppingBasket,
  Sparkles,
  Target,
  TrendingUp,
  Trash2,
  Upload,
  User,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { NeonParticlesCanvas } from "@/components/canvas/NeonParticles";

import ForecastSummaryCards from "@/components/forecast/ForecastSummaryCards";
import ForecastTrendCards from "@/components/forecast/ForecastTrendCards";
import RevenueForecastChart from "@/components/forecast/RevenueForecastChart";
import ModelComparisonCard from "@/components/forecast/ModelComparisonCard";
import BusinessInsightsPanel from "@/components/forecast/BusinessInsightsPanel";
import AIRecommendations from "@/components/forecast/AIRecommendations";
import RiskAlerts from "@/components/forecast/RiskAlerts";
import ForecastTable from "@/components/forecast/ForecastTable";
import ForecastExplainability from "@/components/forecast/ForecastExplainability";
import DatasetQualityPanel, {
  type DatasetQuality,
  type DatasetInfo,
} from "@/components/dataset/DatasetQualityPanel";

import type {
  BusinessInsights,
  ForecastExplanation,
  ForecastPoint as SharedForecastPoint,
  ModelComparison,
} from "@/types/forecast";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5001";

const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;

type DashboardTab =
  | "overview"
  | "segmentation"
  | "churn"
  | "clv"
  | "basket"
  | "recommendations"
  | "forecasting";

type SidebarItem = {
  id: DashboardTab;
  label: string;
  icon: LucideIcon;
};

type AuthUser = {
  id: string | number;
  name: string;
  email: string;
  role?: string;
};

type SessionResponse = {
  success?: boolean;
  authenticated?: boolean;
  user?: AuthUser;
  message?: string;
};

type DashboardSummary = {
  totalCustomers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  averageCustomerValue: number;
  churnRate: number;
  highRiskCustomers: number;
};

type DashboardSummaryResponse = {
  success?: boolean;
  data?: DashboardSummary;
  message?: string;
};

type RevenueData = {
  month: string;
  monthNumber: number;
  period: string;
  revenue: number;
  orders: number;
};

type RevenueBestMonth = {
  month: string;
  period: string;
  revenue: number;
  orders: number;
};

type RevenueSummary = {
  totalRevenue: number;
  totalOrders: number;
  activeMonths: number;
  averageMonthlyRevenue: number;
  averageActiveMonthRevenue: number;
  bestMonth: RevenueBestMonth | null;
};

type RevenueResponse = {
  success?: boolean;
  year?: number;
  availableYears?: number[];
  summary?: RevenueSummary;
  data?: RevenueData[];
  message?: string;
};

type ProductPerformance = {
  productId: string;
  name: string;
  category: string;
  quantitySold: number;
  orderCount: number;
  revenue: number;
  averageSellingPrice: number;
  revenueShare: number;
};

type ProductPerformanceSummary = {
  totalProducts: number;
  totalRevenue: number;
  topProduct: ProductPerformance | null;
};

type ProductPerformanceResponse = {
  success?: boolean;
  summary?: ProductPerformanceSummary;
  data?: ProductPerformance[];
  message?: string;
};

type OrderCustomer = {
  id: string;
  customerId: string;
  name: string;
  email: string;
};

type RecentOrder = {
  id: string;
  orderId: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  itemCount: number;
  customer: OrderCustomer | null;
};

type RecentOrdersResponse = {
  success?: boolean;
  count?: number;
  data?: RecentOrder[];
  message?: string;
};

type CustomerSegmentDistribution = {
  segment: string;
  count: number;
  percentage: number;
};

type CustomerDistributionResponse = {
  success?: boolean;
  total?: number;
  data?: CustomerSegmentDistribution[];
  message?: string;
};

type DashboardActivity = {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
};

type ActivityResponse = {
  success?: boolean;
  count?: number;
  data?: DashboardActivity[];
  message?: string;
};


type Notification = {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  read: boolean;
  relatedDate?: string | null;
  relatedMetric?: string | null;
  createdAt: string;
  updatedAt: string;
};

type NotificationsResponse = {
  success?: boolean;
  data?: {
    notifications?: Notification[];
    unreadCount?: number;
  };
  message?: string;
};


type DatasetUploadResponse = {
  success?: boolean;
  message?: string;
  dataset?: {
    id: string;
    name: string;
    status: string;
    rows: number;
    customers: number;
    products: number;
    orders: number;
    orderItems: number;
  };
};

type DatasetValidateResponse = {
  success?: boolean;
  message?: string;
  quality?: DatasetQuality;
  dataset?: DatasetInfo;
};

type SegmentationRunResponse = {
  success?: boolean;
  message?: string;
  data?: {
    algorithm?: string;
    customerCount?: number;
    clusterCount?: number;
    features?: string[];
  };
};

type ChurnCustomer = {
  id?: string | number;
  customerId?: string;
  name?: string;
  email?: string;
  churnProbability?: number;
  probability?: number;
  riskScore?: number;
  prediction?: string | number | boolean;
  riskLevel?: string;
  segment?: string;
};

type ChurnData = {
  totalCustomers?: number;
  evaluatedCustomers?: number;
  churnRate?: number;
  predictedChurnRate?: number;
  highRiskCustomers?: number;
  mediumRiskCustomers?: number;
  lowRiskCustomers?: number;
  algorithm?: string;
  model?: string;
  accuracy?: number;
  features?: string[];
  customers?: ChurnCustomer[];
  predictions?: ChurnCustomer[];
};

type ChurnResponse = {
  success?: boolean;
  message?: string;
  data?: ChurnData | ChurnCustomer[];
  summary?: ChurnData;
  customers?: ChurnCustomer[];
  predictions?: ChurnCustomer[];
};

type CLVCustomer = {
  id?: string | number; customerId?: string; name?: string; email?: string;
  predictedValue?: number; predictedCLV?: number; clv?: number; lifetimeValue?: number;
  confidenceScore?: number; confidence?: number; segment?: string;
};
type CLVData = {
  customerCount?: number; totalPredictedValue?: number; averagePredictedValue?: number;
  medianPredictedValue?: number; averageConfidenceScore?: number; highValueCustomers?: number;
  aboveAverageCustomers?: number; highestValueCustomer?: CLVCustomer | null;
  modelVersion?: string; predictionDate?: string; customers?: CLVCustomer[];
};
type CLVResponse = {
  success?: boolean; message?: string; data?: CLVData | CLVCustomer[];
  summary?: CLVData; customers?: CLVCustomer[];
};

const sidebarItems: SidebarItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "segmentation", label: "Customer Segmentation", icon: Users },
  { id: "churn", label: "Churn Prediction", icon: HeartCrack },
  { id: "clv", label: "Customer Lifetime Value", icon: TrendingUp },
  { id: "basket", label: "Market Basket", icon: ShoppingBasket },
  { id: "recommendations", label: "Recommendations", icon: Target },
  { id: "forecasting", label: "Sales Forecasting", icon: BarChart3 },
];

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [recommendationData, setRecommendationData] =
    useState<RecommendationData | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] =
    useState(false);
  const [runningRecommendations, setRunningRecommendations] =
    useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");
  const [recommendationsMessage, setRecommendationsMessage] = useState("");
  const [dashboardProducts, setDashboardProducts] = useState<
    ProductPerformance[]
  >([]);
  const [dashboardProductSummary, setDashboardProductSummary] =
    useState<ProductPerformanceSummary | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationActionId, setNotificationActionId] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState("");

  const verifySession = useCallback(async () => {
    try {
      setCheckingSession(true);
      setSessionError("");

      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (isAuthenticationFailure(response)) {
        setUser(null);
        router.replace("/auth");
        return;
      }

      const data = await readJsonResponse<SessionResponse>(response);

      if (!response.ok) {
        throw new Error(
          data?.message || `Session verification failed (${response.status})`
        );
      }

      if (!data?.user) {
        setUser(null);
        router.replace("/auth");
        return;
      }

      setUser(data.user);
    } catch (error) {
      console.error("Session verification error:", error);
      setSessionError(
        error instanceof Error
          ? error.message
          : "Unable to verify your session."
      );
    } finally {
      setCheckingSession(false);
    }
  }, [router]);

  useEffect(() => {
    void verifySession();
  }, [verifySession]);

  const handleSessionExpired = useCallback(() => {
    setUser(null);
    router.replace("/auth");
    router.refresh();
  }, [router]);

  const loadNotifications = useCallback(async () => {
    try {
      setLoadingNotifications(true);
      setNotificationError("");

      const response = await fetch(`${API_URL}/api/notifications?limit=20`, createGetRequest());

      if (isAuthenticationFailure(response)) {
        handleSessionExpired();
        return;
      }

      const result = await readJsonResponse<NotificationsResponse>(response);
      assertSuccessfulResponse(response, result?.message, "notifications");

      const items = Array.isArray(result?.data?.notifications) ? result.data.notifications : [];
      setNotifications(items);
      setUnreadNotificationCount(
        typeof result?.data?.unreadCount === "number"
          ? result.data.unreadCount
          : items.filter((item) => !item.read).length
      );
    } catch (error) {
      console.error("Notification loading error:", error);
      setNotificationError(
        error instanceof Error ? error.message : "Unable to load notifications."
      );
    } finally {
      setLoadingNotifications(false);
    }
  }, [handleSessionExpired]);

  const markNotificationRead = useCallback(async (id: string) => {
    try {
      setNotificationActionId(id);
      const response = await fetch(`${API_URL}/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "PATCH",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (isAuthenticationFailure(response)) {
        handleSessionExpired();
        return;
      }

      const result = await readJsonResponse<{
        success?: boolean;
        data?: Notification;
        message?: string;
      }>(response);
      assertSuccessfulResponse(response, result?.message, "notification");

      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, ...(result?.data ?? {}), read: true } : item
        )
      );
      setUnreadNotificationCount((count) => Math.max(0, count - 1));
    } catch (error) {
      console.error("Mark notification read error:", error);
    } finally {
      setNotificationActionId(null);
    }
  }, [handleSessionExpired]);

  const markAllNotificationsRead = useCallback(async () => {
    if (unreadNotificationCount === 0) return;

    try {
      setNotificationActionId("all");
      const response = await fetch(`${API_URL}/api/notifications/read-all`, {
        method: "PATCH",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (isAuthenticationFailure(response)) {
        handleSessionExpired();
        return;
      }

      const result = await readJsonResponse<{
        success?: boolean;
        data?: { updatedCount?: number };
        message?: string;
      }>(response);
      assertSuccessfulResponse(response, result?.message, "notifications");

      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      setUnreadNotificationCount(0);
    } catch (error) {
      console.error("Mark all notifications read error:", error);
    } finally {
      setNotificationActionId(null);
    }
  }, [handleSessionExpired, unreadNotificationCount]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      setNotificationActionId(id);
      const response = await fetch(`${API_URL}/api/notifications/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (isAuthenticationFailure(response)) {
        handleSessionExpired();
        return;
      }

      const result = await readJsonResponse<{
        success?: boolean;
        data?: { id?: string; deleted?: boolean };
        message?: string;
      }>(response);
      assertSuccessfulResponse(response, result?.message, "notification");

      const deleted = notifications.find((item) => item.id === id);
      setNotifications((current) => current.filter((item) => item.id !== id));
      if (deleted && !deleted.read) {
        setUnreadNotificationCount((count) => Math.max(0, count - 1));
      }
    } catch (error) {
      console.error("Delete notification error:", error);
    } finally {
      setNotificationActionId(null);
    }
  }, [handleSessionExpired, notifications]);

  useEffect(() => {
    if (user) {
      void loadNotifications();
    }
  }, [user, loadNotifications]);

  async function handleLogout() {
    try {
      setLoggingOut(true);

      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setLoggingOut(false);
      router.replace("/auth");
      router.refresh();
    }
  }

  const loadDashboardProducts = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/dashboard/products`,
        createGetRequest()
      );

      if (isAuthenticationFailure(response)) {
        handleSessionExpired();
        return;
      }

      const result = await readJsonResponse<ProductPerformanceResponse>(
        response
      );

      assertSuccessfulResponse(response, result?.message, "products");

      setDashboardProducts(result?.data ?? []);
      setDashboardProductSummary(result?.summary ?? null);
    } catch (error) {
      console.error("Product loading error:", error);
    }
  }, [handleSessionExpired]);

  useEffect(() => {
    if (user) {
      void loadDashboardProducts();
    }
  }, [user, loadDashboardProducts]);

  const loadRecommendations = useCallback(async () => {
    try {
      setLoadingRecommendations(true);
      setRecommendationsError("");

      const response = await fetch(
        `${API_URL}/api/dashboard/recommendations`,
        createGetRequest()
      );

      if (isAuthenticationFailure(response)) {
        handleSessionExpired();
        return;
      }

      const result = await readJsonResponse<{
        success?: boolean;
        data?: RecommendationData;
        message?: string;
      }>(response);

      console.log("RAW FORECAST RESULT:", result);
      console.log("RAW FORECAST DATA:", result?.data);

      assertSuccessfulResponse(response, result?.message, "recommendations");

      setRecommendationData(result?.data ?? null);
    } catch (error) {
      console.error("Recommendation loading error:", error);
      setRecommendationsError(
        error instanceof Error
          ? error.message
          : "Unable to load recommendations."
      );
    } finally {
      setLoadingRecommendations(false);
    }
  }, [handleSessionExpired]);

  useEffect(() => {
    if (activeTab === "recommendations") {
      void loadRecommendations();
    }
  }, [activeTab, loadRecommendations]);

  async function runRecommendations() {
    try {
      setRunningRecommendations(true);
      setRecommendationsError("");
      setRecommendationsMessage("");

      const response = await fetch(
        `${API_URL}/api/analytics/recommendations/run`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      if (isAuthenticationFailure(response)) {
        handleSessionExpired();
        return;
      }

      const result = await readJsonResponse<{
        success?: boolean;
        message?: string;
      }>(response);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message || `Unable to run recommendations (${response.status})`
        );
      }

      setRecommendationsMessage(
        result?.message || "Recommendations generated successfully."
      );
      await loadRecommendations();
    } catch (error) {
      console.error("Recommendation generation error:", error);
      setRecommendationsError(
        error instanceof Error
          ? error.message
          : "Unable to generate recommendations."
      );
    } finally {
      setRunningRecommendations(false);
    }
  }

  if (checkingSession) {
    return <DashboardLoadingScreen />;
  }

  if (sessionError && !user) {
    return (
      <SessionErrorScreen
        message={sessionError}
        onRetry={() => void verifySession()}
        onLogin={() => router.replace("/auth")}
      />
    );
  }

  if (!user) {
    return <DashboardLoadingScreen />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-30">
        <NeonParticlesCanvas />
      </div>

      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
        <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[150px]" />
        <div className="absolute -right-40 top-[40%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[150px]" />
      </div>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[285px] border-r border-white/10 bg-[#070b18]/95 p-5 backdrop-blur-2xl transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10">
              <BrainCircuit className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <p className="font-semibold">E-Commerce AI</p>
              <p className="text-xs text-gray-500">Customer Intelligence</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="text-gray-500 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-9 space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                  active
                    ? "border border-violet-500/20 bg-violet-500/10 text-violet-300"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="h-4 w-4" />}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-5 left-5 right-5">
          <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="mt-1 truncate text-xs text-gray-500">{user.email}</p>
          </div>

          <button
            type="button"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-60"
          >
            {loggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      <div className="relative z-10 min-h-screen lg:pl-[285px]">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-white/10 bg-[#050816]/80 px-5 backdrop-blur-2xl md:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div>
              <p className="text-xs text-gray-500">Dashboard</p>
              <h1 className="font-semibold">{getPageTitle(activeTab)}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
              <input
                type="text"
                disabled
                placeholder="Search coming soon..."
                title="Search isn't available yet"
                className="h-10 w-56 cursor-not-allowed rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-gray-500 outline-none placeholder:text-gray-600"
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                aria-label={`Notifications${unreadNotificationCount > 0 ? `, ${unreadNotificationCount} unread` : ""}`}
                aria-expanded={notificationsOpen}
                title="Notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-white"
              >
                <Bell className="h-5 w-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full border-2 border-[#050816] bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <NotificationDropdown
                  notifications={notifications}
                  unreadCount={unreadNotificationCount}
                  loading={loadingNotifications}
                  error={notificationError}
                  actionId={notificationActionId}
                  onRefresh={() => void loadNotifications()}
                  onMarkRead={(id) => void markNotificationRead(id)}
                  onMarkAllRead={() => void markAllNotificationsRead()}
                  onDelete={(id) => void deleteNotification(id)}
                />
              )}
            </div>

            <div
              title={`${user.name} (${user.email})`}
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-sm font-semibold text-violet-300 sm:flex"
            >
              {getUserInitials(user.name)}
            </div>
          </div>
        </header>

        <div className="p-5 md:p-8">
          {activeTab === "overview" ? (
  <Overview
    user={user}
    onSessionExpired={handleSessionExpired}
    products={dashboardProducts}
    productSummary={dashboardProductSummary}
    onProductsChanged={() => void loadDashboardProducts()}
  />
) : activeTab === "segmentation" ? (
  <SegmentationModule
    onSessionExpired={handleSessionExpired}
  />
) : activeTab === "churn" ? (
  <ChurnPredictionModule
    onSessionExpired={handleSessionExpired}
  />
) : activeTab === "clv" ? (
  <CLVPredictionModule
    onSessionExpired={handleSessionExpired}
  />
) : activeTab === "basket" ? (
  <MarketBasketModule
    onSessionExpired={handleSessionExpired}
    products={dashboardProducts}
  />
) : activeTab === "recommendations" ? (
  <RecommendationModule
    data={recommendationData}
    loading={loadingRecommendations}
    running={runningRecommendations}
    error={recommendationsError}
    message={recommendationsMessage}
    onRun={() => void runRecommendations()}
  />
) : (
  <ForecastingModule onSessionExpired={handleSessionExpired} />
)}
        </div>
      </div>
    </main>
  );
}

function Overview({
  user,
  onSessionExpired,
  products,
  productSummary,
  onProductsChanged,
}: {
  user: AuthUser;
  onSessionExpired: () => void;
  products: ProductPerformance[];
  productSummary: ProductPerformanceSummary | null;
  onProductsChanged: () => void;
}) {
  const firstName = user.name?.trim().split(/\s+/)[0] || "User";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [revenueSummary, setRevenueSummary] =
    useState<RevenueSummary | null>(null);
  const [revenueYear, setRevenueYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [customerSegments, setCustomerSegments] =
    useState<CustomerSegmentDistribution[]>([]);
  const [totalSegmentedCustomers, setTotalSegmentedCustomers] = useState(0);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);

  const dominantSegment = useMemo(() => {
    if (customerSegments.length === 0) return null;
    return customerSegments.reduce((largest, segment) =>
      segment.percentage > largest.percentage ? segment : largest
    );
  }, [customerSegments]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<DatasetValidateResponse | null>(null);
  const [validationError, setValidationError] = useState("");

  const loadDashboard = useCallback(
    async (year?: number) => {
      try {
        setLoading(true);
        setError("");

        const revenueUrl = year
          ? `${API_URL}/api/dashboard/revenue?year=${encodeURIComponent(
              String(year)
            )}`
          : `${API_URL}/api/dashboard/revenue`;

        const [
          summaryResponse,
          revenueResponse,
          ordersResponse,
          distributionResponse,
          activityResponse,
        ] = await Promise.all([
          fetch(`${API_URL}/api/dashboard/summary`, createGetRequest()),
          fetch(revenueUrl, createGetRequest()),
          fetch(
            `${API_URL}/api/dashboard/orders?limit=10`,
            createGetRequest()
          ),
          fetch(
            `${API_URL}/api/dashboard/customer-distribution`,
            createGetRequest()
          ),
          fetch(`${API_URL}/api/dashboard/activity`, createGetRequest()),
        ]);

        const responses = [
          summaryResponse,
          revenueResponse,
          ordersResponse,
          distributionResponse,
          activityResponse,
        ];

        if (responses.some(isAuthenticationFailure)) {
          onSessionExpired();
          return;
        }

        const [
          summaryResult,
          revenueResult,
          ordersResult,
          distributionResult,
          activityResult,
        ] = await Promise.all([
          readJsonResponse<DashboardSummaryResponse>(summaryResponse),
          readJsonResponse<RevenueResponse>(revenueResponse),
          readJsonResponse<RecentOrdersResponse>(ordersResponse),
          readJsonResponse<CustomerDistributionResponse>(distributionResponse),
          readJsonResponse<ActivityResponse>(activityResponse),
        ]);

        assertSuccessfulResponse(
          summaryResponse,
          summaryResult?.message,
          "dashboard summary"
        );
        assertSuccessfulResponse(
          revenueResponse,
          revenueResult?.message,
          "revenue analytics"
        );
        assertSuccessfulResponse(
          ordersResponse,
          ordersResult?.message,
          "recent orders"
        );
        assertSuccessfulResponse(
          distributionResponse,
          distributionResult?.message,
          "customer distribution"
        );
        assertSuccessfulResponse(
          activityResponse,
          activityResult?.message,
          "recent activity"
        );

        if (!summaryResult?.data) {
          throw new Error("Dashboard summary returned no data.");
        }

        setSummary(normalizeSummary(summaryResult.data));

        setRevenueData(
          Array.isArray(revenueResult?.data)
            ? revenueResult.data.map((item, index) => ({
                month: String(item.month ?? ""),
                monthNumber: toSafeNumber(item.monthNumber) || index + 1,
                period: String(item.period ?? ""),
                revenue: toSafeNumber(item.revenue),
                orders: toSafeNumber(item.orders),
              }))
            : []
        );

        setRevenueSummary(revenueResult?.summary ?? null);
        setRevenueYear(
          typeof revenueResult?.year === "number" ? revenueResult.year : null
        );
        setAvailableYears(
          Array.isArray(revenueResult?.availableYears)
            ? revenueResult.availableYears.filter(
                (item): item is number => Number.isInteger(item)
              )
            : []
        );

        setRecentOrders(
          Array.isArray(ordersResult?.data) ? ordersResult.data : []
        );

        setCustomerSegments(
          Array.isArray(distributionResult?.data)
            ? distributionResult.data
            : []
        );
        setTotalSegmentedCustomers(toSafeNumber(distributionResult?.total));

        setActivities(
          Array.isArray(activityResult?.data) ? activityResult.data : []
        );
      } catch (loadError) {
        console.error("Dashboard loading error:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load dashboard."
        );
      } finally {
        setLoading(false);
      }
    },
    [onSessionExpired]
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  function resetFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileSelection(file: File | null) {
    setUploadMessage("");
    setUploadSuccess(false);
    setValidationResult(null);
    setValidationError("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setSelectedFile(null);
      setUploadMessage("Only CSV files are supported.");
      resetFileInput();
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      setSelectedFile(null);
      setUploadMessage("CSV file must be smaller than 20 MB.");
      resetFileInput();
      return;
    }

    setSelectedFile(file);
  }

  async function handleValidateDataset() {
    if (!selectedFile) {
      setValidationResult(null);
      setValidationError("Please select a CSV file.");
      return;
    }

    try {
      setValidating(true);
      setValidationError("");
      setUploadMessage("");
      setUploadSuccess(false);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", selectedFile.name);

      const response = await fetch(`${API_URL}/api/datasets/validate`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
        body: formData,
      });

      if (isAuthenticationFailure(response)) {
        onSessionExpired();
        return;
      }

      const result = await readJsonResponse<DatasetValidateResponse>(
        response
      );

      if (!response.ok || !result?.success || !result.quality) {
        throw new Error(
          result?.message || `Dataset validation failed (${response.status})`
        );
      }

      setValidationResult(result);
    } catch (validateError) {
      console.error("Dataset validation error:", validateError);
      setValidationResult(null);
      setValidationError(
        validateError instanceof Error
          ? validateError.message
          : "Unable to validate dataset."
      );
    } finally {
      setValidating(false);
    }
  }

  async function handleDatasetUpload() {
    if (!selectedFile) {
      setUploadSuccess(false);
      setUploadMessage("Please select a CSV file.");
      return;
    }

    try {
      setUploading(true);
      setUploadMessage("");
      setUploadSuccess(false);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", selectedFile.name);

      const response = await fetch(`${API_URL}/api/datasets/upload`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
        body: formData,
      });

      if (isAuthenticationFailure(response)) {
        onSessionExpired();
        return;
      }

      const result = await readJsonResponse<DatasetUploadResponse>(response);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message || `Dataset upload failed (${response.status})`
        );
      }

      setUploadSuccess(true);
      setUploadMessage(
        result.message ||
          `Dataset imported successfully${
            result.dataset ? ` — ${result.dataset.rows} rows processed.` : "."
          }`
      );
      setSelectedFile(null);
      setValidationResult(null);
      setValidationError("");
      resetFileInput();
      await loadDashboard(revenueYear ?? undefined);
      onProductsChanged();
    } catch (uploadError) {
      console.error("Dataset upload error:", uploadError);
      setUploadSuccess(false);
      setUploadMessage(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload dataset."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-violet-400">
            <Sparkles className="h-4 w-4" />
            AI Intelligence Overview
          </div>

          <h2 className="text-3xl font-semibold md:text-4xl">
            Welcome back, {firstName}.
          </h2>

          <p className="mt-2 text-gray-400">
            Live e-commerce intelligence powered by PostgreSQL analytics.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => void loadDashboard(revenueYear ?? undefined)}
          disabled={loading}
          className="gap-2 bg-violet-600 text-white hover:bg-violet-500"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Analytics
        </Button>
      </div>

      {error && (
        <div className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-300">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadDashboard(revenueYear ?? undefined)}
            className="shrink-0 font-medium text-red-200 hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mt-8">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Primary Business KPIs
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Total Revenue"
            value={loading ? "..." : formatIndianCurrency(summary?.totalRevenue ?? 0)}
            badge="Live"
            status="positive"
            icon={CircleDollarSign}
          />
          <KpiCard
            title="Orders"
            value={loading ? "..." : formatNumber(summary?.totalOrders ?? 0)}
            badge="Live"
            status="positive"
            icon={BarChart3}
          />
          <KpiCard
            title="Customers"
            value={loading ? "..." : formatNumber(summary?.totalCustomers ?? 0)}
            badge="Live"
            status="positive"
            icon={Users}
          />
          <KpiCard
            title="Avg. Order Value"
            value={
              loading
                ? "..."
                : formatIndianCurrency(summary?.averageOrderValue ?? 0)
            }
            badge="Calculated"
            status="neutral"
            icon={TrendingUp}
          />
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Business Health
        </h3>
        <div className="grid gap-5 lg:grid-cols-2">
          <DashboardCard>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-500/10 p-3">
                <HeartCrack className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold">Customer Health</h3>
                <p className="text-xs text-gray-500">
                  Churn risk &amp; segmentation snapshot
                </p>
              </div>
            </div>

            {loading ? (
              <SectionLoading text="Loading customer health..." />
            ) : (
              <div className="mt-7 space-y-5">
                <InfoRow
                  label="Churn Rate"
                  value={`${toPercentage(summary?.churnRate).toFixed(2)}%`}
                />
                <InfoRow
                  label="High Risk Customers"
                  value={formatNumber(summary?.highRiskCustomers ?? 0)}
                />
                <InfoRow
                  label="Segmentation"
                  value={
                    customerSegments.length === 0 || totalSegmentedCustomers === 0
                      ? "Not run yet"
                      : `${dominantSegment?.segment ?? customerSegments[0].segment} · ${toPercentage(
                          dominantSegment?.percentage ?? customerSegments[0].percentage
                        ).toFixed(1)}%`
                  }
                />
              </div>
            )}
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-500/10 p-3">
                <Target className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold">Top Product</h3>
                <p className="text-xs text-gray-500">
                  Highest revenue-attributed product
                </p>
              </div>
            </div>

            {loading ? (
              <SectionLoading text="Loading product performance..." />
            ) : !productSummary?.topProduct ? (
              <EmptyState
                icon={ShoppingBasket}
                title="No product data"
                description="Import transaction data to surface a top product."
              />
            ) : (
              <div className="mt-7 space-y-5">
                <InfoRow
                  label="Product"
                  value={productSummary.topProduct.name}
                />
                <InfoRow
                  label="Revenue"
                  value={formatIndianCurrency(productSummary.topProduct.revenue)}
                />
                <InfoRow
                  label="Revenue Share"
                  value={`${toSafeNumber(
                    productSummary.topProduct.revenueShare
                  ).toFixed(2)}%`}
                />
              </div>
            )}
          </DashboardCard>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <DashboardCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Revenue Performance</h3>
              <p className="mt-1 text-xs text-gray-500">
                January–December revenue from completed orders
              </p>
            </div>

            <div className="flex items-center gap-3">
              {availableYears.length > 0 && (
                <select
                  value={revenueYear ?? ""}
                  disabled={loading}
                  onChange={(event) => {
                    const year = Number(event.target.value);
                    if (Number.isInteger(year)) {
                      void loadDashboard(year);
                    }
                  }}
                  className="h-9 rounded-lg border border-white/10 bg-[#090d1d] px-3 text-xs text-gray-300 outline-none"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs text-green-300">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                Database Connected
              </div>
            </div>
          </div>

          {loading ? (
            <SectionLoading text="Loading revenue analytics..." />
          ) : (
            <RevenueChart data={revenueData} year={revenueYear} />
          )}
        </DashboardCard>

        <DashboardCard>
          <h3 className="font-semibold">Business Summary</h3>
          <p className="mt-1 text-xs text-gray-500">
            Current transaction dataset
          </p>

          <div className="mt-7 space-y-5">
            <InfoRow
              label="Customers"
              value={formatNumber(summary?.totalCustomers ?? 0)}
            />
            <InfoRow
              label="Products"
              value={formatNumber(summary?.totalProducts ?? 0)}
            />
            <InfoRow
              label="Orders"
              value={formatNumber(summary?.totalOrders ?? 0)}
            />
            <InfoRow
              label="Revenue"
              value={formatIndianCurrency(summary?.totalRevenue ?? 0)}
            />
            <InfoRow
              label="Average Order"
              value={formatIndianCurrency(summary?.averageOrderValue ?? 0)}
            />
            <InfoRow
              label="Customer Value"
              value={formatIndianCurrency(summary?.averageCustomerValue ?? 0)}
            />
            {revenueYear && <InfoRow label="Chart Year" value={String(revenueYear)} />}
            {revenueSummary && (
              <>
                <InfoRow
                  label="Active Months"
                  value={String(revenueSummary.activeMonths)}
                />
                <InfoRow
                  label="Best Month"
                  value={revenueSummary.bestMonth?.month ?? "N/A"}
                />
              </>
            )}
          </div>
        </DashboardCard>
      </div>

      <div className="mt-6">
        <DashboardCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold">Product Performance</h3>
              <p className="mt-1 text-xs text-gray-500">
                Product-attributed sales performance
              </p>
            </div>

            <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-300">
              Product Revenue:{" "}
              {formatIndianCurrency(productSummary?.totalRevenue ?? 0)}
            </div>
          </div>

          {loading ? (
            <SectionLoading text="Loading product performance..." />
          ) : products.length === 0 ? (
            <EmptyState
              icon={ShoppingBasket}
              title="No product data"
              description="Import transaction data to view product performance."
            />
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="pb-4 font-medium">Product</th>
                    <th className="pb-4 font-medium">Category</th>
                    <th className="pb-4 text-right font-medium">Qty Sold</th>
                    <th className="pb-4 text-right font-medium">Orders</th>
                    <th className="pb-4 text-right font-medium">Avg. Price</th>
                    <th className="pb-4 text-right font-medium">Revenue</th>
                    <th className="pb-4 text-right font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.productId}
                      className="border-b border-white/5 transition hover:bg-white/[0.025]"
                    >
                      <td className="py-4 font-medium text-gray-200">
                        {product.name}
                      </td>
                      <td className="py-4 text-gray-400">
                        {product.category || "Uncategorized"}
                      </td>
                      <td className="py-4 text-right text-gray-300">
                        {formatNumber(product.quantitySold)}
                      </td>
                      <td className="py-4 text-right text-gray-300">
                        {formatNumber(product.orderCount)}
                      </td>
                      <td className="py-4 text-right text-gray-300">
                        {formatIndianCurrency(product.averageSellingPrice)}
                      </td>
                      <td className="py-4 text-right font-medium text-green-400">
                        {formatIndianCurrency(product.revenue)}
                      </td>
                      <td className="py-4 text-right text-violet-300">
                        {toSafeNumber(product.revenueShare).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardCard>
      </div>

      <div className="mt-6">
        <DashboardCard>
          <div>
            <h3 className="font-semibold">Recent Orders</h3>
            <p className="mt-1 text-xs text-gray-500">
              Latest customer transactions
            </p>
          </div>

          {loading ? (
            <SectionLoading text="Loading recent orders..." />
          ) : recentOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingBasket}
              title="No orders available"
              description="Orders will appear after importing transaction data."
            />
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="pb-4 font-medium">Order</th>
                    <th className="pb-4 font-medium">Customer</th>
                    <th className="pb-4 font-medium">Date</th>
                    <th className="pb-4 font-medium">Status</th>
                    <th className="pb-4 text-right font-medium">Items</th>
                    <th className="pb-4 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-white/5">
                      <td className="py-4 font-medium text-violet-300">
                        {order.orderId}
                      </td>
                      <td className="py-4">
                        <p className="text-gray-200">
                          {order.customer?.name ?? "Unknown Customer"}
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          {order.customer?.email ?? ""}
                        </p>
                      </td>
                      <td className="py-4 text-gray-400">
                        {formatDate(order.orderDate)}
                      </td>
                      <td className="py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-4 text-right text-gray-300">
                        {formatNumber(order.itemCount)}
                      </td>
                      <td className="py-4 text-right font-medium text-green-400">
                        {formatIndianCurrency(order.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardCard>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <DashboardCard>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-500/10 p-3">
              <Users className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold">Customer Segmentation</h3>
              <p className="text-xs text-gray-500">K-Means customer groups</p>
            </div>
          </div>

          {loading ? (
            <SectionLoading text="Loading customer segments..." />
          ) : customerSegments.length === 0 ||
            totalSegmentedCustomers === 0 ? (
            <EmptyState
              icon={Network}
              title="Segmentation not run yet"
              description="Customer data is ready. Open Customer Segmentation from the sidebar to run K-Means."
            />
          ) : (
            <div className="mt-6 space-y-4">
              {customerSegments.map((segment) => {
                const percentage = toPercentage(segment.percentage);

                return (
                  <div
                    key={segment.segment}
                    className="rounded-xl border border-white/5 bg-white/[0.025] p-4"
                  >
                    <div className="flex justify-between gap-4">
                      <div>
                        <span className="font-medium text-gray-200">
                          {segment.segment}
                        </span>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatNumber(segment.count)} customers
                        </p>
                      </div>
                      <span className="text-violet-300">
                        {percentage.toFixed(2)}%
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-3">
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold">Recent Activity</h3>
              <p className="text-xs text-gray-500">Latest platform events</p>
            </div>
          </div>

          {loading ? (
            <SectionLoading text="Loading activity..." />
          ) : activities.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No recent activity"
              description="Dataset imports and analytics events will appear here."
            />
          ) : (
            <div className="mt-6 space-y-3">
              {activities.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-xl border border-white/5 bg-white/[0.025] p-4"
                >
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10">
                    <ActivityTypeIcon type={item.type} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {item.description}
                    </p>
                    <p className="mt-2 text-[11px] text-gray-600">
                      {formatDateTime(item.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardCard>
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-violet-500/10 p-3">
              <Upload className="h-5 w-5 text-violet-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Import Dataset</h3>
              <p className="mt-1 text-xs text-gray-500">
                Upload a CSV dataset to refresh PostgreSQL analytics
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) =>
                  handleFileSelection(event.target.files?.[0] ?? null)
                }
              />

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading || validating}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choose CSV
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedFile || uploading || validating}
                  onClick={() => void handleValidateDataset()}
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  {validating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  {validating ? "Validating..." : "Validate CSV"}
                </Button>

                <Button
                  type="button"
                  disabled={!selectedFile || uploading || validating}
                  onClick={() => void handleDatasetUpload()}
                  className="bg-violet-600 text-white hover:bg-violet-500"
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  {uploading ? "Importing..." : "Import Dataset"}
                </Button>
              </div>

              {selectedFile && (
                <p className="mt-3 text-xs text-gray-400">
                  Selected: {selectedFile.name} ·{" "}
                  {formatFileSize(selectedFile.size)}
                </p>
              )}

              {validationError && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3 text-sm text-red-300">
                  {validationError}
                </div>
              )}

              {uploadMessage && (
                <div
                  className={`mt-4 rounded-xl border p-3 text-sm ${
                    uploadSuccess
                      ? "border-green-500/20 bg-green-500/[0.06] text-green-300"
                      : "border-red-500/20 bg-red-500/[0.06] text-red-300"
                  }`}
                >
                  {uploadMessage}
                </div>
              )}
            </div>
          </div>

          {validationResult?.quality && (
            <DatasetQualityPanel
              quality={validationResult.quality}
              dataset={validationResult.dataset}
              onImport={() => void handleDatasetUpload()}
              importing={uploading}
            />
          )}
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-green-500/10 p-3">
              <Activity className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold">Data Pipeline</h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                PostgreSQL transaction data powers the dashboard, while
                Express routes coordinate the FastAPI machine-learning
                services for customer intelligence and forecasting.
              </p>

              <div className="mt-6 flex items-center gap-2 rounded-xl border border-green-500/10 bg-green-500/[0.05] p-3 text-sm text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                Core data pipeline operational
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>
    </motion.div>
  );
}

function RevenueChart({
  data,
  year,
}: {
  data: RevenueData[];
  year: number | null;
}) {
  if (!data.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No revenue data available"
        description="Import an e-commerce dataset to populate the chart."
      />
    );
  }

  return (
    <div className="mt-8 h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 20, left: 5, bottom: 5 }}
        >
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="rgba(255,255,255,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            stroke="#6b7280"
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <YAxis
            stroke="#6b7280"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tickFormatter={formatCompactCurrency}
          />
          <Tooltip
            contentStyle={{
              background: "#090d1d",
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: "12px",
            }}
            formatter={(value, name) => {
              if (name === "revenue") {
                return [formatIndianCurrency(toSafeNumber(value)), "Revenue"];
              }
              return [formatNumber(toSafeNumber(value)), String(name)];
            }}
            labelFormatter={(label) =>
              year ? `${String(label)} ${year}` : String(label)
            }
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#8b5cf6"
            strokeWidth={3}
            fill="url(#revenueFill)"
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({
  title,
  value,
  badge,
  status,
  icon: Icon,
}: {
  title: string;
  value: string;
  badge: string;
  status: "positive" | "negative" | "neutral";
  icon: LucideIcon;
}) {
  const badgeClass =
    status === "positive"
      ? "border-green-500/20 bg-green-500/10 text-green-400"
      : status === "negative"
        ? "border-red-500/20 bg-red-500/10 text-red-400"
        : "border-violet-500/20 bg-violet-500/10 text-violet-300";

  return (
    <DashboardCard>
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
          <Icon className="h-5 w-5 text-violet-400" />
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] ${badgeClass}`}>
          {badge}
        </span>
      </div>
      <p className="mt-6 text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </DashboardCard>
  );
}

function NotificationDropdown({
  notifications,
  unreadCount,
  loading,
  error,
  actionId,
  onRefresh,
  onMarkRead,
  onMarkAllRead,
  onDelete,
}: {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string;
  actionId: string | null;
  onRefresh: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="absolute right-0 top-12 z-50 w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-white/10 bg-[#090d1d]/98 shadow-2xl shadow-black/40 backdrop-blur-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Notifications</h3>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "You're all caught up"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
            title="Refresh notifications"
            aria-label="Refresh notifications"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={actionId === "all"}
              className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-violet-300 transition hover:bg-violet-500/10 hover:text-violet-200 disabled:opacity-50"
            >
              {actionId === "all" ? "Updating..." : "Mark all read"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-3 mt-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="max-h-[min(70vh,520px)] overflow-y-auto p-2">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-xs text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Bell className="mx-auto h-7 w-7 text-gray-700" />
            <p className="mt-3 text-sm font-medium text-gray-300">No notifications</p>
            <p className="mt-1 text-xs text-gray-600">Forecast risks and recommendations will appear here.</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const busy = actionId === notification.id;
            return (
              <div
                key={notification.id}
                className={`group rounded-xl p-3 transition hover:bg-white/[0.04] ${
                  notification.read ? "" : "border border-violet-500/10 bg-violet-500/[0.035]"
                }`}
              >
                <div className="flex gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getNotificationPriorityClass(notification.priority)}`}>
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${notification.read ? "font-medium text-gray-300" : "font-semibold text-white"}`}>
                        {notification.title}
                      </p>
                      {!notification.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-400" aria-label="Unread" />}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{notification.message}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-[10px] text-gray-600">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(notification.createdAt)}
                      </span>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                        {!notification.read && (
                          <button
                            type="button"
                            onClick={() => onMarkRead(notification.id)}
                            disabled={busy}
                            className="rounded-md p-1.5 text-gray-500 hover:bg-white/5 hover:text-green-300 disabled:opacity-50"
                            title="Mark as read"
                            aria-label={`Mark ${notification.title} as read`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDelete(notification.id)}
                          disabled={busy}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-white/5 hover:text-red-300 disabled:opacity-50"
                          title="Delete notification"
                          aria-label={`Delete ${notification.title}`}
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function getNotificationPriorityClass(priority: string) {
  switch (priority.toLowerCase()) {
    case "critical":
    case "high":
      return "bg-red-500/10 text-red-400";
    case "medium":
      return "bg-amber-500/10 text-amber-400";
    default:
      return "bg-violet-500/10 text-violet-400";
  }
}

function DashboardCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_20px_70px_rgba(0,0,0,.2)] backdrop-blur-xl md:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4 last:border-0 last:pb-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-200">{value}</span>
    </div>
  );
}

function SectionLoading({ text }: { text: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-400" />
        <p className="mt-3 text-sm text-gray-500">{text}</p>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="mt-6 flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] p-6">
      <div className="max-w-sm text-center">
        <Icon className="mx-auto h-8 w-8 text-gray-600" />
        <p className="mt-4 font-medium text-gray-300">{title}</p>
        <p className="mt-2 text-xs leading-5 text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.trim().toLowerCase();

  const className =
    normalized === "completed"
      ? "border-green-500/20 bg-green-500/10 text-green-400"
      : normalized === "cancelled"
        ? "border-red-500/20 bg-red-500/10 text-red-400"
        : "border-yellow-500/20 bg-yellow-500/10 text-yellow-300";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs capitalize ${className}`}
    >
      {status || "unknown"}
    </span>
  );
}

function ActivityTypeIcon({ type }: { type: string }) {
  switch (type?.trim().toLowerCase()) {
    case "dataset":
      return <Upload className="h-4 w-4 text-violet-400" />;
    case "order":
      return <ShoppingBasket className="h-4 w-4 text-blue-400" />;
    case "segmentation":
      return <Users className="h-4 w-4 text-violet-400" />;
    case "churn":
      return <HeartCrack className="h-4 w-4 text-red-400" />;
    case "forecast":
      return <TrendingUp className="h-4 w-4 text-green-400" />;
    default:
      return <Activity className="h-4 w-4 text-gray-400" />;
  }
}

function SegmentationModule({
  onSessionExpired,
}: {
  onSessionExpired: () => void;
}) {
  const [segments, setSegments] = useState<CustomerSegmentDistribution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [runInfo, setRunInfo] = useState<SegmentationRunResponse["data"] | null>(null);

  const loadDistribution = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/dashboard/customer-distribution`,
        createGetRequest()
      );

      if (isAuthenticationFailure(response)) {
        onSessionExpired();
        return;
      }

      const result = await readJsonResponse<CustomerDistributionResponse>(response);
      assertSuccessfulResponse(
        response,
        result?.message,
        "customer segmentation results"
      );

      setSegments(Array.isArray(result?.data) ? result.data : []);
      setTotal(toSafeNumber(result?.total));
    } catch (loadError) {
      console.error("Segmentation loading error:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load customer segmentation."
      );
    } finally {
      setLoading(false);
    }
  }, [onSessionExpired]);

  useEffect(() => {
    void loadDistribution();
  }, [loadDistribution]);

  async function runSegmentation() {
    try {
      setRunning(true);
      setError("");
      setMessage("");
      setRunInfo(null);

      const response = await fetch(
        `${API_URL}/api/analytics/segmentation/run`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      if (isAuthenticationFailure(response)) {
        onSessionExpired();
        return;
      }

      const result = await readJsonResponse<SegmentationRunResponse>(response);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message || `Unable to run segmentation (${response.status})`
        );
      }

      setMessage(result.message || "Customer segmentation completed successfully.");
      setRunInfo(result.data ?? null);
      await loadDistribution();
    } catch (runError) {
      console.error("Segmentation execution error:", runError);
      setError(
        runError instanceof Error
          ? runError.message
          : "Unable to run customer segmentation."
      );
    } finally {
      setRunning(false);
    }
  }

  const hasResults = total > 0 && segments.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-violet-400">
            <BrainCircuit className="h-4 w-4" />
            Machine Learning Analytics
          </div>
          <h2 className="text-3xl font-semibold md:text-4xl">
            Customer Segmentation
          </h2>
          <p className="mt-2 max-w-3xl text-gray-400">
            Run K-Means over customer RFM-style behavioral features and persist
            the resulting customer groups through the analytics pipeline.
          </p>
        </div>

        <Button
          type="button"
          disabled={running || loading}
          onClick={() => void runSegmentation()}
          className="gap-2 bg-violet-600 text-white hover:bg-violet-500"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : hasResults ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {running
            ? "Running K-Means..."
            : hasResults
              ? "Re-run Segmentation"
              : "Run Segmentation"}
        </Button>
      </div>

      {error && (
        <div className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-300">
          <span>{error}</span>
          <button
            type="button"
            disabled={running}
            onClick={() => void runSegmentation()}
            className="shrink-0 font-medium text-red-200 hover:text-white disabled:opacity-50"
          >
            Try Again
          </button>
        </div>
      )}

      {message && !error && (
        <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/[0.06] p-4 text-sm text-green-300">
          {message}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Segmented Customers"
          value={loading ? "..." : formatNumber(total)}
          badge="K-Means"
          status={hasResults ? "positive" : "neutral"}
          icon={Users}
        />
        <KpiCard
          title="Segments"
          value={loading ? "..." : formatNumber(segments.length)}
          badge="Clusters"
          status={hasResults ? "positive" : "neutral"}
          icon={Network}
        />
        <KpiCard
          title="Algorithm"
          value={runInfo?.algorithm || "K-Means"}
          badge="ML"
          status="neutral"
          icon={BrainCircuit}
        />
        <KpiCard
          title="Pipeline"
          value={running ? "Processing" : "Ready"}
          badge={running ? "Running" : "Online"}
          status={running ? "neutral" : "positive"}
          icon={Activity}
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <DashboardCard>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-500/10 p-3">
                <Users className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold">Segment Distribution</h3>
                <p className="text-xs text-gray-500">
                  Latest persisted assignment for each customer
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={loading || running}
              onClick={() => void loadDistribution()}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition hover:text-white disabled:opacity-50"
              aria-label="Refresh segmentation results"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loading ? (
            <SectionLoading text="Loading segmentation results..." />
          ) : !hasResults ? (
            <div className="mt-6 flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-violet-500/20 bg-violet-500/[0.025] p-8">
              <div className="max-w-md text-center">
                <Network className="mx-auto h-10 w-10 text-violet-400/60" />
                <p className="mt-5 font-medium text-gray-200">
                  Segmentation not run yet
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Run K-Means to calculate customer groups and populate this
                  dashboard from the persisted segmentation results.
                </p>
                <Button
                  type="button"
                  disabled={running}
                  onClick={() => void runSegmentation()}
                  className="mt-6 bg-violet-600 text-white hover:bg-violet-500"
                >
                  {running ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  {running ? "Running K-Means..." : "Run Segmentation"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {segments.map((segment) => {
                const percentage = toPercentage(segment.percentage);

                return (
                  <div
                    key={segment.segment}
                    className="rounded-xl border border-white/5 bg-white/[0.025] p-5"
                  >
                    <div className="flex items-center justify-between gap-5">
                      <div>
                        <p className="font-medium text-gray-200">
                          {segment.segment}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatNumber(segment.count)} customer
                          {segment.count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-violet-300">
                        {percentage.toFixed(2)}%
                      </p>
                    </div>
                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${percentage}%`,
                        }}
                        transition={{ duration: 0.7 }}
                        className="h-full rounded-full bg-violet-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-3">
              <BrainCircuit className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold">ML Pipeline</h3>
              <p className="text-xs text-gray-500">Express → FastAPI</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <InfoRow label="Model" value={runInfo?.algorithm || "K-Means"} />
            <InfoRow
              label="Customers"
              value={formatNumber(runInfo?.customerCount ?? total)}
            />
            <InfoRow
              label="Clusters"
              value={formatNumber(runInfo?.clusterCount ?? segments.length)}
            />
            <InfoRow
              label="Status"
              value={running ? "Processing" : hasResults ? "Completed" : "Ready"}
            />
          </div>

          <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.025] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Feature Pipeline
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(runInfo?.features?.length
                ? runInfo.features
                : ["Recency", "Frequency", "Monetary", "AOV"]
              ).map((feature) => (
                <span
                  key={feature}
                  className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1.5 text-xs text-violet-300"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-blue-500/10 bg-blue-500/[0.05] p-4 text-xs leading-5 text-gray-400">
            Express owns authentication, Prisma queries and persistence. The
            FastAPI service performs preprocessing and K-Means computation.
          </div>
        </DashboardCard>
      </div>
    </motion.div>
  );
}

function ChurnPredictionModule({
  onSessionExpired,
}: {
  onSessionExpired: () => void;
}) {
  const [data, setData] = useState<ChurnData | null>(null);
  const [customers, setCustomers] = useState<ChurnCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const applyResult = useCallback((result: ChurnResponse | null) => {
    if (!result) return;
    const body = result.data;
    const objectData = body && !Array.isArray(body) ? body : null;
    const merged: ChurnData = { ...(result.summary ?? {}), ...(objectData ?? {}) };
    const rows =
      (Array.isArray(body) ? body : null) ??
      objectData?.customers ??
      objectData?.predictions ??
      result.customers ??
      result.predictions ??
      [];
    setData(merged);
    setCustomers(Array.isArray(rows) ? rows : []);
  }, []);

  const loadChurn = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/api/dashboard/churn`, createGetRequest());
      if (isAuthenticationFailure(response)) {
        onSessionExpired();
        return;
      }
      if (response.status === 404) {
        setData(null);
        setCustomers([]);
        setError("");
        return;
      }
      const result = await readJsonResponse<ChurnResponse>(response);
      assertSuccessfulResponse(response, result?.message, "churn prediction analytics");
      applyResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load churn prediction analytics.");
    } finally {
      setLoading(false);
    }
  }, [applyResult, onSessionExpired]);

  useEffect(() => {
    void loadChurn();
  }, [loadChurn]);

  async function runChurn() {
    try {
      setRunning(true);
      setError("");
      setMessage("");
      const response = await fetch(`${API_URL}/api/analytics/churn/run`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (isAuthenticationFailure(response)) {
        onSessionExpired();
        return;
      }
      const result = await readJsonResponse<ChurnResponse>(response);
      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || `Unable to run churn prediction (${response.status})`);
      }
      setMessage(result?.message || "Churn prediction completed successfully.");
      await loadChurn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to run churn prediction.");
    } finally {
      setRunning(false);
    }
  }

  const probability = (c: ChurnCustomer) =>
    toPercentage(c.churnProbability ?? c.probability ?? c.riskScore ?? 0);
  const risk = (c: ChurnCustomer): "high" | "medium" | "low" => {
    const r = c.riskLevel?.toLowerCase() ?? "";
    if (r.includes("high")) return "high";
    if (r.includes("medium") || r.includes("moderate")) return "medium";
    if (r.includes("low")) return "low";
    const p = probability(c);
    return p >= 70 ? "high" : p >= 40 ? "medium" : "low";
  };

  const total = toSafeNumber(data?.totalCustomers ?? data?.evaluatedCustomers ?? customers.length);
  const high = toSafeNumber(data?.highRiskCustomers ?? customers.filter(c => risk(c) === "high").length);
  const medium = toSafeNumber(data?.mediumRiskCustomers ?? customers.filter(c => risk(c) === "medium").length);
  const low = toSafeNumber(data?.lowRiskCustomers ?? customers.filter(c => risk(c) === "low").length);
  const derivedRate = customers.length ? customers.filter(c => probability(c) >= 50).length / customers.length * 100 : 0;
  const churnRate =
    data?.churnRate != null
      ? toPercentage(data.churnRate)
      : data?.predictedChurnRate != null
        ? toPercentage(data.predictedChurnRate)
        : derivedRate;
  const model = data?.algorithm || data?.model || "ML Model";
  const hasResults = total > 0 || customers.length > 0;
  const sorted = [...customers].sort((a,b) => probability(b)-probability(a)).slice(0,20);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-violet-400">
            <BrainCircuit className="h-4 w-4" /> Machine Learning Analytics
          </div>
          <h2 className="text-3xl font-semibold md:text-4xl">
            Churn Prediction
          </h2>
          <p className="mt-2 max-w-3xl text-gray-400">
            Predict customer churn risk through the FastAPI machine-learning
            pipeline and identify customers requiring retention action.
          </p>
        </div>
        <Button
          type="button"
          disabled={running || loading}
          onClick={() => void runChurn()}
          className="gap-2 bg-violet-600 text-white hover:bg-violet-500"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {running
            ? "Running Prediction..."
            : hasResults
              ? "Re-run Prediction"
              : "Run Churn Prediction"}
        </Button>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-300">
          {error}
        </div>
      )}
      {message && !error && (
        <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/[0.06] p-4 text-sm text-green-300">
          {message}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Customers Evaluated"
          value={loading ? "..." : formatNumber(total)}
          badge="Live"
          status={hasResults ? "positive" : "neutral"}
          icon={Users}
        />
        <KpiCard
          title="Predicted Churn Rate"
          value={loading ? "..." : `${churnRate.toFixed(2)}%`}
          badge="ML"
          status={churnRate > 0 ? "negative" : "neutral"}
          icon={HeartCrack}
        />
        <KpiCard
          title="High Risk Customers"
          value={loading ? "..." : formatNumber(high)}
          badge="Priority"
          status={high > 0 ? "negative" : "neutral"}
          icon={Activity}
        />
        <KpiCard
          title="Model"
          value={model}
          badge={running ? "Running" : "Ready"}
          status={running ? "neutral" : "positive"}
          icon={BrainCircuit}
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
        <DashboardCard>
          <h3 className="font-semibold">Risk Distribution</h3>
          <p className="mt-1 text-xs text-gray-500">
            Current customer churn classification
          </p>
          {loading ? (
            <SectionLoading text="Loading churn analytics..." />
          ) : !hasResults ? (
            <EmptyState
              icon={HeartCrack}
              title="Churn prediction not run yet"
              description="Run the churn model to calculate customer risk scores and populate this dashboard."
            />
          ) : (
            <div className="mt-6 space-y-4">
              {[
                ["High Risk", high],
                ["Medium Risk", medium],
                ["Low Risk", low],
              ].map(([label, count]) => {
                const n = Number(count);
                const pct = total ? (n / total) * 100 : 0;

                return (
                  <div
                    key={String(label)}
                    className="rounded-xl border border-white/5 bg-white/[0.025] p-4"
                  >
                    <div className="flex justify-between">
                      <span>{label}</span>
                      <span className="text-violet-300">
                        {pct.toFixed(2)}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatNumber(n)} customers
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-6 space-y-4 rounded-xl border border-white/5 bg-white/[0.025] p-4">
            <InfoRow label="Model" value={model} />
            <InfoRow
              label="Status"
              value={running ? "Processing" : hasResults ? "Completed" : "Ready"}
            />
            {typeof data?.accuracy === "number" && (
              <InfoRow
                label="Accuracy"
                value={`${toPercentage(data.accuracy).toFixed(2)}%`}
              />
            )}
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Highest Risk Customers</h3>
              <p className="mt-1 text-xs text-gray-500">
                Ordered by predicted churn probability
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadChurn()}
              disabled={loading || running}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
          {loading ? (
            <SectionLoading text="Loading customer predictions..." />
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No customer predictions available"
              description="Run the churn model to generate customer-level risk scores."
            />
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-500">
                    <th className="pb-4">Customer</th>
                    <th className="pb-4">Segment</th>
                    <th className="pb-4 text-right">Probability</th>
                    <th className="pb-4 text-right">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((c, i) => {
                    const r = risk(c);
                    const cls =
                      r === "high"
                        ? "text-red-300"
                        : r === "medium"
                          ? "text-yellow-300"
                          : "text-green-300";

                    return (
                      <tr
                        key={c.id ?? c.customerId ?? c.email ?? i}
                        className="border-b border-white/5"
                      >
                        <td className="py-4">
                          <p className="font-medium text-gray-200">
                            {c.name || c.customerId || `Customer ${i + 1}`}
                          </p>
                          <p className="mt-1 text-xs text-gray-600">
                            {c.email || c.customerId || ""}
                          </p>
                        </td>
                        <td className="py-4 text-gray-400">
                          {c.segment || "—"}
                        </td>
                        <td className="py-4 text-right">
                          {probability(c).toFixed(2)}%
                        </td>
                        <td className={`py-4 text-right capitalize ${cls}`}>
                          {r}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DashboardCard>
      </div>
    </motion.div>
  );
}

function CLVPredictionModule({
  onSessionExpired,
}: {
  onSessionExpired: () => void;
}) {
  const [data, setData] = useState<CLVData | null>(null);
  const [customers, setCustomers] = useState<CLVCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const valueOf = (c: CLVCustomer) =>
    toSafeNumber(c.predictedValue ?? c.predictedCLV ?? c.clv ?? c.lifetimeValue);
  const confidenceOf = (c: CLVCustomer) =>
    toPercentage(c.confidenceScore ?? c.confidence);

  const applyResult = useCallback((result: CLVResponse | null) => {
    if (!result) return;
    const body = result.data;
    const objectData = body && !Array.isArray(body) ? body : null;
    setData({ ...(result.summary ?? {}), ...(objectData ?? {}) });
    const rows =
      (Array.isArray(body) ? body : null) ??
      objectData?.customers ??
      result.customers ??
      [];
    setCustomers(Array.isArray(rows) ? rows : []);
  }, []);

  const loadCLV = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/dashboard/clv`,
        createGetRequest()
      );

      if (isAuthenticationFailure(response)) {
        onSessionExpired();
        return;
      }

      if (response.status === 404) {
        setData(null);
        setCustomers([]);
        setError("");
        return;
      }

      const result = await readJsonResponse<CLVResponse>(response);
      assertSuccessfulResponse(
        response,
        result?.message,
        "customer lifetime value analytics"
      );
      applyResult(result);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load customer lifetime value analytics."
      );
    } finally {
      setLoading(false);
    }
  }, [applyResult, onSessionExpired]);

  useEffect(() => {
    void loadCLV();
  }, [loadCLV]);

  async function runCLV() {
    try {
      setRunning(true);
      setError("");
      setMessage("");

      const response = await fetch(`${API_URL}/api/analytics/clv/run`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (isAuthenticationFailure(response)) {
        onSessionExpired();
        return;
      }

      const result = await readJsonResponse<CLVResponse>(response);
      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message || `Unable to run CLV prediction (${response.status})`
        );
      }

      setMessage(
        result?.message ||
          "Customer lifetime value prediction completed successfully."
      );
      await loadCLV();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to run customer lifetime value prediction."
      );
    } finally {
      setRunning(false);
    }
  }

  const total = toSafeNumber(data?.customerCount ?? customers.length);
  const totalValue = toSafeNumber(
    data?.totalPredictedValue ??
      customers.reduce((s, c) => s + valueOf(c), 0)
  );
  const average = toSafeNumber(
    data?.averagePredictedValue ??
      (customers.length ? totalValue / customers.length : 0)
  );
  const values = customers.map(valueOf).sort((a, b) => a - b);
  const derivedMedian = values.length
    ? values.length % 2
      ? values[Math.floor(values.length / 2)]
      : (values[values.length / 2 - 1] + values[values.length / 2]) / 2
    : 0;
  const median = toSafeNumber(data?.medianPredictedValue ?? derivedMedian);
  const avgConfidenceRaw = data?.averageConfidenceScore;
  const avgConfidence =
    avgConfidenceRaw !== undefined
      ? toPercentage(avgConfidenceRaw)
      : customers.length
        ? customers.reduce((s, c) => s + confidenceOf(c), 0) / customers.length
        : 0;
  const aboveAverage = toSafeNumber(
    data?.aboveAverageCustomers ??
      customers.filter((c) => valueOf(c) > average).length
  );
  const highValue = toSafeNumber(data?.highValueCustomers ?? aboveAverage);
  const highest =
    data?.highestValueCustomer ??
    [...customers].sort((a, b) => valueOf(b) - valueOf(a))[0] ??
    null;
  const sorted = [...customers].sort((a, b) => valueOf(b) - valueOf(a)).slice(0, 20);
  const hasResults = total > 0 || customers.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-violet-400">
            <BrainCircuit className="h-4 w-4" /> Machine Learning Analytics
          </div>
          <h2 className="text-3xl font-semibold md:text-4xl">
            Customer Lifetime Value
          </h2>
          <p className="mt-2 max-w-3xl text-gray-400">
            Estimate long-term customer value through the FastAPI prediction
            pipeline and identify customers with the greatest projected
            revenue contribution.
          </p>
        </div>
        <Button
          type="button"
          disabled={running || loading}
          onClick={() => void runCLV()}
          className="gap-2 bg-violet-600 text-white hover:bg-violet-500"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : hasResults ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {running
            ? "Running CLV Prediction..."
            : hasResults
              ? "Re-run CLV Prediction"
              : "Run CLV Prediction"}
        </Button>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-300">
          {error}
        </div>
      )}
      {message && !error && (
        <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/[0.06] p-4 text-sm text-green-300">
          {message}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Customers Evaluated"
          value={loading ? "..." : formatNumber(total)}
          badge="Live"
          status={hasResults ? "positive" : "neutral"}
          icon={Users}
        />
        <KpiCard
          title="Total Predicted Value"
          value={loading ? "..." : formatIndianCurrency(totalValue)}
          badge="CLV"
          status={totalValue > 0 ? "positive" : "neutral"}
          icon={CircleDollarSign}
        />
        <KpiCard
          title="Average Predicted Value"
          value={loading ? "..." : formatIndianCurrency(average)}
          badge="Average"
          status={average > 0 ? "positive" : "neutral"}
          icon={TrendingUp}
        />
        <KpiCard
          title="High Value Customers"
          value={loading ? "..." : formatNumber(highValue)}
          badge="Priority"
          status={highValue > 0 ? "positive" : "neutral"}
          icon={Sparkles}
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
        <DashboardCard>
          <h3 className="font-semibold">CLV Summary</h3>
          <p className="mt-1 text-xs text-gray-500">
            Latest persisted lifetime-value prediction
          </p>
          {loading ? (
            <SectionLoading text="Loading CLV analytics..." />
          ) : !hasResults ? (
            <EmptyState
              icon={TrendingUp}
              title="CLV prediction not run yet"
              description="Run the CLV model to calculate customer-level lifetime value predictions."
            />
          ) : (
            <>
              <div className="mt-6 space-y-4">
                <InfoRow
                  label="Median Predicted Value"
                  value={formatIndianCurrency(median)}
                />
                <InfoRow
                  label="Average Confidence"
                  value={`${avgConfidence.toFixed(2)}%`}
                />
                <InfoRow
                  label="Above Average Customers"
                  value={formatNumber(aboveAverage)}
                />
                <InfoRow
                  label="Model Version"
                  value={data?.modelVersion || "CLV Regression"}
                />
                <InfoRow
                  label="Prediction Date"
                  value={
                    data?.predictionDate
                      ? formatDateTime(data.predictionDate)
                      : "N/A"
                  }
                />
              </div>
              {highest && (
                <div className="mt-6 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-5">
                  <p className="text-xs uppercase tracking-wider text-violet-300">
                    Highest Value Customer
                  </p>
                  <p className="mt-3 font-medium">
                    {highest.name ||
                      highest.customerId ||
                      `Customer ${highest.id ?? ""}`}
                  </p>
                  {highest.email && (
                    <p className="mt-1 text-xs text-gray-500">
                      {highest.email}
                    </p>
                  )}
                  <p className="mt-4 text-2xl font-semibold text-green-400">
                    {formatIndianCurrency(valueOf(highest))}
                  </p>
                </div>
              )}
            </>
          )}
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Highest Value Customers</h3>
              <p className="mt-1 text-xs text-gray-500">
                Ordered by predicted customer lifetime value
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadCLV()}
              disabled={loading || running}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
          {loading ? (
            <SectionLoading text="Loading customer lifetime values..." />
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No customer CLV predictions available"
              description="Run the CLV model to generate customer-level lifetime value predictions."
            />
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-500">
                    <th className="pb-4">Customer</th>
                    <th className="pb-4">Segment</th>
                    <th className="pb-4 text-right">Predicted CLV</th>
                    <th className="pb-4 text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((c, i) => (
                    <tr
                      key={String(c.id ?? c.customerId ?? c.email ?? i)}
                      className="border-b border-white/5"
                    >
                      <td className="py-4">
                        <p className="font-medium text-gray-200">
                          {c.name || c.customerId || `Customer ${c.id ?? i + 1}`}
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          {c.email || c.customerId || ""}
                        </p>
                      </td>
                      <td className="py-4 text-gray-400">
                        {c.segment || "Unassigned"}
                      </td>
                      <td className="py-4 text-right font-medium text-green-400">
                        {formatIndianCurrency(valueOf(c))}
                      </td>
                      <td className="py-4 text-right text-violet-300">
                        {confidenceOf(c).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardCard>
      </div>
    </motion.div>
  );
}

function MarketBasketModule({
  onSessionExpired,
  products,
}: {
  onSessionExpired: () => void;
  products: ProductPerformance[];
}) {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [analytics, setAnalytics] =
    useState<MarketBasketData | null>(null);

  const [message, setMessage] = useState("");

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/dashboard/market-basket`,
        createGetRequest()
      );

      if (isAuthenticationFailure(response)) {
        onSessionExpired();
        return;
      }

      if (response.status === 404) {
        setAnalytics(null);
        setError("");
        return;
      }

      const result = await readJsonResponse<{
        success?: boolean;
        data?: MarketBasketData;
        message?: string;
      }>(response);

      assertSuccessfulResponse(
        response,
        result?.message,
        "market basket analytics"
      );

      setAnalytics(result?.data ?? null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load market basket analytics."
      );
    } finally {
      setLoading(false);
    }
  }, [onSessionExpired]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  async function runAnalysis() {
    try {
      setRunning(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/api/analytics/market-basket/run`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      if (isAuthenticationFailure(response)) {
        onSessionExpired();
        return;
      }

      const result = await readJsonResponse<{
        success?: boolean;
        message?: string;
      }>(response);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message ||
            `Unable to run market basket analysis (${response.status})`
        );
      }

      setMessage(
        result?.message || "Market basket analysis completed successfully."
      );
      await loadAnalytics();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to run market basket analysis."
      );
    } finally {
      setRunning(false);
    }
  }

  const hasResults = Boolean(
    analytics &&
      (analytics.frequentItemsets.length > 0 || analytics.rules.length > 0)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-violet-400">
            <BrainCircuit className="h-4 w-4" />
            Machine Learning Analytics
          </div>
          <h2 className="text-3xl font-semibold md:text-4xl">
            Market Basket Analysis
          </h2>
          <p className="mt-2 max-w-3xl text-gray-400">
            Mine frequent itemsets and association rules from order history
            to surface which products are commonly purchased together.
          </p>
        </div>

        <Button
          type="button"
          disabled={running || loading}
          onClick={() => void runAnalysis()}
          className="gap-2 bg-violet-600 text-white hover:bg-violet-500"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : hasResults ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {running
            ? "Running Analysis..."
            : hasResults
              ? "Re-run Analysis"
              : "Run Market Basket Analysis"}
        </Button>
      </div>

      {error && (
        <div className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-300">
          <span>{error}</span>
          <button
            type="button"
            disabled={running}
            onClick={() => void runAnalysis()}
            className="shrink-0 font-medium text-red-200 hover:text-white disabled:opacity-50"
          >
            Try Again
          </button>
        </div>
      )}

      {message && !error && (
        <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/[0.06] p-4 text-sm text-green-300">
          {message}
        </div>
      )}

      {loading ? (
        <div className="mt-8">
          <SectionLoading text="Loading market basket analytics..." />
        </div>
      ) : !analytics ? (
        <div className="mt-8">
          <EmptyState
            icon={ShoppingBasket}
            title="No analytics available"
            description="Run the market basket analysis to mine frequent itemsets and association rules."
          />
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              title="Transactions"
              value={formatNumber(analytics.transactionCount)}
              badge="Orders"
              status="neutral"
              icon={ShoppingBasket}
            />
            <KpiCard
              title="Unique Products"
              value={formatNumber(analytics.uniqueProductCount)}
              badge="Catalog"
              status="neutral"
              icon={Network}
            />
            <KpiCard
              title="Frequent Itemsets"
              value={formatNumber(analytics.frequentItemsetCount)}
              badge="Mined"
              status={hasResults ? "positive" : "neutral"}
              icon={BrainCircuit}
            />
            <KpiCard
              title="Association Rules"
              value={formatNumber(analytics.associationRuleCount)}
              badge="Rules"
              status={hasResults ? "positive" : "neutral"}
              icon={Activity}
            />
            <KpiCard
              title="Average Confidence"
              value={`${toPercentage(analytics.averageConfidence).toFixed(
                0
              )}%`}
              badge="Confidence"
              status="neutral"
              icon={Target}
            />
            <KpiCard
              title="Maximum Lift"
              value={toSafeNumber(analytics.maximumLift).toFixed(2)}
              badge="Lift"
              status="neutral"
              icon={TrendingUp}
            />
          </div>

          {analytics.strongestRule && (
            <div className="mt-6">
              <DashboardCard>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-violet-500/10 p-3">
                    <Zap className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Strongest Rule</h3>
                    <p className="text-xs text-gray-500">
                      Highest-lift association found in the data
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-lg text-gray-200">
                  <span className="font-semibold text-violet-300">
                    {formatProducts(analytics.strongestRule.antecedents)}
                  </span>
                  <span className="mx-3 text-gray-500">→</span>
                  <span className="font-semibold text-violet-300">
                    {formatProducts(analytics.strongestRule.consequents)}
                  </span>
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/5 bg-white/[0.025] p-4">
                    <p className="text-xs text-gray-500">Support</p>
                    <p className="mt-1 text-lg font-semibold text-gray-200">
                      {toPercentage(analytics.strongestRule.support).toFixed(
                        0
                      )}
                      %
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.025] p-4">
                    <p className="text-xs text-gray-500">Confidence</p>
                    <p className="mt-1 text-lg font-semibold text-gray-200">
                      {toPercentage(
                        analytics.strongestRule.confidence
                      ).toFixed(0)}
                      %
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.025] p-4">
                    <p className="text-xs text-gray-500">Lift</p>
                    <p className="mt-1 text-lg font-semibold text-gray-200">
                      {toSafeNumber(analytics.strongestRule.lift).toFixed(2)}
                    </p>
                  </div>
                </div>
              </DashboardCard>
            </div>
          )}

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            <DashboardCard>
              <h3 className="font-semibold">Frequent Itemsets</h3>
              <p className="mt-1 text-xs text-gray-500">
                Product combinations that occur together most often
              </p>
              {analytics.frequentItemsets.length === 0 ? (
                <EmptyState
                  icon={ShoppingBasket}
                  title="No itemsets found"
                  description="Frequent itemsets will appear here once the analysis has enough order data."
                />
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-500">
                        <th className="pb-4">Items</th>
                        <th className="pb-4 text-right">Support</th>
                        <th className="pb-4 text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.frequentItemsets.map((item, index) => (
                        <tr key={index} className="border-b border-white/5">
                          <td className="py-4 text-gray-200">
                            {formatProducts(item.items)}
                          </td>
                          <td className="py-4 text-right text-gray-400">
                            {toPercentage(item.support).toFixed(0)}%
                          </td>
                          <td className="py-4 text-right text-gray-400">
                            {formatNumber(item.count)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DashboardCard>

            <DashboardCard>
              <h3 className="font-semibold">Association Rules</h3>
              <p className="mt-1 text-xs text-gray-500">
                If a customer buys the antecedent, they're likely to buy the
                consequent
              </p>
              {analytics.rules.length === 0 ? (
                <EmptyState
                  icon={Network}
                  title="No rules found"
                  description="Association rules will appear here once the analysis has enough order data."
                />
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-500">
                        <th className="pb-4">Product</th>
                        <th className="pb-4">Recommended With</th>
                        <th className="pb-4 text-right">Support</th>
                        <th className="pb-4 text-right">Confidence</th>
                        <th className="pb-4 text-right">Lift</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.rules.map((rule, index) => (
                        <tr
                          key={`${index}-${rule.antecedents.map((p) => p.id).join("-")}-${rule.consequents.map((p) => p.id).join("-")}`}
                          className="border-b border-white/5"
                        >
                          <td className="py-4 font-medium text-gray-200">
                            {formatProducts(rule.antecedents)}
                          </td>
                          <td className="py-4 text-gray-200">
                            {formatProducts(rule.consequents)}
                          </td>
                          <td className="py-4 text-right text-gray-400">
                            {toPercentage(rule.support).toFixed(0)}%
                          </td>
                          <td className="py-4 text-right text-gray-400">
                            {toPercentage(rule.confidence).toFixed(0)}%
                          </td>
                          <td className="py-4 text-right">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                toSafeNumber(rule.lift) >= 1
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-amber-500/10 text-amber-400"
                              }`}
                            >
                              {toSafeNumber(rule.lift).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DashboardCard>
          </div>
        </>
      )}
    </motion.div>
  );
}

function DashboardLoadingScreen() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050816] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <NeonParticlesCanvas />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10">
          <BrainCircuit className="h-9 w-9 text-violet-400" />
          <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#050816]">
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
          </span>
        </div>
        <h1 className="mt-7 text-xl font-semibold">E-Commerce AI</h1>
        <p className="mt-2 text-sm text-gray-500">Verifying secure session.</p>
      </motion.div>
    </main>
  );
}

function SessionErrorScreen({
  message,
  onRetry,
  onLogin,
}: {
  message: string;
  onRetry: () => void;
  onLogin: () => void;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#050816] px-6 text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-red-500/20 bg-white/[0.04] p-8 text-center"
      >
        <User className="mx-auto h-8 w-8 text-red-400" />
        <h1 className="mt-5 text-xl font-semibold">
          Session verification failed
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-400">{message}</p>
        <div className="mt-7 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onLogin}
            className="flex-1 border-white/10 bg-white/5 text-white"
          >
            Back to Login
          </Button>
          <Button
            type="button"
            onClick={onRetry}
            className="flex-1 bg-violet-600 text-white"
          >
            Try Again
          </Button>
        </div>
      </motion.div>
    </main>
  );
}

function createGetRequest(): RequestInit {
  return {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  };
}

function isAuthenticationFailure(response: Response) {
  return response.status === 401 || response.status === 403;
}

async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function assertSuccessfulResponse(
  response: Response,
  message: string | undefined,
  label: string
) {
  if (!response.ok) {
    throw new Error(message || `Unable to load ${label} (${response.status})`);
  }
}

function normalizeSummary(summary: DashboardSummary): DashboardSummary {
  return {
    totalCustomers: toSafeNumber(summary.totalCustomers),
    totalProducts: toSafeNumber(summary.totalProducts),
    totalOrders: toSafeNumber(summary.totalOrders),
    totalRevenue: toSafeNumber(summary.totalRevenue),
    averageOrderValue: toSafeNumber(summary.averageOrderValue),
    averageCustomerValue: toSafeNumber(summary.averageCustomerValue),
    churnRate: toSafeNumber(summary.churnRate),
    highRiskCustomers: toSafeNumber(summary.highRiskCustomers),
  };
}

function toSafeNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/**
 * Normalizes a ratio-like value to a 0-100 percentage.
 *
 * Backend contracts vary between returning fractions (0.82)
 * and pre-multiplied percentages (82). This mirrors the same
 * range-detection guard already used by Churn/CLV so a value
 * only gets multiplied by 100 when it actually looks like a
 * 0-1 fraction, instead of assuming the contract unconditionally.
 */
function toPercentage(value: unknown): number {
  const n = toSafeNumber(value);
  return n >= 0 && n <= 1 ? n * 100 : Math.min(100, Math.max(0, n));
}

function formatIndianCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(toSafeNumber(value));
}

function formatCompactCurrency(value: number): string {
  const amount = toSafeNumber(value);

  if (Math.abs(amount) >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }

  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }

  if (Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}K`;
  }

  return `₹${amount.toFixed(0)}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(toSafeNumber(value));
}

function formatProducts(products: MarketBasketProduct[]): string {
  return products.map((product) => product.name).join(", ");
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

function getPageTitle(tab: DashboardTab): string {
  const titles: Record<DashboardTab, string> = {
    overview: "Analytics Dashboard",
    segmentation: "Customer Segmentation",
    churn: "Churn Prediction",
    clv: "Customer Lifetime Value",
    basket: "Market Basket Analysis",
    recommendations: "Product Recommendations",
    forecasting: "Sales Forecasting",
  };

  return titles[tab];
}

interface MarketBasketProduct {
  id: string;
  name: string;
  category?: string | null;
  price?: number | null;
}

interface MarketBasketRule {
  antecedents: MarketBasketProduct[];
  consequents: MarketBasketProduct[];
  support: number;
  confidence: number;
  lift: number;
}

interface MarketBasketItemset {
  items: MarketBasketProduct[];
  support: number;
  count: number;
}

interface MarketBasketData {
  algorithm: string;
  modelVersion: string;
  transactionCount: number;
  uniqueProductCount: number;
  frequentItemsetCount: number;
  associationRuleCount: number;
  averageConfidence: number;
  maximumLift: number;
  strongestRule: MarketBasketRule | null;
  frequentItemsets: MarketBasketItemset[];
  rules: MarketBasketRule[];
  analysisDate: string | null;
}

interface RecommendationItem {
  customer: {
    id: string;
    name: string;
    email: string;
  };

  product: {
    id: string;
    name: string;
    category: string;
    price: number;
  };

  score: number;
  reason: string | null;
  algorithm: string;
}

interface RecommendationData {
  algorithm: string | null;

  recommendationCount: number;

  averageScore: number;

  highestScore: number;

  recommendations: RecommendationItem[];
}

type SortOption = "score-desc" | "price-desc" | "price-asc";

interface ForecastPoint {
  period: string;
  historicalRevenue: number | null;
  predictedRevenue: number | null;
  predictedOrders?: number | null;
  predictedAOV?: number | null;
  lowerBound: number | null;
  upperBound: number | null;
}

interface ForecastEvaluation {
  status: "insufficient" | "limited" | "moderate" | "reliable";
  confidence: "low" | "medium" | "high";
  evaluationDays: number;
  minimumRecommendedDays: number;
  message: string;
}

interface ForecastData {
  algorithm: string | null;
  modelVersion: string | null;
  horizon: number;
  historyPoints?: number;

  mae: number | null;
  rmse: number | null;
  mape: number | null;
  wape: number | null;
  smape: number | null;

  evaluationDays: number | null;
  evaluation?: ForecastEvaluation;

  dataQuality?: {
    quality: string;
    confidence?: string;
    isSparse?: boolean;
    observedDays: number;
    calendarDays: number;
    missingDays: number;
    coverage?: number;
  };

  generatedAt: string | null;

  modelComparison?: ModelComparison | null;

  businessInsights?: BusinessInsights | null;

  forecastExplainability?: ForecastExplanation[] | null;

  points: ForecastPoint[];
}

function getReasonLabel(reason: string | null | undefined): string {
  return reason && reason.trim().length > 0
    ? reason
    : "Recommended based on customer behavior";
}

function RecommendationSkeleton() {
  return (
    <div className="mt-6 animate-pulse">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <div className="h-10 w-full rounded-xl bg-white/5 lg:max-w-xs" />
        <div className="h-10 w-full max-w-sm rounded-xl bg-white/5" />
        <div className="h-10 w-full max-w-sm rounded-xl bg-white/5 lg:ml-auto" />
      </div>

      <div className="mt-4 h-4 w-48 rounded bg-white/5" />

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-2/3 space-y-2">
                <div className="h-3 w-8 rounded bg-white/5" />
                <div className="h-4 w-full rounded bg-white/5" />
                <div className="h-3 w-16 rounded-full bg-white/5" />
              </div>
            </div>

            <div className="mt-4 h-5 w-24 rounded bg-white/5" />

            <div className="mt-5">
              <div className="h-3 w-full rounded bg-white/5" />
              <div className="mt-2 h-1.5 w-full rounded-full bg-white/5" />
            </div>

            <div className="mt-5 h-16 w-full rounded-xl bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================
   CUSTOM DROPDOWN (presentation-only replacement
   for native <select> elements)
========================================= */

interface DropdownItem {
  value: string;
}

function Dropdown<Item extends DropdownItem>({
  items,
  value,
  onChange,
  renderTrigger,
  renderItem,
  ariaLabel,
  emptyMessage = "No options available",
  wrapperClassName = "",
  menuClassName = "",
  align = "left",
}: {
  items: Item[];
  value: string;
  onChange: (value: string) => void;
  renderTrigger: (selected: Item | undefined) => ReactNode;
  renderItem: (
    item: Item,
    state: { active: boolean; selected: boolean }
  ) => ReactNode;
  ariaLabel: string;
  emptyMessage?: string;
  wrapperClassName?: string;
  menuClassName?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const listboxId = useId();

  const disabled = items.length === 0;
  const selectedIndex = items.findIndex((item) => item.value === value);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : undefined;

  // Close on outside click, handle keyboard navigation while open.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) =>
          items.length === 0 ? 0 : (index + 1) % items.length
        );
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) =>
          items.length === 0 ? 0 : (index - 1 + items.length) % items.length
        );
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        setActiveIndex(0);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        setActiveIndex(Math.max(0, items.length - 1));
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const item = items[activeIndex];
        if (item) {
          onChange(item.value);
          setOpen(false);
          buttonRef.current?.focus();
        }
        return;
      }
      if (event.key === "Tab") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, items, activeIndex, onChange]);

  // Reset keyboard focus to the selected item whenever the menu opens.
  useEffect(() => {
    if (open) {
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  return (
    <div ref={containerRef} className={`relative ${wrapperClassName}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className={`flex w-full items-center gap-2 rounded-xl border bg-white/5 px-4 py-2.5 text-left text-sm text-gray-200 outline-none backdrop-blur-xl transition ${
          open
            ? "border-violet-500/50 ring-1 ring-violet-500/30"
            : "border-white/10 hover:border-violet-500/30 hover:bg-white/[0.07]"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className="min-w-0 flex-1 truncate">
          {disabled ? emptyMessage : renderTrigger(selected)}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
            open ? "rotate-180 text-violet-400" : ""
          }`}
        />
      </button>

      {open && !disabled && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute z-50 mt-2 max-h-64 w-full min-w-[16rem] overflow-y-auto rounded-xl border border-white/10 bg-[#0b0f1f]/95 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,.5)] backdrop-blur-xl ${
            align === "right" ? "right-0" : "left-0"
          } ${menuClassName}`}
        >
          {items.map((item, index) => {
            const isSelected = item.value === value;
            const isActive = index === activeIndex;
            return (
              <li
                key={item.value}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  onChange(item.value);
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                className={`cursor-pointer rounded-lg px-2.5 py-2 text-sm transition ${
                  isActive ? "bg-violet-500/15" : ""
                } ${isSelected ? "text-white" : "text-gray-300"}`}
              >
                {renderItem(item, { active: isActive, selected: isSelected })}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CustomerAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[11px] font-semibold text-violet-300 ring-1 ring-inset ring-violet-500/20">
      {initial}
    </span>
  );
}

interface CustomerDropdownOption {
  value: string;
  id: string;
  name: string;
  email: string;
  count: number;
}

function CustomerDropdown({
  customers,
  value,
  onChange,
  emptyMessage,
}: {
  customers: { id: string; name: string; email: string; count: number }[];
  value: string;
  onChange: (id: string) => void;
  emptyMessage: string;
}) {
  const items: CustomerDropdownOption[] = customers.map((customer) => ({
    value: customer.id,
    ...customer,
  }));

  return (
    <Dropdown
      items={items}
      value={value}
      onChange={onChange}
      ariaLabel="Customer"
      emptyMessage={emptyMessage}
      wrapperClassName="w-full max-w-sm lg:w-auto"
      renderTrigger={(selected) =>
        selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <CustomerAvatar name={selected.name} />
            <span className="truncate">
              {selected.name}{" "}
              <span className="text-gray-500">({selected.count})</span>
            </span>
          </span>
        ) : (
          <span className="text-gray-500">Select a customer</span>
        )
      }
      renderItem={(item, { selected }) => (
        <span className="flex w-full items-center gap-2.5">
          <CustomerAvatar name={item.name} />
          <span className="min-w-0 flex-1 text-left">
            <span
              className={`block truncate ${
                selected ? "font-medium text-white" : "text-gray-200"
              }`}
            >
              {item.name}
            </span>
            <span className="block truncate text-xs text-gray-500">
              {item.email}
            </span>
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums ${
              selected
                ? "bg-violet-500/20 text-violet-200"
                : "bg-white/5 text-gray-400"
            }`}
          >
            {item.count}
          </span>
          {selected && (
            <Check className="h-4 w-4 shrink-0 text-violet-400" />
          )}
        </span>
      )}
    />
  );
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "score-desc", label: "Recommendation Score" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "price-asc", label: "Price: Low → High" },
];

function SortDropdown({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (value: SortOption) => void;
}) {
  const selected = SORT_OPTIONS.find((option) => option.value === value);

  return (
    <Dropdown
      items={SORT_OPTIONS}
      value={value}
      onChange={(next) => onChange(next as SortOption)}
      ariaLabel="Sort recommendations"
      wrapperClassName="w-full max-w-sm lg:ml-auto lg:w-auto"
      align="right"
      renderTrigger={() => (
        <span className="truncate">
          Sort:{" "}
          <span className="text-gray-200">{selected?.label ?? ""}</span>
        </span>
      )}
      renderItem={(item, { selected: isSelected }) => (
        <span className="flex w-full items-center gap-2.5">
          <Check
            className={`h-4 w-4 shrink-0 ${
              isSelected ? "text-violet-400" : "text-transparent"
            }`}
          />
          <span className={isSelected ? "font-medium text-white" : "text-gray-300"}>
            {item.label}
          </span>
        </span>
      )}
    />
  );
}

function RecommendationModule({
  data,
  loading,
  running,
  error,
  message,
  onRun,
}: {
  data: RecommendationData | null;
  loading: boolean;
  running: boolean;
  error: string;
  message: string;
  onRun: () => void;
}) {
  const hasResults = Boolean(data && data.recommendations.length > 0);

  const customers = useMemo(() => {
    if (!data) return [];
    const seen = new Map<
      string,
      { id: string; name: string; email: string; count: number }
    >();
    for (const row of data.recommendations) {
      const existing = seen.get(row.customer.id);
      if (existing) {
        existing.count += 1;
      } else {
        seen.set(row.customer.id, {
          id: row.customer.id,
          name: row.customer.name,
          email: row.customer.email,
          count: 1,
        });
      }
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [data]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [showAll, setShowAll] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("score-desc");

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term)
    );
  }, [customers, customerSearch]);

  useEffect(() => {
    if (customers.length === 0) {
      setSelectedCustomerId("");
      return;
    }
    if (!customers.some((customer) => customer.id === selectedCustomerId)) {
      setSelectedCustomerId(customers[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers]);

  useEffect(() => {
    if (filteredCustomers.length === 0) return;
    if (
      !filteredCustomers.some(
        (customer) => customer.id === selectedCustomerId
      )
    ) {
      setSelectedCustomerId(filteredCustomers[0].id);
      setShowAll(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCustomers]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const selectedRecommendations = useMemo(() => {
    if (!data || !selectedCustomerId) return [];
    const rows = data.recommendations.filter(
      (row) => row.customer.id === selectedCustomerId
    );
    return rows.sort((a, b) => {
      if (sortBy === "price-desc") return b.product.price - a.product.price;
      if (sortBy === "price-asc") return a.product.price - b.product.price;
      return b.score - a.score;
    });
  }, [data, selectedCustomerId, sortBy]);

  const visibleRecommendations = showAll
    ? selectedRecommendations
    : selectedRecommendations.slice(0, 5);

  const highestSelectedScore = selectedRecommendations.length
    ? Math.max(...selectedRecommendations.map((row) => row.score))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-violet-400">
            <BrainCircuit className="h-4 w-4" />
            Machine Learning Analytics
          </div>
          <h2 className="text-3xl font-semibold md:text-4xl">
            Product Recommendations
          </h2>
          <p className="mt-2 max-w-3xl text-gray-400">
            Generate personalized product recommendations using
              market-basket associations and customer purchase history.
          </p>
        </div>

        <Button
          type="button"
          disabled={running || loading}
          onClick={onRun}
          className="gap-2 bg-violet-600 text-white hover:bg-violet-500"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : hasResults ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {running
            ? "Generating..."
            : hasResults
              ? "Re-run Recommendations"
              : "Run Recommendations"}
        </Button>
      </div>

      {error && (
        <div className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-300">
          <span>{error}</span>
          <button
            type="button"
            disabled={running}
            onClick={onRun}
            className="shrink-0 font-medium text-red-200 hover:text-white disabled:opacity-50"
          >
            Try Again
          </button>
        </div>
      )}

      {message && !error && (
        <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/[0.06] p-4 text-sm text-green-300">
          {message}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Recommendations"
          value={loading ? "..." : formatNumber(data?.recommendationCount ?? 0)}
          badge="Live"
          status={hasResults ? "positive" : "neutral"}
          icon={Target}
        />
        <KpiCard
          title="Average Score"
          value={loading ? "..." : (data?.averageScore ?? 0).toFixed(2)}
          badge="ML"
          status="neutral"
          icon={Sparkles}
        />
        <KpiCard
          title="Highest Score"
          value={loading ? "..." : (data?.highestScore ?? 0).toFixed(2)}
          badge="Top Match"
          status="positive"
          icon={TrendingUp}
        />
        <KpiCard
          title="Algorithm"
          value={data?.algorithm || "—"}
          badge={running ? "Running" : "Ready"}
          status={running ? "neutral" : "positive"}
          icon={BrainCircuit}
        />
      </div>

      <div className="mt-6">
        <DashboardCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Recommended Products</h3>
              <p className="mt-1 text-xs text-gray-500">
                Ranked by predicted relevance score for each customer
              </p>
            </div>
            <button
              type="button"
              disabled={loading || running}
              onClick={onRun}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition hover:text-white disabled:opacity-50"
              aria-label="Refresh recommendations"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loading ? (
            <RecommendationSkeleton />
          ) : !hasResults ? (
            <EmptyState
              icon={Target}
              title="No recommendations yet"
              description="Run the recommendation engine to generate personalized product matches for your customers."
            />
          ) : (
            <>
              {/* =========================================
                  CUSTOMER SEARCH + SELECTOR + SORT
              ========================================= */}
              <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                <div className="relative w-full lg:max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    placeholder="Search customer..."
                    aria-label="Search customer"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-gray-200 placeholder:text-gray-600 outline-none transition focus:border-violet-500/40"
                  />
                </div>

                <CustomerDropdown
                  customers={filteredCustomers}
                  value={selectedCustomerId}
                  onChange={(id) => {
                    setSelectedCustomerId(id);
                    setShowAll(false);
                  }}
                  emptyMessage={`No customers match "${customerSearch}"`}
                />

                <SortDropdown value={sortBy} onChange={setSortBy} />
              </div>

              {selectedCustomer && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-gray-400">
                    Recommended for{" "}
                    <span className="font-medium text-gray-200">
                      {selectedCustomer.name}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedCustomer.email}
                  </p>
                </div>
              )}

              {/* =========================================
                  RECOMMENDATION CARDS
              ========================================= */}
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleRecommendations.map((row, index) => {
                  const scorePercent = Math.min(
                    100,
                    Math.max(0, row.score * 100)
                  );
                  const isTopScore =
                    highestSelectedScore > 0 &&
                    row.score === highestSelectedScore;

                  return (
                    <motion.div
                      key={`${row.customer.id}-${row.product.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-xs font-medium text-gray-600">
                            #{index + 1}
                          </span>
                          <p className="mt-1 font-medium text-gray-100">
                            {row.product.name}
                          </p>
                          <span className="mt-1.5 inline-block rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cyan-300">
                            {row.product.category}
                          </span>
                        </div>
                        {isTopScore && (
                          <span className="shrink-0 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] text-violet-300">
                            Top Match
                          </span>
                        )}
                      </div>

                      <p className="mt-4 text-lg font-semibold text-gray-100">
                        {formatIndianCurrency(row.product.price)}
                      </p>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Recommendation Score</span>
                          <span className="text-violet-300">
                            {(row.score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-violet-400"
                            style={{ width: `${scorePercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-5 rounded-xl border border-violet-500/10 bg-violet-500/[0.04] p-3">
                        <div className="flex gap-2">
                          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">
                              Why this product?
                            </p>
                            <p className="mt-1 text-xs leading-5 text-gray-400">
                              {getReasonLabel(row.reason)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* =========================================
                  SHOW MORE
              ========================================= */}
              {selectedRecommendations.length > 5 && (
                <div className="flex justify-center pt-6">
                  <button
                    type="button"
                    onClick={() => setShowAll((current) => !current)}
                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-gray-300 transition hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-white"
                  >
                    {showAll
                      ? "Show Top 5"
                      : `Show All ${selectedRecommendations.length}`}
                  </button>
                </div>
              )}
            </>
          )}
        </DashboardCard>
      </div>
    </motion.div>
  );
}

function ForecastingModule({
  onSessionExpired,
}: {
  onSessionExpired: () => void;
}) {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [horizon, setHorizon] = useState(7);

  const [historyFilter, setHistoryFilter] = useState<
    "7" | "30" | "60" | "all"
  >("30");

  const [historyPage, setHistoryPage] = useState(1);

  const HISTORY_PAGE_SIZE = 10;

  const loadForecast = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/analytics/forecasting/run?_=${Date.now()}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({}),
        }
      );

      if (isAuthenticationFailure(response)) {
        onSessionExpired();
        return;
      }

      if (response.status === 404) {
        setData(null);
        setError("");
        return;
      }

      const result = await readJsonResponse<{
        success?: boolean;
        data?: ForecastData;
        message?: string;
      }>(response);

      assertSuccessfulResponse(
        response,
        result?.message,
        "sales forecast"
      );

      console.log("=== FORECAST FRONTEND RESPONSE ===");
      console.log("SUCCESS:", result?.success);
      console.log("MODEL:", result?.data?.modelVersion);
      console.log("POINTS:", result?.data?.points?.length);
      console.log(
        "BUSINESS INSIGHTS:",
        result?.data?.businessInsights
      );
      console.log(
        "MODEL COMPARISON:",
        result?.data?.modelComparison
      );
      console.log(
        "EXPLAINABILITY:",
        result?.data?.forecastExplainability
      );
      console.log(
        "EXPLAINABILITY COUNT:",
        result?.data?.forecastExplainability?.length
      );

      setData(result?.data ?? null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load sales forecast."
      );
    } finally {
      setLoading(false);
    }
  }, [onSessionExpired]);

  useEffect(() => {
    void loadForecast();
  }, [loadForecast]);

  async function runForecast() {
    try {
      setRunning(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/api/analytics/forecasting/run`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ horizon }),
        }
      );

      if (isAuthenticationFailure(response)) {
        onSessionExpired();
        return;
      }

      const result = await readJsonResponse<{
        success?: boolean;
        data?: ForecastData;
        message?: string;
      }>(response);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message ||
            `Unable to run sales forecast (${response.status})`
        );
      }

      if (result?.data) {
        setData(result.data);
      }

      setMessage(
        result?.message ||
          "Sales forecast generated successfully."
      );

      setHistoryPage(1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to run sales forecast."
      );
    } finally {
      setRunning(false);
    }
  }

  const allPoints = data?.points ?? [];

  const forecastPoints = useMemo(
    () =>
      allPoints.filter(
        (point) => point.predictedRevenue != null
      ),
    [allPoints]
  );

  const historicalPoints = useMemo(
    () =>
      allPoints.filter(
        (point) => point.historicalRevenue != null
      ),
    [allPoints]
  );

  /*
   * Primary forecast view:
   * Always show the next 7 forecast days.
   */
  const nextSevenForecast = forecastPoints.slice(0, 7);

  const sevenDayRevenue = nextSevenForecast.reduce(
    (sum, point) =>
      sum + (point.predictedRevenue ?? 0),
    0
  );
  const sevenDayOrders = nextSevenForecast.reduce(
    (sum, point) =>
      sum + (point.predictedOrders ?? 0),
    0
  );

  const sevenDayAOV =
    sevenDayOrders > 0
      ? sevenDayRevenue / sevenDayOrders
      : 0;

  /*
   * Historical filter.
   */
  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") {
      return historicalPoints;
    }

    const limit = Number(historyFilter);

    return historicalPoints.slice(-limit);
  }, [historicalPoints, historyFilter]);

  const historyTotalPages = Math.max(
    1,
    Math.ceil(
      filteredHistory.length / HISTORY_PAGE_SIZE
    )
  );

  const safeHistoryPage = Math.min(
    historyPage,
    historyTotalPages
  );

  const paginatedHistory = useMemo(() => {
    const start =
      (safeHistoryPage - 1) * HISTORY_PAGE_SIZE;

    return filteredHistory.slice(
      start,
      start + HISTORY_PAGE_SIZE
    );
  }, [
    filteredHistory,
    safeHistoryPage,
  ]);

  const hasResults = allPoints.length > 0;

  useEffect(() => {
    setHistoryPage(1);
  }, [historyFilter]);

  return (
    <motion.div
      data-testid="forecasting-module"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-violet-400">
            <BrainCircuit className="h-4 w-4" />
            Machine Learning Analytics
          </div>

          <h2 className="text-3xl font-semibold md:text-4xl">
            Sales Forecasting
          </h2>

          <p className="mt-2 max-w-3xl text-gray-400">
            Forecast future revenue from historical order
            behavior with confidence intervals and model
            performance metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={horizon}
            onChange={(event) =>
              setHorizon(Number(event.target.value))
            }
            disabled={running}
            className="h-11 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-sm text-gray-300 outline-none transition-all hover:border-white/15 hover:bg-white/[0.055] focus:border-violet-400/30 focus:ring-1 focus:ring-violet-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>

          <Button
            type="button"
            disabled={running || loading}
            onClick={() => void runForecast()}
            className="gap-2 bg-violet-600 text-white hover:bg-violet-500"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasResults ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Zap className="h-4 w-4" />
            )}

            {running
              ? "Forecasting..."
              : hasResults
                ? "Re-run Forecast"
                : "Run Forecast"}
          </Button>
        </div>
      </div>

      {/* =====================================================
          ALERTS
      ====================================================== */}

      {error && (
        <div className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-300">
          <span>{error}</span>

          <button
            type="button"
            disabled={running}
            onClick={() => void runForecast()}
            className="shrink-0 font-medium text-red-200 hover:text-white disabled:opacity-50"
          >
            Try Again
          </button>
        </div>
      )}

      {message && !error && (
        <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/[0.06] p-4 text-sm text-green-300">
          {message}
        </div>
      )}

      {loading ? (
        <div className="mt-8">
          <SectionLoading text="Loading sales forecast..." />
        </div>
      ) : !hasResults ? (
        <div className="mt-8">
          <EmptyState
            icon={BarChart3}
            title="No forecast available yet"
            description="Run the forecasting model to project future revenue from your order history."
          />
        </div>
      ) : (
        <>
          {data?.evaluation?.status === "insufficient" && (
            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="text-xl">⚠</div>

                <div>
                  <h3 className="font-semibold text-amber-300">
                    Low-confidence accuracy evaluation
                  </h3>

                  <p className="mt-1 text-sm text-slate-300">
                    {data.evaluation.message}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    Evaluation days:{" "}
                    <span className="font-medium text-white">
                      {data.evaluation.evaluationDays}
                    </span>
                    {" / "}
                    Recommended:{" "}
                    <span className="font-medium text-white">
                      {data.evaluation.minimumRecommendedDays}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================
              PRIMARY KPI ROW
          ================================================== */}

          <ForecastSummaryCards 
           outlook={data?.businessInsights?.revenueOutlook}/>

          {/* =================================================
              MODEL METRICS
          ================================================== */}

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="MAE"
              value={
                data?.mae != null
                  ? formatIndianCurrency(data.mae)
                  : "—"
              }
              badge={
                data?.evaluation?.confidence === "low"
                  ? "Low Confidence"
                  : "Average Error"
              }
              status={
                data?.evaluation?.confidence === "low"
                  ? "negative"
                  : "neutral"
              }
              icon={Activity}
            />

            <KpiCard
              title="RMSE"
              value={
                data?.rmse != null
                  ? formatIndianCurrency(data.rmse)
                  : "—"
              }
              badge={
                data?.evaluation?.confidence === "low"
                  ? "Low Confidence"
                  : "Error"
              }
              status={
                data?.evaluation?.confidence === "low"
                  ? "negative"
                  : "neutral"
              }
              icon={TrendingUp}
            />

            <KpiCard
              title="MAPE"
              value={
                data?.mape != null
                  ? `${data.mape.toFixed(1)}%`
                  : "—"
              }
              badge={
                data?.evaluation?.confidence === "low"
                  ? "Low Confidence"
                  : "Error Rate"
              }
              status={
                data?.evaluation?.confidence === "low"
                  ? "negative"
                  : "neutral"
              }
              icon={Target}
            />

            <KpiCard
              title="sMAPE"
              value={
                data?.smape != null
                  ? `${data.smape.toFixed(1)}%`
                  : "—"
              }
              badge={
                data?.evaluation?.confidence === "low"
                  ? "Low Confidence"
                  : "Symmetric Error"
              }
              status={
                data?.evaluation?.confidence === "low"
                  ? "negative"
                  : "neutral"
              }
              icon={Target}
            />
          </div>

          {/* =================================================
              DATA QUALITY
          ================================================== */}

          {data?.dataQuality && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_20px_70px_rgba(0,0,0,.12)] backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-200">
                    Historical Data Quality
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    Forecast confidence depends on historical
                    coverage and continuity.
                  </p>
                </div>

                <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-violet-300">
                  {data.dataQuality.quality} quality
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 backdrop-blur-sm">
                  <p className="text-xs font-medium text-gray-400">
                    Observed Days
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-100">
                    {data.dataQuality.observedDays}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 backdrop-blur-sm">
                  <p className="text-xs font-medium text-gray-400">
                    Calendar Days
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-100">
                    {data.dataQuality.calendarDays}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 backdrop-blur-sm">
                  <p className="text-xs font-medium text-gray-400">
                    Missing Days
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-100">
                    {data.dataQuality.missingDays}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 backdrop-blur-sm">
                  <p className="text-xs font-medium text-gray-400">
                    Coverage
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-100">
                    {data.dataQuality.coverage != null
                      ? `${(
                          data.dataQuality.coverage *
                          100
                        ).toFixed(1)}%`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {data?.businessInsights && (
            <div className="mt-6">
              <BusinessInsightsPanel
                insights={data.businessInsights}
              />
            </div>
          )}

          {data?.businessInsights && (
            <div className="mt-6">
              <ForecastTrendCards
                demandTrend={data.businessInsights.demandTrend}
                aovTrend={data.businessInsights.aovTrend}
                revenueTrend={data.businessInsights.revenueTrend}
              />
            </div>
          )}

          {/* =================================================
              FORECAST CHART
          ================================================== */}

          <div className="mt-6">
            <DashboardCard>
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      Revenue Forecast
                    </h3>

                    <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-cyan-300">
                      {data?.horizon ?? horizon}-day horizon
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-gray-400">
                    Historical revenue, forecast trajectory,
                    and prediction interval
                  </p>
                </div>

                {data?.generatedAt && (
                  <p className="text-xs text-gray-400">
                    Generated {formatDate(data.generatedAt)}
                  </p>
                )}
              </div>

              <RevenueForecastChart
                points={allPoints}
              />
            </DashboardCard>
          </div>

          {data?.forecastExplainability?.length ? (
            <div className="mt-6">
              <ForecastExplainability
                explanations={
                  data.forecastExplainability
                }
              />
            </div>
          ) : null}

          {data?.modelComparison && (
            <div className="mt-6">
              <ModelComparisonCard
                comparison={data.modelComparison}
              />
            </div>
          )}

          {data?.businessInsights?.recommendations?.length ? (
            <div className="mt-6">
              <AIRecommendations
                recommendations={
                  data.businessInsights.recommendations
                }
              />
            </div>
          ) : null}

          {data?.businessInsights?.riskAlerts?.length ? (
            <div className="mt-6">
              <RiskAlerts
                alerts={data.businessInsights.riskAlerts}
              />
            </div>
          ) : null}

          {/* =================================================
              NEXT 7 DAYS — PRIMARY FORECAST
          ================================================== */}

          <div id="forecast-details" className="mt-6 scroll-mt-24">
            <ForecastTable
              points={forecastPoints}
            />
          </div>

          {/* =================================================
              HISTORICAL DATA
          ================================================== */}

          <div className="mt-6">
            <DashboardCard>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h3 className="font-semibold">
                    Historical Revenue
                  </h3>

                  <p className="mt-1 text-xs text-gray-400">
                    Historical sales used by the forecasting
                    pipeline
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {(
                    [
                      ["7", "Last 7 Days"],
                      ["30", "Last 30 Days"],
                      ["60", "Last 60 Days"],
                      ["all", "All History"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setHistoryFilter(value)
                      }
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        historyFilter === value
                          ? "border-violet-400/30 bg-violet-500/15 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.08)]"
                          : "border-white/10 bg-white/[0.035] text-gray-400 hover:border-white/15 hover:bg-white/[0.06] hover:text-gray-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-7 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.08]">
                    <BarChart3 className="h-5 w-5 text-violet-300" />
                  </div>

                  <h4 className="mt-3 text-sm font-semibold text-gray-100">
                    No historical revenue available
                  </h4>

                  <p className="mx-auto mt-1.5 max-w-lg text-xs leading-5 text-gray-400">
                    Historical revenue will appear here when an observed revenue series is included in the analytics response.
                  </p>

                  <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                    <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[11px] font-medium text-gray-400">
                      {data?.historyPoints ?? 0} historical points available to the forecast pipeline
                    </div>

                    <a
                      href="#forecast-details"
                      className="inline-flex items-center rounded-lg border border-violet-400/20 bg-violet-500/[0.08] px-3 py-1.5 text-[11px] font-medium text-violet-200 transition hover:border-violet-400/35 hover:bg-violet-500/[0.14]"
                    >
                      View Forecast Details
                    </a>
                  </div>
                </div>
              ) : (
              <div className="mt-6 overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-gray-400">
                      <th className="pb-4">
                        Period
                      </th>

                      <th className="pb-4 text-right">
                        Historical Revenue
                      </th>

                      <th className="pb-4 text-right">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedHistory.map(
                      (point) => (
                        <tr
                          key={point.period}
                          className="border-b border-white/5"
                        >
                          <td className="py-4 text-gray-300">
                            {formatDate(
                              point.period
                            )}
                          </td>

                          <td className="py-4 text-right font-semibold text-gray-100">
                            {point.historicalRevenue != null
                              ? formatIndianCurrency(
                                  point.historicalRevenue
                                )
                              : "—"}
                          </td>

                          <td className="py-4 text-right">
                            <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-xs font-medium text-gray-400">
                              Historical
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
              )}

              {filteredHistory.length > 0 && (
              /* Pagination */
              <div className="mt-5 flex flex-col justify-between gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center">
                <p className="text-xs text-gray-400">
                  Showing{" "}
                  {filteredHistory.length === 0
                    ? 0
                    : (safeHistoryPage - 1) *
                        HISTORY_PAGE_SIZE +
                      1}{" "}
                  –
                  {Math.min(
                    safeHistoryPage *
                      HISTORY_PAGE_SIZE,
                    filteredHistory.length
                  )}{" "}
                  of {filteredHistory.length}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safeHistoryPage <= 1}
                    onClick={() =>
                      setHistoryPage(
                        (page) =>
                          Math.max(1, page - 1)
                      )
                    }
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Previous
                  </button>

                  <span className="min-w-[90px] text-center text-xs text-gray-400">
                    Page {safeHistoryPage} of{" "}
                    {historyTotalPages}
                  </span>

                  <button
                    type="button"
                    disabled={
                      safeHistoryPage >=
                      historyTotalPages
                    }
                    onClick={() =>
                      setHistoryPage(
                        (page) =>
                          Math.min(
                            historyTotalPages,
                            page + 1
                          )
                      )
                    }
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </div>
              )}
              </div>
            </DashboardCard>
          </div>
        </>
      )}
    </motion.div>
  );
}

function ForecastChart({
  points,
}: {
  points: ForecastPoint[];
}) {
  if (!points.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No forecast data available"
        description="Run the forecasting model to see the revenue trend."
      />
    );
  }

  const firstForecastPoint = points.find(
    (point) => point.predictedRevenue != null
  );

  const chartData = points.map((point) => {
    const hasBand =
      point.lowerBound != null &&
      point.upperBound != null;

    return {
      ...point,

      confidenceBase: hasBand
        ? point.lowerBound
        : null,

      confidenceRange: hasBand
        ? (point.upperBound as number) -
          (point.lowerBound as number)
        : null,
    };
  });

  return (
    <div className="mt-8 h-[380px] w-full">
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <AreaChart
          data={chartData}
          margin={{
            top: 15,
            right: 20,
            left: 5,
            bottom: 10,
          }}
        >
          <defs>
            <linearGradient
              id="forecastHistoricalFill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor="#8b5cf6"
                stopOpacity={0.28}
              />

              <stop
                offset="95%"
                stopColor="#8b5cf6"
                stopOpacity={0.01}
              />
            </linearGradient>

            <linearGradient
              id="forecastPredictedFill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor="#22d3ee"
                stopOpacity={0.22}
              />

              <stop
                offset="95%"
                stopColor="#22d3ee"
                stopOpacity={0.01}
              />
            </linearGradient>

            <linearGradient
              id="forecastBandFill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor="#22d3ee"
                stopOpacity={0.13}
              />

              <stop
                offset="95%"
                stopColor="#22d3ee"
                stopOpacity={0.025}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="rgba(255,255,255,0.06)"
            vertical={false}
          />

          <XAxis
            dataKey="period"
            stroke="#6b7280"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tickFormatter={(value) =>
              formatDate(String(value))
            }
            minTickGap={28}
          />

          <YAxis
            stroke="#6b7280"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tickFormatter={formatCompactCurrency}
          />

          <Tooltip
            contentStyle={{
              background: "#090d1d",
              border:
                "1px solid rgba(255,255,255,.1)",
              borderRadius: "12px",
            }}
            labelFormatter={(value) =>
              formatDate(String(value))
            }
            formatter={(value, name) => {
              const label =
                name === "historicalRevenue"
                  ? "Historical"
                  : name === "predictedRevenue"
                    ? "Forecast"
                    : name === "confidenceRange"
                      ? "Confidence Range"
                      : String(name);

              return value == null
                ? ["—", label]
                : [
                    formatIndianCurrency(
                      toSafeNumber(value)
                    ),
                    label,
                  ];
            }}
          />

          {firstForecastPoint && (
            <ReferenceLine
              x={firstForecastPoint.period}
              stroke="#a78bfa"
              strokeDasharray="5 5"
              strokeOpacity={0.7}
              label={{
                value: "Forecast begins",
                position: "insideTopRight",
                fill: "#c4b5fd",
                fontSize: 11,
              }}
            />
          )}

          {/* Confidence band */}
          <Area
            type="monotone"
            dataKey="confidenceBase"
            stackId="confidence"
            stroke="none"
            fill="transparent"
            connectNulls={false}
          />

          <Area
            type="monotone"
            dataKey="confidenceRange"
            stackId="confidence"
            stroke="none"
            fill="url(#forecastBandFill)"
            connectNulls={false}
          />

          {/* Historical */}
          <Area
            type="monotone"
            dataKey="historicalRevenue"
            stroke="#8b5cf6"
            strokeWidth={2.5}
            fill="url(#forecastHistoricalFill)"
            connectNulls={false}
            activeDot={{ r: 5 }}
          />

          {/* Forecast */}
          <Area
            type="monotone"
            dataKey="predictedRevenue"
            stroke="#22d3ee"
            strokeWidth={3}
            strokeDasharray="7 5"
            fill="url(#forecastPredictedFill)"
            connectNulls={false}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="h-2 w-6 rounded-full bg-violet-400" />
          Historical
        </div>

        <div className="flex items-center gap-2">
          <span className="h-0.5 w-6 border-t-2 border-dashed border-cyan-400" />
          Forecast
        </div>

        <div className="flex items-center gap-2">
          <span className="h-2 w-6 rounded bg-cyan-400/20" />
          Confidence interval
        </div>
      </div>
    </div>
  );
}