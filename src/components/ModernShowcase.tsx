import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Sparkles, LayoutDashboard, Code, Zap, ArrowRight, BarChart3, Users, Clock } from 'lucide-react';

export default function ModernShowcase() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 },
    },
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-6 md:p-12 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header Section */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center space-y-4 pt-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            <span>AI-Generated Interface</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-neutral-500">
            Next-Gen Dashboard
          </h1>
          <p className="text-neutral-400 max-w-2xl mx-auto text-lg md:text-xl">
            A sleek, modern overview panel designed by AI, built for performance and perfectly integrated into your Next.js workflow.
          </p>
        </motion.header>

        {/* Bento Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Main Stat Card */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 relative group rounded-3xl p-8 bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 hover:border-neutral-700 transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-indigo-500/10 rounded-2xl">
                  <BarChart3 className="w-8 h-8 text-indigo-400" />
                </div>
                <span className="text-green-400 text-sm font-semibold flex items-center bg-green-400/10 px-2 py-1 rounded-lg">
                  +24.5% &uarr;
                </span>
              </div>
              <div>
                <h3 className="text-4xl font-bold mb-1">128,492</h3>
                <p className="text-neutral-400">Total API Requests</p>
              </div>
              <div className="h-32 w-full mt-4 flex items-end gap-2">
                {/* Simulated Chart Bars */}
                {[40, 70, 45, 90, 65, 85, 100, 60].map((height, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: i * 0.1, duration: 0.8, type: 'spring' }}
                    className="flex-1 bg-gradient-to-t from-indigo-500/20 to-indigo-500 rounded-t-md opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Side Cards */}
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="rounded-3xl p-6 bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 hover:border-neutral-700 transition-all group">
              <div className="flex justify-between items-center mb-4">
                <Users className="w-6 h-6 text-emerald-400" />
                <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
              </div>
              <h3 className="text-2xl font-bold">14,293</h3>
              <p className="text-neutral-400 text-sm">Active Users</p>
            </div>
            
            <div className="rounded-3xl p-6 bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 hover:border-neutral-700 transition-all group">
              <div className="flex justify-between items-center mb-4">
                <Clock className="w-6 h-6 text-amber-400" />
                <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
              </div>
              <h3 className="text-2xl font-bold">124ms</h3>
              <p className="text-neutral-400 text-sm">Avg. Response Time</p>
            </div>
          </motion.div>

          {/* Bottom Row */}
          <motion.div variants={itemVariants} className="rounded-3xl p-6 bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between">
            <LayoutDashboard className="w-8 h-8 text-neutral-300 mb-4" />
            <div>
              <h4 className="text-lg font-semibold mb-2">Modular Layout</h4>
              <p className="text-neutral-400 text-sm">Easily rearrange components to fit any screen size perfectly.</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="rounded-3xl p-6 bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between">
            <Code className="w-8 h-8 text-neutral-300 mb-4" />
            <div>
              <h4 className="text-lg font-semibold mb-2">Clean Code</h4>
              <p className="text-neutral-400 text-sm">Exported directly to React and Tailwind with zero technical debt.</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="rounded-3xl p-6 bg-gradient-to-br from-indigo-600 to-purple-600 border border-indigo-500/30 flex flex-col justify-between relative overflow-hidden group cursor-pointer">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Zap className="w-8 h-8 text-white mb-4 relative z-10" />
            <div className="relative z-10 flex justify-between items-end">
              <div>
                <h4 className="text-lg font-semibold text-white mb-1">Deploy Now</h4>
                <p className="text-indigo-200 text-sm">Push to production instantly.</p>
              </div>
              <div className="bg-white/20 p-2 rounded-full backdrop-blur-md group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-5 h-5 text-white" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
