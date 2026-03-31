import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Car, MapPin, ShieldCheck, Zap, ArrowRight, Star, Users, Building2 } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description, delay }: { icon: any, title: string, description: string, delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
    className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-orange-100 transition-all group"
  >
    <div className="bg-orange-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-600 transition-colors">
      <Icon className="h-7 w-7 text-orange-600 group-hover:text-white transition-colors" />
    </div>
    <h3 className="text-xl font-bold mb-3 text-gray-900">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </motion.div>
);

const LandingPage = () => {
  return (
    <div className="space-y-32 pb-20">
      {/* Hero Section */}
      <section className="relative pt-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center space-x-2 bg-orange-50 px-4 py-2 rounded-full text-orange-600 font-semibold text-sm">
              <Zap className="h-4 w-4" />
              <span>Smart Parking for Smart Cities</span>
            </div>
            <h1 className="text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
              Find Your Perfect <br />
              <span className="text-orange-600">Parking Spot</span> <br />
              in Seconds.
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-xl">
              ParkWise uses AI to recommend the best parking spots based on distance, price, and real-time traffic. Stop circling, start parking.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                to="/register"
                className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 hover:bg-orange-700 hover:scale-105 transition-all shadow-lg shadow-orange-200"
              >
                <span>Get Started</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/login"
                className="bg-white text-gray-900 border-2 border-gray-100 px-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 hover:border-orange-200 hover:bg-gray-50 transition-all"
              >
                <span>Sign In</span>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative"
          >
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-orange-100 rounded-full blur-3xl opacity-50" />
            <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-amber-100 rounded-full blur-3xl opacity-50" />
            <div className="relative rounded-[3rem] shadow-2xl border-8 border-white overflow-hidden bg-white">
              <img
                src="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&q=80&w=1000"
                alt="Smart City Parking"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-10 -right-10 bg-white p-6 rounded-3xl shadow-xl border border-gray-100 flex items-center space-x-4"
            >
              <div className="bg-green-100 p-3 rounded-2xl">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Available Spots</p>
                <p className="text-2xl font-bold text-gray-900">1,284+</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="space-y-16">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900">Why Choose ParkWise?</h2>
          <p className="text-lg text-gray-600">Our intelligent platform simplifies urban mobility for everyone.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={Zap}
            title="AI Recommendations"
            description="Our smart scoring model finds the optimal balance between distance, cost, and traffic conditions."
            delay={0.1}
          />
          <FeatureCard
            icon={MapPin}
            title="Real-Time Visibility"
            description="See live availability updates from parking facilities across the city on an interactive map."
            delay={0.2}
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Secure & Reliable"
            description="Verified parking facilities and secure user management ensure a trustworthy experience."
            delay={0.3}
          />
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-orange-600 rounded-[3rem] p-12 lg:p-20 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="grid md:grid-cols-3 gap-12 text-center relative z-10">
          <div className="space-y-2">
            <p className="text-5xl font-extrabold">15k+</p>
            <p className="text-orange-100 font-medium">Active Drivers</p>
          </div>
          <div className="space-y-2">
            <p className="text-5xl font-extrabold">200+</p>
            <p className="text-orange-100 font-medium">Parking Lots</p>
          </div>
          <div className="space-y-2">
            <p className="text-5xl font-extrabold">30%</p>
            <p className="text-orange-100 font-medium">Less Traffic Congestion</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center space-y-10 py-10">
        <h2 className="text-5xl font-bold text-gray-900 max-w-3xl mx-auto leading-tight">
          Ready to transform your <br /> parking experience?
        </h2>
        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <Link
            to="/register"
            className="bg-gray-900 text-white px-10 py-5 rounded-2xl font-bold text-xl hover:bg-black hover:scale-105 transition-all shadow-xl"
          >
            Join as a Driver
          </Link>
          <Link
            to="/register?role=admin"
            className="bg-white text-gray-900 border-2 border-gray-200 px-10 py-5 rounded-2xl font-bold text-xl hover:border-orange-600 hover:text-orange-600 transition-all"
          >
            Register Your Parking Lot
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
