import { Link } from 'react-router-dom';
import { Building2, MapPin, Navigation, Search, Sparkles, Zap } from 'lucide-react';
import { Button, Card, CardContent } from '../components/ui';

const features = [
  {
    icon: MapPin,
    title: 'Real-time availability',
    description: 'See live open spaces at approved facilities across Addis Ababa before you drive.',
  },
  {
    icon: Sparkles,
    title: 'AI-ranked options',
    description: 'A transparent scoring model ranks lots by distance, price, availability and traffic.',
  },
  {
    icon: Navigation,
    title: 'Turn-by-turn navigation',
    description: 'Get guided straight to your chosen facility on an interactive MapLibre map.',
  },
];

export function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50 to-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1.5 text-sm font-semibold text-orange-700">
            <Zap className="h-4 w-4" /> Smart City Parking for Addis Ababa
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
            Find the right parking, <span className="text-orange-600">faster</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">
            ParkWise helps drivers discover nearby approved parking, compare price, distance and
            congestion, and navigate there — no account required to start.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/map">
              <Button size="lg">
                <Search className="h-5 w-5" /> Find parking now
              </Button>
            </Link>
            <Link to="/register/driver">
              <Button size="lg" variant="outline">
                Create a free account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent>
                <div className="mb-4 inline-flex rounded-xl bg-orange-100 p-3 text-orange-600">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{f.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <Card className="overflow-hidden bg-gray-900">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center md:flex-row md:justify-between md:text-left">
            <div>
              <div className="mb-2 inline-flex rounded-xl bg-white/10 p-2 text-orange-400">
                <Building2 className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">Own a parking facility?</h2>
              <p className="mt-1 max-w-xl text-gray-300">
                Register your facility, manage parking administrators, and reach drivers once a
                system administrator approves your listing.
              </p>
            </div>
            <Link to="/register/facility-owner">
              <Button size="lg">Register your facility</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
