import { useTrafficSystem } from './hooks/useTrafficSystem';
import { ControlPanel } from './components/ControlPanel';
import { Dashboard } from './components/Dashboard';
import { IntersectionView } from './components/IntersectionView';
import { Activity } from 'lucide-react';

export default function App() {
  const {
    intersection,
    trafficDensity,
    ambulances,
    isRunning,
    updateTrafficDensity,
    addAmbulance,
    deactivateAmbulance,
    toggleSimulation,
  } = useTrafficSystem();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <header className="text-center mb-8">
        <div className="flex justify-center items-center gap-3 mb-2">
          <Activity className="text-blue-400 w-8 h-8" />
          <h1 className="text-3xl font-bold">Smart Traffic Management System</h1>
          <Activity className="text-green-400 w-8 h-8" />
        </div>
        <p className="text-gray-400">GPS-Enabled Dynamic Traffic Control for Mangaluru</p>
        <div className="mt-2 text-sm text-gray-300">
          Status: <span className={isRunning ? 'text-green-400' : 'text-red-400'}>
            {isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
      </header>

      <main className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col items-center space-y-6">
          <IntersectionView
            currentSignal={intersection?.current_signal || 'north'}
            timer={intersection?.signal_timer || 0}
            trafficDensity={trafficDensity}
            ambulanceDirection={ambulances[0]?.direction}
            reason={ambulances[0] ? 'ambulance_override' : undefined}
          />
        </div>

        <div className="space-y-6">
          <ControlPanel
            isRunning={isRunning}
            onToggle={toggleSimulation}
            trafficDensity={trafficDensity}
            onUpdateDensity={updateTrafficDensity}
            onAddAmbulance={addAmbulance}
          />
          <Dashboard ambulances={ambulances} onDeactivateAmbulance={deactivateAmbulance} />
        </div>
      </main>
    </div>
  );
}
