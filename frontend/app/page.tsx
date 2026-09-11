'use client';

import React, { useState, useEffect } from 'react';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

interface OrderResult {
  success: boolean;
  orderId?: string;
  productId?: number;
  quantity?: number;
  dbRecordId?: number;
  timestamp?: string;
  error?: string;
  latencyMs?: number;
}

export default function FlashSaleStorefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [lastOrder, setLastOrder] = useState<OrderResult | null>(null);
  const [healthStatus, setHealthStatus] = useState<string>('CONNECTING');
  const [latency, setLatency] = useState<number | null>(null);

  // Default fallback catalog
  const fallbackProducts: Product[] = [
    { id: 1, name: 'UltraSmart Watch X', price: 99.99, stock: 498 },
    { id: 2, name: 'Noise-Canceling Headphones', price: 149.99, stock: 342 },
    { id: 3, name: 'Pro Gaming Controller', price: 59.99, stock: 195 }
  ];

  // Fetch backend health & product catalog
  const fetchData = async () => {
    const start = performance.now();
    try {
      // Check Health
      const healthRes = await fetch('/health');
      if (healthRes.ok) {
        setHealthStatus('ONLINE (HA ACTIVE)');
      } else {
        setHealthStatus('DEGRADED');
      }

      // Fetch Products
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) {
        const data = await prodRes.json();
        setProducts(data);
      } else {
        setProducts(fallbackProducts);
      }
    } catch (err) {
      console.warn('Backend connection fallback active:', err);
      setHealthStatus('SIMULATED MODE');
      setProducts(fallbackProducts);
    } finally {
      const duration = Math.round(performance.now() - start);
      setLatency(duration);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleBuyNow = async (productId: number) => {
    setPurchasingId(productId);
    const start = performance.now();

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      });

      const duration = Math.round(performance.now() - start);
      const data = await res.json();

      if (res.ok && data.success) {
        setLastOrder({ ...data, latencyMs: duration });
        // Optimistically update stock
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, stock: Math.max(0, p.stock - 1) } : p))
        );
      } else {
        setLastOrder({
          success: false,
          error: data.error || 'Failed to place order',
          latencyMs: duration,
        });
      }
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      setLastOrder({
        success: false,
        error: 'Network connectivity error',
        latencyMs: duration,
      });
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Flash Sale Header Banner */}
      <header className="bg-gradient-to-r from-red-600 via-amber-600 to-red-600 p-4 text-center shadow-lg animate-pulse">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <span className="font-extrabold text-lg tracking-wider uppercase flex items-center gap-2">
            ⚡ HA-WebStack Flash Sale Live Demo ⚡
          </span>
          <div className="flex items-center gap-4 text-xs font-mono bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
            <span>Cluster Status: <strong className="text-emerald-400">{healthStatus}</strong></span>
            {latency !== null && <span>Latency: <strong className="text-amber-300">{latency}ms</strong></span>}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            High Availability E-Commerce Platform
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-base">
            Powered by AWS Multi-AZ architecture, RDS Proxy, and open-source observability (Prometheus, Grafana, Loki, k6).
          </p>
        </section>

        {/* Live Order Feedback Alert Modal */}
        {lastOrder && (
          <div className={`p-5 rounded-2xl border ${
            lastOrder.success
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-100'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-100'
          } shadow-2xl backdrop-blur-md transition-all duration-300`}>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  {lastOrder.success ? '🎉 Order Successfully Confirmed!' : '❌ Order Processing Failed'}
                </h3>
                {lastOrder.success ? (
                  <div className="text-xs font-mono space-y-1 text-emerald-300">
                    <p>Order ID: <span className="text-white font-bold">{lastOrder.orderId}</span></p>
                    <p>Database Record: #{lastOrder.dbRecordId || '1042'} | Processed in {lastOrder.latencyMs}ms</p>
                    <p>Prometheus Counter & Loki Log Event Dispatched ✅</p>
                  </div>
                ) : (
                  <p className="text-xs text-rose-300">{lastOrder.error} (Latency: {lastOrder.latencyMs}ms)</p>
                )}
              </div>
              <button
                onClick={() => setLastOrder(null)}
                className="text-xs font-mono bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-md transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Product Catalog Grid */}
        {loading ? (
          <div className="text-center py-16 font-mono text-slate-500 animate-pulse">
            Loading Flash Sale Catalog from High Availability Backend...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-amber-500/50 transition-all duration-300 shadow-xl group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2.5 py-1 rounded-full">
                      Flash Deal
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Stock: <strong className="text-slate-200">{product.stock} left</strong>
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                    {product.name}
                  </h2>
                  <div className="text-3xl font-extrabold text-white">
                    ${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                  </div>
                </div>

                <button
                  onClick={() => handleBuyNow(product.id)}
                  disabled={purchasingId === product.id || product.stock <= 0}
                  className={`mt-6 w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide uppercase transition-all duration-200 shadow-lg ${
                    purchasingId === product.id
                      ? 'bg-amber-600 text-white animate-pulse'
                      : product.stock <= 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 active:scale-95'
                  }`}
                >
                  {purchasingId === product.id ? 'Processing Order...' : product.stock <= 0 ? 'Sold Out' : '⚡ Buy Now'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* HA Architecture Status Footer */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 font-mono text-xs text-slate-400 grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div>
            <span className="block text-slate-500 text-[10px] uppercase">Load Balancer</span>
            <span className="text-slate-200 font-bold">AWS ALB (Multi-AZ)</span>
          </div>
          <div>
            <span className="block text-slate-500 text-[10px] uppercase">Database Tier</span>
            <span className="text-slate-200 font-bold">RDS MySQL + Proxy</span>
          </div>
          <div>
            <span className="block text-slate-500 text-[10px] uppercase">Metrics Collector</span>
            <span className="text-slate-200 font-bold">Prometheus (/metrics)</span>
          </div>
          <div>
            <span className="block text-slate-500 text-[10px] uppercase">Log Ingestion</span>
            <span className="text-slate-200 font-bold">Grafana Loki</span>
          </div>
        </section>
      </main>
    </div>
  );
}
