import { useTrafficSystem } from './hooks/useTrafficSystem';
import { IntersectionView } from './components/IntersectionView';
import { ControlPanel } from './components/ControlPanel';
import { Dashboard } from './components/Dashboard';
import { Activity } from 'lucide-react';

function App() {
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

  const handleAddAmbulance = async (vehicleNumber: string, direction: 'north' | 'south' | 'east' | 'west') => {
    await addAmbulance(vehicleNumber, direction);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Activity className="w-10 h-10 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">
              Smart Traffic Management System
            </h1>
            <Activity className="w-10 h-10 text-green-400" />
          </div>
          <p className="text-gray-300 text-lg">
            GPS-Enabled Dynamic Traffic Control for Mangaluru
          </p>
          <div className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-900/30 rounded-full border border-blue-700/50">
            <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm text-gray-300">
              {isRunning ? 'System Active' : 'System Idle'}
            </span>
          </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-center">
              <IntersectionView
                currentSignal={intersection?.current_signal || 'north'}
                timer={intersection?.signal_timer || 0}
                trafficDensity={trafficDensity}
                ambulanceDirection={ambulances.length > 0 ? ambulances[0].direction : undefined}
                reason={ambulances.length > 0 ? 'ambulance_override' : undefined}
              />
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-4">Project Overview</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="text-gray-400">
                    <span className="font-medium text-white">Problem:</span> Traffic congestion due to fixed-timer signals
                  </div>
                  <div className="text-gray-400">
                    <span className="font-medium text-white">Solution:</span> Dynamic adaptive signal control
                  </div>
                  <div className="text-gray-400">
                    <span className="font-medium text-white">Key Feature:</span> Emergency vehicle priority override
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-gray-400">
                    <span className="font-medium text-white">Technology:</span> GPS tracking & real-time monitoring
                  </div>
                  <div className="text-gray-400">
                    <span className="font-medium text-white">Benefits:</span> Reduced wait times & fuel consumption
                  </div>
                  <div className="text-gray-400">
                    <span className="font-medium text-white">Impact:</span> Life-saving ambulance response
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <ControlPanel
              isRunning={isRunning}
              onToggle={toggleSimulation}
              trafficDensity={trafficDensity}
              onUpdateDensity={updateTrafficDensity}
              onAddAmbulance={handleAddAmbulance}
            />

            <Dashboard
              ambulances={ambulances}
              onDeactivateAmbulance={deactivateAmbulance}
            />
          </div>
        </div>

        <footer className="mt-8 text-center text-gray-400 text-sm">
          <p>Research Project: Smart Traffic Management for Urban Mobility</p>
          <p className="text-xs mt-1">Addressing traffic congestion & emergency response in Mangaluru</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
