"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  ChartNoAxesCombined,
  HeartCrack,
  Network,
  ShoppingBasket,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { NeonParticlesCanvas } from "@/components/canvas/NeonParticles";

/* =========================================================
   TYPES
========================================================= */

type PageView = "home" | "explore";

type AnalyticsModule = {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
  algorithm: string;
};

type StatProps = {
  icon: LucideIcon;
  value: string;
  label: string;
};

/* =========================================================
   ANALYTICS MODULES
========================================================= */

const modules: AnalyticsModule[] = [
  {
    number: "01",
    title: "Customer Segmentation",
    description:
      "Discover meaningful customer groups using AI-powered clustering and behavioral analytics.",
    icon: Users,
    algorithm: "K-Means Clustering",
  },
  {
    number: "02",
    title: "Churn Prediction",
    description:
      "Identify customers at risk of leaving and uncover the behavioral factors driving churn.",
    icon: HeartCrack,
    algorithm: "XGBoost",
  },
  {
    number: "03",
    title: "Customer Lifetime Value",
    description:
      "Estimate the future value of every customer and prioritize high-value relationships.",
    icon: TrendingUp,
    algorithm: "Regression",
  },
  {
    number: "04",
    title: "Market Basket Analysis",
    description:
      "Discover products frequently purchased together and reveal valuable cross-selling opportunities.",
    icon: ShoppingBasket,
    algorithm: "Apriori Algorithm",
  },
  {
    number: "05",
    title: "Product Recommendations",
    description:
      "Deliver personalized product suggestions using customer behavior and purchase history.",
    icon: Target,
    algorithm: "Collaborative Filtering",
  },
  {
    number: "06",
    title: "Sales Forecasting",
    description:
      "Forecast future demand and revenue trends using historical e-commerce sales data.",
    icon: ChartNoAxesCombined,
    algorithm: "XGBoost / Time Series",
  },
];

/* =========================================================
   MAIN PAGE
========================================================= */

export default function HomePage() {
  const router = useRouter();

  const [currentPage, setCurrentPage] =
    useState<PageView>("home");

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function handleGetStarted() {
    router.push("/auth");
  }

  function handleExplore() {
    setCurrentPage("explore");
  }

  function handleBackHome() {
    setCurrentPage("home");
  }

  function handleLaunchDashboard() {
    /*
     * Dashboard authentication is handled through /auth.
     * After successful authentication, the user is redirected
     * to the protected dashboard.
     */

    router.push("/auth");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      {/* =====================================================
          BACKGROUND GLOWS
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-[10%] -top-[20%] h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[120px]" />

        <div className="absolute -bottom-[20%] -right-[10%] h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[120px]" />

        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-[120px]" />
      </div>

      {/* =====================================================
          PARTICLE BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0 z-[1] opacity-70">
        <NeonParticlesCanvas />
      </div>

      {/* =====================================================
          GRID BACKGROUND
      ===================================================== */}

      <div
        className="pointer-events-none fixed inset-0 z-[2] opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(
              rgba(255,255,255,0.15) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255,255,255,0.15) 1px,
              transparent 1px
            )
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* =====================================================
          PAGE CONTENT
      ===================================================== */}

      <AnimatePresence mode="wait">
        {currentPage === "home" && (
          <HomeView
            key="home"
            onGetStarted={handleGetStarted}
            onExplore={handleExplore}
          />
        )}

        {currentPage === "explore" && (
          <ExploreView
            key="explore"
            onBack={handleBackHome}
            onLaunchDashboard={handleLaunchDashboard}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

/* =========================================================
   HOME VIEW
========================================================= */

function HomeView({
  onExplore,
  onGetStarted,
}: {
  onExplore: () => void;
  onGetStarted: () => void;
}) {
  return (
    <motion.section
      initial={{
        opacity: 0,
        scale: 0.98,
      }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        scale: 1.02,
      }}
      transition={{
        duration: 0.5,
      }}
      className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-20"
    >
      {/* =====================================================
          HERO CONTENT
      ===================================================== */}

      <motion.div
        initial={{
          opacity: 0,
          y: -30,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.8,
        }}
        className="mx-auto flex max-w-5xl flex-col items-center text-center"
      >
        {/* BADGE */}

        <motion.div
          initial={{
            opacity: 0,
            scale: 0.9,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            delay: 0.2,
          }}
          className="mb-6 rounded-full border border-violet-500/30 bg-violet-500/10 px-5 py-2 text-sm font-medium text-violet-300 shadow-lg shadow-violet-500/10 backdrop-blur-xl"
        >
          AI-Powered E-Commerce Analytics
        </motion.div>

        {/* HEADING */}

        <motion.h1
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.8,
            delay: 0.3,
          }}
          className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
        >
          Fin E-Scale Business
          <br />

          <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-500 bg-clip-text text-transparent">
            Intelligence
          </span>

          <span> for Modern Retail</span>
        </motion.h1>

        {/* DESCRIPTION */}

        <motion.p
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.8,
            delay: 0.5,
          }}
          className="mt-7 max-w-2xl text-base leading-8 text-gray-400 sm:text-lg md:text-xl"
        >
          Turn e-commerce data into intelligent forecasts, customer
insights, recommendations, and actionable business decisions.
        </motion.p>

        {/* BUTTONS */}

        <motion.div
          initial={{
            opacity: 0,
            scale: 0.9,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            delay: 0.7,
          }}
          className="mt-10 flex flex-col gap-4 sm:flex-row"
        >
          <Button
            type="button"
            size="lg"
            onClick={onGetStarted}
            className="rounded-full border border-violet-400/20 bg-violet-600 px-8 text-base text-white shadow-[0_0_25px_rgba(139,92,246,0.35)] transition-all duration-300 hover:scale-105 hover:bg-violet-500 hover:shadow-[0_0_40px_rgba(139,92,246,0.55)]"
          >
            Get Started

            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={onExplore}
            className="rounded-full border-blue-500/30 bg-blue-500/5 px-8 text-base text-white backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-blue-400/60 hover:bg-blue-500/10 hover:text-white hover:shadow-[0_0_30px_rgba(59,130,246,0.25)]"
          >
            Explore Platform

            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>

      {/* =====================================================
          PLATFORM STATUS
      ===================================================== */}

      <motion.div
        initial={{
          opacity: 0,
          y: 30,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 1,
        }}
        className="absolute bottom-8 right-8 hidden rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-xl md:block"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />

            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
          </div>

          <div>
            <h3 className="font-semibold">
              Platform Status
            </h3>

            <p className="text-sm text-gray-400">
              All Systems Operational
            </p>
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
}

/* =========================================================
   EXPLORE VIEW
========================================================= */

function ExploreView({
  onBack,
  onLaunchDashboard,
}: {
  onBack: () => void;
  onLaunchDashboard: () => void;
}) {
  return (
    <motion.section
      initial={{
        opacity: 0,
        x: 80,
      }}
      animate={{
        opacity: 1,
        x: 0,
      }}
      exit={{
        opacity: 0,
        x: 80,
      }}
      transition={{
        duration: 0.5,
        ease: "easeInOut",
      }}
      className="relative z-10 min-h-screen px-6 pb-24 lg:px-8"
    >
      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <nav className="mx-auto flex max-w-7xl items-center justify-between py-7">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-3 text-left"
          aria-label="Return to home page"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 shadow-[0_0_25px_rgba(139,92,246,0.2)]">
            <BrainCircuit className="h-5 w-5 text-violet-400" />
          </div>

          <div>
            <p className="font-semibold">
              Fin E-Scale Businesss
            </p>

            <p className="text-xs text-gray-500">
              Customer Intelligence
            </p>
          </div>
        </button>

        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="rounded-full border-white/10 bg-white/5 text-gray-300 backdrop-blur-xl hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />

          <span className="hidden sm:inline">
            Back to Home
          </span>

          <span className="sm:hidden">
            Back
          </span>
        </Button>
      </nav>

      {/* =====================================================
          EXPLORE HERO
      ===================================================== */}

      <div className="mx-auto max-w-7xl pt-14">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              delay: 0.2,
            }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300 backdrop-blur-xl"
          >
            <Sparkles className="h-4 w-4" />

            Fin E-Scale Business AI Analytics Suite
          </motion.div>

          <motion.h2
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.3,
            }}
            className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
          >
            Explore the Intelligence
            <br />

            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-500 bg-clip-text text-transparent">
              Intelligence
            </span>
          </motion.h2>

          <motion.p
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.4,
            }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-400"
          >
            Transform raw e-commerce data into actionable business
            intelligence using machine learning, predictive analytics,
            customer behavior analysis, and recommendation systems.
          </motion.p>
        </div>

        {/* =====================================================
            PLATFORM STATS
        ===================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: 25,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.5,
          }}
          className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4"
        >
          <Stat
            icon={BrainCircuit}
            value="6"
            label="AI Modules"
          />

          <Stat
            icon={Network}
            value="5+"
            label="ML Models"
          />

          <Stat
            icon={BarChart3}
            value="360°"
            label="Analytics"
          />

          <Stat
            icon={Zap}
            value="Real-Time"
            label="Insights"
          />
        </motion.div>

        {/* =====================================================
            ANALYTICS MODULE TITLE
        ===================================================== */}

        <div className="mb-8 mt-24">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-violet-400">
            Analytics Modules
          </p>

          <h3 className="text-2xl font-semibold md:text-3xl">
            Everything you need to understand your customers
          </h3>
        </div>

        {/* =====================================================
            ANALYTICS MODULES
        ===================================================== */}

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module, index) => {
            const Icon: LucideIcon =
              module.icon;

            return (
              <motion.div
                key={module.title}
                initial={{
                  opacity: 0,
                  y: 30,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                  delay:
                    0.5 +
                    index * 0.08,
                }}
                whileHover={{
                  y: -7,
                }}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl transition-colors duration-300 hover:border-violet-500/40 hover:bg-white/[0.06]"
              >
                {/* HOVER GLOW */}

                <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-violet-500/0 blur-[80px] transition-all duration-500 group-hover:bg-violet-500/20" />

                {/* ICON + NUMBER */}

                <div className="relative flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 transition-all duration-300 group-hover:border-violet-400/40 group-hover:bg-violet-500/20 group-hover:shadow-[0_0_25px_rgba(139,92,246,0.2)]">
                    <Icon className="h-6 w-6 text-violet-400" />
                  </div>

                  <span className="font-mono text-sm text-gray-600">
                    {module.number}
                  </span>
                </div>

                {/* MODULE CONTENT */}

                <div className="relative mt-7">
                  <h4 className="text-xl font-semibold">
                    {module.title}
                  </h4>

                  <p className="mt-3 min-h-[72px] text-sm leading-6 text-gray-400">
                    {module.description}
                  </p>

                  <div className="mt-5 inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                    {module.algorithm}
                  </div>

                  <div className="mt-7 flex items-center text-sm font-medium text-gray-400 transition-colors group-hover:text-violet-300">
                    Explore module

                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* =====================================================
            CALL TO ACTION
        ===================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: 30,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.9,
          }}
          className="relative mt-24 overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-500/[0.08] to-blue-500/[0.08] p-8 text-center backdrop-blur-xl md:p-12"
        >
          <div className="absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 rounded-full bg-violet-500/10 blur-[100px]" />

          <div className="relative">
            <Sparkles className="mx-auto mb-4 h-7 w-7 text-violet-400" />

            <h3 className="text-2xl font-semibold md:text-3xl">
              Ready to transform your data?
            </h3>

            <p className="mx-auto mt-3 max-w-xl text-gray-400">
              Launch the analytics dashboard and turn customer data
              into measurable business intelligence.
            </p>

            <Button
              type="button"
              size="lg"
              onClick={onLaunchDashboard}
              className="mt-7 rounded-full bg-violet-600 px-8 text-white shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-300 hover:scale-105 hover:bg-violet-500 hover:shadow-[0_0_45px_rgba(139,92,246,0.5)]"
            >
              Get Started

              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}

/* =========================================================
   STAT COMPONENT
========================================================= */

function Stat({
  icon: Icon,
  value,
  label,
}: StatProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-center backdrop-blur-xl">
      <Icon className="mx-auto mb-3 h-5 w-5 text-violet-400" />

      <p className="text-xl font-semibold">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {label}
      </p>
    </div>
  );
}