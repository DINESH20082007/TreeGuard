import { Link } from 'react-router';

const features = [
  { icon: '📷', title: 'Capture', desc: 'Photograph any tree showing signs of distress, damage, or disease using your phone.' },
  { icon: '🤖', title: 'Analyze', desc: 'Our AI assesses the image for potential health indicators and structural risks.' },
  { icon: '⚠️', title: 'Prioritize', desc: 'Reports are ranked by severity, location risk, and proximity to infrastructure.' },
  { icon: '🚨', title: 'Respond', desc: 'Field inspectors receive assignments and update status in real time.' },
];

const stats = [
  { value: '14,200+', label: 'Trees monitored' },
  { value: '98.2%', label: 'Detection accuracy' },
  { value: '4.1 hrs', label: 'Avg. emergency response' },
  { value: '23 cities', label: 'Active deployments' },
];

const testimonials = [
  {
    quote: "TreeGuard flagged a structurally compromised oak near our school three weeks before it would have fallen. That's exactly what we needed.",
    name: 'Director of Parks & Recreation',
    org: 'City of Oakdale',
  },
  {
    quote: 'The emergency detection workflow is streamlined and accurate. Our inspectors spend less time triage and more time in the field.',
    name: 'Field Operations Lead',
    org: 'Metro Urban Forestry Division',
  },
  {
    quote: "As a resident, reporting a dangerous tree used to mean calling a hotline and waiting. Now it takes 90 seconds and I can track every update.",
    name: 'Community Member',
    org: 'Capitol Hill Neighborhood Association',
  },
];

export default function Landing() {
  return (
    <div className="bg-white">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-forest-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            <span className="text-forest-900 font-display text-xl">TreeGuard</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#how-it-works" className="hover:text-forest-700 transition-colors">How it works</a>
            <a href="#features" className="hover:text-forest-700 transition-colors">Features</a>
            <a href="#organizations" className="hover:text-forest-700 transition-colors">Organizations</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-600 hover:text-forest-700 font-medium px-3 py-2 rounded-lg transition-colors">Sign in</Link>
            <Link to="/register" className="text-sm bg-forest-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-forest-800 transition-colors">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden bg-gradient-to-br from-forest-900 via-forest-800 to-forest-700">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1448375240586-882707db888b?w=1400&fit=crop&auto=format')] bg-cover bg-center" />
        <div className="max-w-6xl mx-auto relative">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 bg-forest-700/60 text-forest-200 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-forest-600/40">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              AI-powered monitoring active in 23 cities
            </span>
            <h1 className="font-display text-5xl lg:text-6xl text-white leading-tight mb-6">
              Protect Every Tree.<br />
              <span className="text-forest-300">Respond Before<br />It's Too Late.</span>
            </h1>
            <p className="text-forest-100 text-lg leading-relaxed mb-10 max-w-xl">
              TreeGuard uses AI, location intelligence, and real-world monitoring to help communities identify tree health risks and respond to dangerous tree conditions before they become emergencies.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/app/report"
                className="bg-white text-forest-800 px-6 py-3 rounded-lg font-semibold hover:bg-forest-50 transition-colors text-sm"
              >
                Report a Tree
              </Link>
              <Link
                to="/app/map"
                className="border border-forest-300/60 text-white px-6 py-3 rounded-lg font-semibold hover:bg-forest-700/60 transition-colors text-sm"
              >
                Explore Tree Map
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-semibold text-forest-800 mb-1">{s.value}</p>
                <p className="text-gray-500 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-forest-600 text-sm font-medium uppercase tracking-wider mb-3">How it works</p>
            <h2 className="font-display text-4xl text-gray-900 mb-4">From concern to resolution in minutes</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Four simple steps connect communities to the resources needed to protect urban trees.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <div key={f.title} className="relative">
                {i < 3 && <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gray-200 z-0" />}
                <div className="relative z-10 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="w-12 h-12 rounded-xl bg-forest-50 border border-forest-100 flex items-center justify-center text-2xl mb-4">{f.icon}</div>
                  <div className="text-xs font-semibold text-forest-600 uppercase tracking-wider mb-2">Step {i + 1}</div>
                  <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Organizations */}
      <section id="organizations" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-forest-600 text-sm font-medium uppercase tracking-wider mb-3">For organizations</p>
            <h2 className="font-display text-4xl text-gray-900 mb-4">Command-level visibility</h2>
            <p className="text-gray-500 max-w-xl mx-auto">TreeGuard gives parks departments, universities, and municipalities a centralized operational dashboard for managing urban tree health at scale.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '📊', title: 'Real-time dashboards', desc: 'Fleet-level tree health across your jurisdiction at a glance. Sortable, filterable, exportable.' },
              { icon: '🗺️', title: 'Risk heat maps', desc: 'Visualize emergency concentrations and predict areas requiring proactive inspection.' },
              { icon: '👥', title: 'Field team coordination', desc: 'Assign inspectors to cases, track completion, and monitor response time SLAs.' },
            ].map((item) => (
              <div key={item.title} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl text-gray-900 mb-4">Trusted by communities</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-forest-600 text-2xl mb-4">"</div>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">{t.quote}</p>
                <div>
                  <p className="text-gray-900 font-medium text-sm">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.org}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-forest-800">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-4xl text-white mb-6">Ready to protect your urban forest?</h2>
          <p className="text-forest-200 mb-10 leading-relaxed">Join over 23 cities and thousands of citizens monitoring tree health in real time.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register" className="bg-white text-forest-800 px-6 py-3 rounded-lg font-semibold hover:bg-forest-50 transition-colors text-sm">
              Create free account
            </Link>
            <Link to="/app" className="border border-forest-400 text-white px-6 py-3 rounded-lg font-semibold hover:bg-forest-700 transition-colors text-sm">
              Explore platform
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-forest-900 border-t border-forest-800 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-forest-600 rounded-md flex items-center justify-center text-white text-xs font-bold">T</div>
                <span className="text-white font-display">TreeGuard</span>
              </div>
              <p className="text-forest-400 text-sm leading-relaxed">AI-powered urban tree health and emergency monitoring.</p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Tree Map', 'Emergency Detection', 'Dashboard'] },
              { title: 'Organization', links: ['About', 'Contact', 'Privacy', 'Terms'] },
              { title: 'Support', links: ['Help Center', 'API Docs', 'Status', 'Community'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-white text-sm font-semibold mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}><a href="#" className="text-forest-400 text-sm hover:text-forest-200 transition-colors">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-forest-800 pt-8 text-center">
            <p className="text-forest-500 text-sm">© 2026 TreeGuard. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
