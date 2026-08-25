interface PantryManagerProps {
  // I'll have to pass it with react props later
}

export default function PantryManager({}: PantryManagerProps) {
  // Mock data - remove later
  const boxesForSale = 14;
  const boxesPersonal = 3;
  const looseEggs = 42;

  const potentialNewBoxes = Math.floor(looseEggs / 10);
  const remainingLoose = looseEggs % 10;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <h2 className="text-lg font-bold text-stone-900 mb-1">📦 Pantry Manager</h2>
        <p className="text-stone-500 text-sm mb-5">Real-time inventory of what's currently on the farm shelves.</p>

        <div className="grid grid-cols-1 gap-3">

          <div className="flex items-center justify-between p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Available for Sale</p>
              <p className="text-2xl font-bold text-emerald-900 mt-0.5">{boxesForSale} <span className="text-sm font-normal text-emerald-700">Boxes</span></p>
            </div>
            <span className="text-2xl">🥚</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Personal Kitchen Stock</p>
              <p className="text-2xl font-bold text-stone-800 mt-0.5">{boxesPersonal} <span className="text-sm font-normal text-stone-500">Boxes</span></p>
            </div>
            <span className="text-2xl">🍳</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-amber-50/60 rounded-xl border border-amber-100">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Loose Eggs Pool</p>
              <p className="text-2xl font-bold text-amber-900 mt-0.5">{looseEggs} <span className="text-sm font-normal text-amber-700">Eggs</span></p>
            </div>
            <span className="text-2xl">🪺</span>
          </div>

        </div>

        {potentialNewBoxes > 0 && (
          <div className="mt-5 p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 text-sm flex items-start space-x-3">
            <span className="text-base mt-0.5">💡</span>
            <div>
              <p className="font-semibold">Packing Assistant</p>
              <p className="text-blue-700 mt-0.5">
                You have enough loose eggs to pack <strong>{potentialNewBoxes} additional box{potentialNewBoxes > 1 ? 'es' : ''}</strong>, leaving {remainingLoose} loose egg{remainingLoose !== 1 ? 's' : ''}.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}