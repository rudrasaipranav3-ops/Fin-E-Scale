"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";

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

type AnalyticsModule = {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
  algorithm: string;
  href: string;
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
    href: "/dashboard/segmentation",
  },
  {
    number: "02",
    title: "Churn Prediction",
    description:
      "Identify customers at risk of leaving and uncover the behavioral factors driving churn.",
    icon: HeartCrack,
    algorithm: "XGBoost",
    href: "/dashboard/churn",
  },
  {
    number: "03",
    title: "Customer Lifetime Value",
    description:
      "Estimate the future value of every customer and prioritize high-value relationships.",
    icon: TrendingUp,
    algorithm: "Regression",
    href: "/dashboard/clv",
  },
  {
    number: "04",
    title: "Market Basket Analysis",
    description:
      "Discover products frequently purchased together and reveal valuable cross-selling opportunities.",
    icon: ShoppingBasket,
    algorithm: "Apriori",
    href: "/dashboard/basket",
  },
  {
    number: "05",
    title: "Product Recommendations",
    description:
      "Deliver personalized product suggestions using customer behavior and purchase history.",
    icon: Target,
    algorithm: "Collaborative Filtering",
    href: "/dashboard/recommendations",
  },
  {
    number: "06",
    title: "Sales Forecasting",
    description:
      "Forecast future demand and revenue trends using historical e-commerce sales data.",
    icon: ChartNoAxesCombined,
    algorithm: "XGBoost / Time Series",
    href: "/dashboard/forecast",
  },
];

/* =========================================================
   PAGE
========================================================= */

export default function ExplorePage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      {/* =====================================================
          THREE.JS PARTICLE BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0 z-0 opacity-50">
        <NeonParticlesCanvas />
      </div>

      {/* =====================================================
          BACKGROUND GLOWS
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
        <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[150px]" />

        <div className="absolute -right-40 top-[40%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[150px]" />

        <div className="absolute bottom-0 left-1/2 h-[350px] w-[600px] -translate-x-1/2 rounded-full bg-violet-500/5 blur-[150px]" />
      </div>

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <motion.nav
        initial={{
          opacity: 0,
          y: -20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.6,
        }}
        className="
          relative
          z-20
          mx-auto
          flex
          max-w-7xl
          items-center
          justify-between
          px-6
          py-7
          lg:px-8
        "
      >
        {/* Logo */}

        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-3"
          aria-label="Go to home page"
        >
          <div
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              border
              border-violet-500/30
              bg-violet-500/10
              shadow-[0_0_25px_rgba(139,92,246,0.2)]
            "
          >
            <BrainCircuit className="h-5 w-5 text-violet-400" />
          </div>

          <div className="text-left">
            <p className="font-semibold tracking-wide">
              E-Commerce AI
            </p>

            <p className="text-xs text-gray-500">
              Customer Intelligence
            </p>
          </div>
        </button>

        <Button
          variant="outline"
          onClick={() => router.push("/")}
          className="
            rounded-full
            border-white/10
            bg-white/5
            text-gray-300
            backdrop-blur-xl
            hover:bg-white/10
            hover:text-white
          "
        >
          <ArrowLeft className="mr-2 h-4 w-4" />

          Home
        </Button>
      </motion.nav>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-16 lg:px-8">
        {/* ===================================================
            HERO
        =================================================== */}

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
              duration: 0.5,
            }}
            className="
              mx-auto
              mb-6
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-violet-500/30
              bg-violet-500/10
              px-4
              py-2
              text-sm
              text-violet-300
              backdrop-blur-xl
            "
          >
            <Sparkles className="h-4 w-4" />

            AI Analytics Suite
          </motion.div>

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
              duration: 0.7,
              delay: 0.1,
            }}
            className="
              text-4xl
              font-bold
              tracking-tight
              sm:text-5xl
              lg:text-6xl
            "
          >
            Explore the Intelligence
            <br />

            <span
              className="
                bg-gradient-to-r
                from-violet-400
                via-purple-400
                to-blue-500
                bg-clip-text
                text-transparent
              "
            >
              Behind Your Customers
            </span>
          </motion.h1>

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
              duration: 0.7,
              delay: 0.2,
            }}
            className="
              mx-auto
              mt-6
              max-w-2xl
              text-base
              leading-7
              text-gray-400
              sm:text-lg
            "
          >
            Turn raw e-commerce data into actionable intelligence
            with machine learning models built for customer analytics,
            recommendations, forecasting, and business growth.
          </motion.p>
        </div>

        {/* ===================================================
            STATS
        =================================================== */}

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
            duration: 0.7,
            delay: 0.35,
          }}
          className="
            mx-auto
            mt-14
            grid
            max-w-4xl
            grid-cols-2
            gap-3
            md:grid-cols-4
          "
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

        {/* ===================================================
            MODULE TITLE
        =================================================== */}

        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 0.5,
          }}
          className="mb-8 mt-24"
        >
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-violet-400">
            Analytics Modules
          </p>

          <h2 className="text-2xl font-semibold md:text-3xl">
            Everything you need to understand your customers
          </h2>
        </motion.div>

        {/* ===================================================
            ANALYTICS CARDS
        =================================================== */}

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module, index) => {
            const Icon: LucideIcon = module.icon;

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
                  delay: 0.5 + index * 0.08,
                }}
                whileHover={{
                  y: -6,
                }}
                onClick={() => router.push(module.href)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();
                    router.push(module.href);
                  }
                }}
                className="
                  group
                  relative
                  cursor-pointer
                  overflow-hidden
                  rounded-2xl
                  border
                  border-white/10
                  bg-white/[0.035]
                  p-6
                  backdrop-blur-xl
                  transition-colors
                  duration-300
                  hover:border-violet-500/40
                  hover:bg-white/[0.06]
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-violet-500/60
                "
              >
                {/* Hover glow */}

                <div
                  className="
                    pointer-events-none
                    absolute
                    -right-20
                    -top-20
                    h-48
                    w-48
                    rounded-full
                    bg-violet-500/0
                    blur-[80px]
                    transition-all
                    duration-500
                    group-hover:bg-violet-500/20
                  "
                />

                {/* Top */}

                <div className="relative flex items-start justify-between">
                  <div
                    className="
                      flex
                      h-12
                      w-12
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-violet-500/20
                      bg-violet-500/10
                      transition-all
                      duration-300
                      group-hover:border-violet-400/40
                      group-hover:bg-violet-500/20
                      group-hover:shadow-[0_0_25px_rgba(139,92,246,0.2)]
                    "
                  >
                    <Icon className="h-6 w-6 text-violet-400" />
                  </div>

                  <span className="font-mono text-sm text-gray-600">
                    {module.number}
                  </span>
                </div>

                {/* Content */}

                <div className="relative mt-7">
                  <h3 className="text-xl font-semibold text-white">
                    {module.title}
                  </h3>

                  <p className="mt-3 min-h-[72px] text-sm leading-6 text-gray-400">
                    {module.description}
                  </p>

                  {/* Algorithm */}

                  <div
                    className="
                      mt-5
                      inline-flex
                      rounded-full
                      border
                      border-blue-500/20
                      bg-blue-500/10
                      px-3
                      py-1
                      text-xs
                      font-medium
                      text-blue-300
                    "
                  >
                    {module.algorithm}
                  </div>

                  {/* CTA */}

                  <div
                    className="
                      mt-7
                      flex
                      items-center
                      text-sm
                      font-medium
                      text-gray-400
                      transition-colors
                      group-hover:text-violet-300
                    "
                  >
                    Explore module

                    <ArrowRight
                      className="
                        ml-2
                        h-4
                        w-4
                        transition-transform
                        duration-300
                        group-hover:translate-x-1
                      "
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ===================================================
            BOTTOM CTA
        =================================================== */}

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
            duration: 0.7,
            delay: 1,
          }}
          className="
            relative
            mt-24
            overflow-hidden
            rounded-3xl
            border
            border-violet-500/20
            bg-gradient-to-r
            from-violet-500/[0.08]
            to-blue-500/[0.08]
            p-8
            text-center
            backdrop-blur-xl
            md:p-12
          "
        >
          <div className="absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 rounded-full bg-violet-500/10 blur-[100px]" />

          <div className="relative">
            <Sparkles className="mx-auto mb-4 h-7 w-7 text-violet-400" />

            <h2 className="text-2xl font-semibold md:text-3xl">
              Ready to transform your data?
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-gray-400">
              Open the analytics dashboard and start converting
              customer data into measurable business intelligence.
            </p>

            <Button
              size="lg"
              onClick={() => router.push("/dashboard")}
              className="
                mt-7
                rounded-full
                bg-violet-600
                px-8
                text-white
                shadow-[0_0_30px_rgba(139,92,246,0.3)]
                transition-all
                hover:scale-105
                hover:bg-violet-500
                hover:shadow-[0_0_45px_rgba(139,92,246,0.5)]
              "
            >
              Launch Dashboard

              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </section>
    </main>
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
    <div
      className="
        rounded-2xl
        border
        border-white/10
        bg-white/[0.035]
        p-5
        text-center
        backdrop-blur-xl
      "
    >
      <Icon className="mx-auto mb-3 h-5 w-5 text-violet-400" />

      <p className="text-xl font-semibold text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {label}
      </p>
    </div>
  );
}