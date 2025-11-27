import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  orderBy, 
  Timestamp,
  deleteDoc,
  updateDoc,
  doc,
  writeBatch
} from 'firebase/firestore';
import { 
  Plus, 
  Calendar, 
  TrendingUp, 
  Dumbbell, 
  Save, 
  Trash2, 
  ChevronRight, 
  Clock,
  History,
  X,
  Wand2,
  Sparkles,
  Loader2,
  Brain,
  Bot,
  Minimize2,
  Maximize2,
  Timer,
  Play,
  Pause,
  RotateCcw,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  ArrowUpRight,
  StickyNote,
  Target,
  Edit2
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

// --- Firebase Configuration & Initialization ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Gemini API Helper ---
const callGemini = async (prompt, systemPrompt, jsonMode = false) => {
  const apiKey = ""; // Injected at runtime
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
  };

  let delay = 1000;
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (err) {
      if (i === 4) throw err;
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
};

// --- Helper Components ---

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isDestructive = false }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 scale-100 animate-scaleIn">
        <h3 className="font-bold text-lg text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-600 mb-6 text-sm">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-white shadow-md transition-colors ${isDestructive ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const RestTimer = ({ timeLeft, isActive, onToggle, onClose, onAdd, suggestionType }) => {
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xl border border-slate-700 animate-slideIn">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-orange-400 font-bold">
            <Timer size={20} />
            <span>Rest Timer</span>
          </div>
          {suggestionType && (
            <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">
              {suggestionType}
            </span>
          )}
        </div>
        <div className="text-3xl font-mono font-bold tracking-widest">
          {formatTime(timeLeft)}
        </div>
      </div>
      
      <div className="flex gap-2">
        <button 
          onClick={onToggle}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'bg-slate-700 hover:bg-slate-600' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {isActive ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button 
          onClick={onClose}
          className="flex-1 bg-red-900/50 hover:bg-red-900 text-red-200 py-2 rounded-lg flex items-center justify-center"
        >
          <X size={18} />
        </button>
        <button 
           onClick={() => onAdd(30)}
           className="bg-slate-700 px-3 rounded-lg text-xs font-bold hover:bg-slate-600"
        >
          +30s
        </button>
      </div>
    </div>
  );
};

// --- Main Components ---

const Navigation = ({ activeTab, setActiveTab, hasActiveWorkout }) => (
  <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center z-40 shadow-lg pb-safe ${hasActiveWorkout ? 'pb-20' : ''}`}>
    <button 
      onClick={() => setActiveTab('routines')}
      className={`flex flex-col items-center space-y-1 ${activeTab === 'routines' ? 'text-blue-600' : 'text-slate-400'}`}
    >
      <Dumbbell size={24} />
      <span className="text-xs font-medium">Workout</span>
    </button>
    <button 
      onClick={() => setActiveTab('history')}
      className={`flex flex-col items-center space-y-1 ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400'}`}
    >
      <History size={24} />
      <span className="text-xs font-medium">History</span>
    </button>
    <button 
      onClick={() => setActiveTab('progress')}
      className={`flex flex-col items-center space-y-1 ${activeTab === 'progress' ? 'text-blue-600' : 'text-slate-400'}`}
    >
      <TrendingUp size={24} />
      <span className="text-xs font-medium">Progress</span>
    </button>
  </nav>
);

const RoutinesView = ({ routines, onStartWorkout, onEditRoutine, onCreateRoutine, onDeleteRoutine, onGenerateDemoData, onOpenAIGenerator, isDemoMode, toggleDemoMode }) => {
  const [routineToDelete, setRoutineToDelete] = useState(null);

  return (
    <div className="p-4 space-y-6 pb-24">
      <header className="flex flex-col space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isDemoMode ? 'Demo Workouts' : 'My Workouts'}
            </h1>
            <p className="text-slate-500 text-sm">
              {isDemoMode ? 'Experimenting with sample data' : 'Ready to crush it today?'}
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              {isDemoMode && (
                <button 
                  onClick={onGenerateDemoData}
                  className="bg-purple-100 text-purple-600 p-2 rounded-full shadow-sm hover:bg-purple-200 transition-all"
                  title="Generate Demo Data"
                >
                  <Wand2 size={20} />
                </button>
              )}
              <button 
                onClick={onCreateRoutine}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-all"
              >
                <Plus size={24} />
              </button>
            </div>
            
            {/* Demo Toggle */}
            <button 
              onClick={toggleDemoMode}
              className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${isDemoMode ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}
            >
              {isDemoMode ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              {isDemoMode ? 'Demo Mode ON' : 'Demo Mode OFF'}
            </button>
          </div>
        </div>
        
        <button 
          onClick={onOpenAIGenerator}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-xl shadow-md flex items-center justify-between group hover:shadow-lg transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Sparkles size={20} className="text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">AI Routine Builder</p>
              <p className="text-xs text-indigo-100">Describe your goal, get a plan.</p>
            </div>
          </div>
          <ChevronRight className="text-white/70 group-hover:translate-x-1 transition-transform" size={20} />
        </button>
      </header>

      {routines.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <Dumbbell className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500 font-medium">No routines found</p>
          <p className="text-slate-400 text-sm mb-4">
            {isDemoMode ? "Tap the wand to generate data." : "Create a routine or use AI."}
          </p>
          <button 
            onClick={onCreateRoutine}
            className="text-blue-600 font-semibold text-sm hover:underline"
          >
            + Create Routine
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {routines.map(routine => (
            <div key={routine.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3 group">
              <div className="flex justify-between items-start">
                <div className="flex-1 cursor-pointer" onClick={() => onStartWorkout(routine)}>
                  <h3 className="font-bold text-lg text-slate-800">{routine.name}</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    {routine.exercises?.length || 0} Exercises
                  </p>
                </div>
                <div className="flex items-center space-x-1 pl-4 border-l border-slate-100 ml-4">
                  <button 
                    onClick={() => onStartWorkout(routine)}
                    className="bg-blue-50 text-blue-600 p-2 rounded-full hover:bg-blue-100 transition-colors mr-2"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEditRoutine(routine); }}
                    className="text-slate-300 hover:text-blue-500 transition-colors p-2"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setRoutineToDelete(routine); }}
                    className="text-slate-300 hover:text-red-500 transition-colors p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              {routine.notes && (
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-2 items-start">
                  <StickyNote size={14} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 italic line-clamp-2">{routine.notes}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-1">
                {routine.exercises?.slice(0, 3).map((ex, i) => (
                  <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                    {typeof ex === 'string' ? ex : ex.name}
                  </span>
                ))}
                {(routine.exercises?.length > 3) && (
                  <span className="text-xs text-slate-400 px-1 py-1">+{routine.exercises.length - 3} more</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Confirmation Modal for Deletion */}
      <ConfirmationModal 
        isOpen={!!routineToDelete}
        title="Delete Routine?"
        message={`Are you sure you want to delete "${routineToDelete?.name}"? This action cannot be undone.`}
        onConfirm={() => { onDeleteRoutine(routineToDelete.id); setRoutineToDelete(null); }}
        onCancel={() => setRoutineToDelete(null)}
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};

const RoutineCreator = ({ onClose, onSave, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  
  // Handle parsing existing exercises or default empty one
  const parseExercises = (data) => {
    if (!data?.exercises) return [{ id: Date.now(), name: '', sets: '', reps: '', notes: '' }];
    return data.exercises.map(ex => {
      if (typeof ex === 'string') return { id: Math.random(), name: ex, sets: '', reps: '', notes: '' };
      return { ...ex, id: Math.random() };
    });
  };

  const [exercises, setExercises] = useState(parseExercises(initialData));

  const handleAddExercise = () => {
    setExercises([...exercises, { id: Date.now(), name: '', sets: '', reps: '', notes: '' }]);
  };

  const handleExerciseChange = (index, field, value) => {
    const newEx = [...exercises];
    newEx[index][field] = value;
    setExercises(newEx);
  };

  const handleRemoveExercise = (index) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const validExercises = exercises.filter(e => e.name.trim() !== '');
    if (!name.trim() || validExercises.length === 0) return;
    
    // Format for saving
    const formattedExercises = validExercises.map(e => ({
      name: e.name,
      sets: e.sets || '',
      reps: e.reps || '',
      notes: e.notes || ''
    }));

    onSave({ 
      name, 
      notes: notes.trim(),
      exercises: formattedExercises 
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[80vh] sm:rounded-2xl rounded-t-2xl flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-lg">{initialData ? 'Edit Routine' : 'New Routine'}</h2>
          <button onClick={onClose} className="p-2 bg-slate-200 rounded-full hover:bg-slate-300 transition"><X size={18}/></button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Routine Name</label>
            <input 
              type="text" 
              placeholder="e.g., Push Day, Legs" 
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Routine Notes (Optional)</label>
            <textarea 
              placeholder="e.g., Rest 2 mins between sets, Focus on form..." 
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm resize-none h-20"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Exercises</label>
            <div className="space-y-4">
              {exercises.map((ex, i) => (
                <div key={ex.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 animate-fadeIn relative group">
                  <div className="flex gap-2 mb-2">
                    <div className="flex-grow">
                      <input 
                        type="text" 
                        placeholder="Exercise Name"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                        value={ex.name}
                        onChange={e => handleExerciseChange(i, 'name', e.target.value)}
                      />
                    </div>
                    <div className="w-20">
                      <input 
                        type="text" 
                        placeholder="Sets"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-sm"
                        value={ex.sets}
                        onChange={e => handleExerciseChange(i, 'sets', e.target.value)}
                      />
                    </div>
                     <div className="w-20">
                      <input 
                        type="text" 
                        placeholder="Reps"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-sm"
                        value={ex.reps}
                        onChange={e => handleExerciseChange(i, 'reps', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <input 
                    type="text" 
                    placeholder="Exercise Note (e.g. Drop set last, Use green band)"
                    className="w-full p-2 bg-transparent border-b border-slate-200 focus:border-blue-400 outline-none text-xs text-slate-600 placeholder:text-slate-400"
                    value={ex.notes || ''}
                    onChange={e => handleExerciseChange(i, 'notes', e.target.value)}
                  />

                  {exercises.length > 1 && (
                    <button 
                      onClick={() => handleRemoveExercise(i)}
                      className="absolute -top-2 -right-2 bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-red-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button 
              onClick={handleAddExercise}
              className="mt-3 text-blue-600 text-sm font-medium hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus size={16} /> Add Exercise
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={handleSave}
            disabled={!name || exercises.filter(e => e.name.trim()).length === 0}
            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {initialData ? 'Save Changes' : 'Create Routine'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AIRoutineModal = ({ onClose, onSave }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');

    try {
      const systemPrompt = "You are an expert fitness coach. Create a workout routine based on the user's request. You MUST return valid JSON in the following format: { \"name\": \"Creative Routine Name\", \"notes\": \"Brief notes on focus/strategy\", \"exercises\": [{ \"name\": \"Exercise Name\", \"sets\": \"3\", \"reps\": \"12\", \"notes\": \"Optional tip\" }] }. Do not include any markdown formatting, code blocks, or explanations. Return ONLY the raw JSON string.";
      
      const rawResponse = await callGemini(prompt, systemPrompt, true);
      const cleanResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const routine = JSON.parse(cleanResponse);
      
      if (routine && routine.name && routine.exercises) {
        onSave(routine);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError("Failed to generate routine. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white relative overflow-hidden">
          <Sparkles className="absolute top-2 right-2 opacity-20" size={100} />
          <h2 className="font-bold text-xl relative z-10 flex items-center gap-2">
            <Bot size={24} /> AI Coach
          </h2>
          <p className="text-indigo-100 text-sm mt-1 relative z-10">
            Describe your goal, available time, or muscle group.
          </p>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white z-20">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">What kind of workout do you want?</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. '30 minute HIIT cardio', 'Chest and triceps for mass', or 'Leg day with no equipment'"
              className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none text-slate-700"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <button 
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" /> Generatinng Plan...
              </>
            ) : (
              <>
                <Sparkles size={20} /> Generate Routine
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ActiveWorkout = ({ routine, previousLogs, onFinish, onMinimize, onCancel }) => {
  // Handle legacy string exercises vs new object exercises
  const normalizeExercises = (exList) => {
    return exList.map(ex => {
      if (typeof ex === 'string') return { name: ex, sets: '', reps: '', notes: '' };
      return ex;
    });
  };

  const exercises = useMemo(() => normalizeExercises(routine.exercises), [routine.exercises]);

  const [logs, setLogs] = useState(
    exercises.map(ex => ({ 
      name: ex.name, 
      targetSets: ex.sets,
      targetReps: ex.reps,
      notes: ex.notes,
      sets: [{ weight: '', reps: '', completed: false }] 
    }))
  );
  const [startTime] = useState(Date.now());
  const [duration, setDuration] = useState(0);
  
  // Timer State
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [timerState, setTimerState] = useState({
    timeLeft: 0,
    isActive: false,
    label: null
  });

  // Confirm State
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  // AI Suggestions State
  const [aiSuggestions, setAiSuggestions] = useState({});
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);

  // Timer Effect
  useEffect(() => {
    let interval = null;
    if (timerState.isActive && timerState.timeLeft > 0) {
      interval = setInterval(() => {
        setTimerState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
    } else if (timerState.timeLeft === 0 && timerState.isActive) {
      setTimerState(prev => ({ ...prev, isActive: false }));
      // Optional: Play sound here
    }
    return () => clearInterval(interval);
  }, [timerState.isActive, timerState.timeLeft]);

  // Workout Duration Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  // AI Rest Time Suggestions Effect
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (suggestionsLoaded) return;
      
      const exerciseNames = exercises.map(ex => ex.name);
      const exerciseJson = JSON.stringify(exerciseNames);
      
      const prompt = `Analyze the following exercises array: ${exerciseJson}. Classify each as "Compound" or "Isolation". Return a JSON object where keys are the EXACT exercise names from the input array (verbatim) and values are recommended rest times in seconds (integer). Use 120-180s for compound, 60-90s for isolation. Example format: {"Bench Press": 180, "Curl": 60}`;
      const systemPrompt = "You are a strict JSON generator. You must use the EXACT exercise names provided in the prompt as the keys in your JSON response.";
      
      try {
        const response = await callGemini(prompt, systemPrompt, true);
        const cleanResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanResponse);
        setAiSuggestions(data);
      } catch (err) {
        console.error("AI Suggestion Error", err);
      } finally {
        setSuggestionsLoaded(true);
      }
    };
    fetchSuggestions();
  }, [exercises, suggestionsLoaded]);

  // Helper to get previous data
  const getPreviousStats = (exerciseName, setIndex) => {
    if (!previousLogs || previousLogs.length === 0) return null;
    
    // Find the most recent log that has this exercise
    const lastLog = previousLogs.find(log => 
      log.exercises.some(ex => ex.name === exerciseName)
    );

    if (!lastLog) return null;

    const exerciseData = lastLog.exercises.find(ex => ex.name === exerciseName);
    if (!exerciseData || !exerciseData.sets) return null;

    const set = exerciseData.sets[setIndex];
    
    if (set) {
      return { weight: set.weight, reps: set.reps };
    } 
    
    return null;
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const addSet = (exerciseIndex) => {
    const newLogs = [...logs];
    const previousSet = newLogs[exerciseIndex].sets[newLogs[exerciseIndex].sets.length - 1];
    newLogs[exerciseIndex].sets.push({ 
      weight: previousSet ? previousSet.weight : '', 
      reps: previousSet ? previousSet.reps : '', 
      completed: false 
    });
    setLogs(newLogs);
  };

  const updateSet = (exIndex, setIndex, field, value) => {
    const newLogs = [...logs];
    newLogs[exIndex].sets[setIndex][field] = value;
    setLogs(newLogs);
  };

  const toggleSetComplete = (exIndex, setIndex) => {
    const newLogs = [...logs];
    const isCompleting = !newLogs[exIndex].sets[setIndex].completed;
    newLogs[exIndex].sets[setIndex].completed = isCompleting;
    setLogs(newLogs);

    // Auto-start Timer Logic
    if (isCompleting) {
      const exerciseName = logs[exIndex].name;
      const suggestedTime = aiSuggestions[exerciseName] || 90; 
      const isCompound = suggestedTime >= 120;
      
      setTimerState({
        timeLeft: suggestedTime,
        isActive: true,
        label: isCompound ? 'Compound Set' : 'Isolation Set'
      });
      setShowRestTimer(true);
    }
  };

  const removeSet = (exIndex, setIndex) => {
    const newLogs = [...logs];
    if (newLogs[exIndex].sets.length > 1) {
      newLogs[exIndex].sets.splice(setIndex, 1);
      setLogs(newLogs);
    }
  };

  const handleFinish = () => {
    const finishedData = {
      routineId: routine.id,
      routineName: routine.name,
      duration,
      date: Timestamp.now(),
      exercises: logs.map(log => ({
        name: log.name,
        sets: log.sets.filter(s => s.completed || (s.weight && s.reps)) 
      }))
    };
    onFinish(finishedData);
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-[60] overflow-y-auto pb-safe flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 p-4 shadow-sm z-10 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-lg text-slate-900">{routine.name}</h2>
            <div className="flex items-center text-slate-500 text-xs font-mono mt-1">
              <Clock size={12} className="mr-1" />
              {formatTime(duration)}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowRestTimer(!showRestTimer)}
              className={`p-2 rounded-full transition-all ${showRestTimer ? 'bg-orange-100 text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Timer size={24} />
            </button>
            <button onClick={onMinimize} className="text-slate-400 hover:text-slate-600 p-2">
              <Minimize2 size={24} />
            </button>
          </div>
        </div>
        
        {routine.notes && (
          <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-2 items-start mt-1">
            <StickyNote size={14} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 italic">{routine.notes}</p>
          </div>
        )}
      </div>

      {/* Rest Timer Overlay */}
      {showRestTimer && (
        <div className="sticky top-[calc(73px+1rem)] z-20 px-4 pt-2 pb-4 bg-slate-50/90 backdrop-blur-sm">
          <RestTimer 
            timeLeft={timerState.timeLeft}
            isActive={timerState.isActive}
            suggestionType={timerState.label}
            onToggle={() => setTimerState(p => ({...p, isActive: !p.isActive}))}
            onClose={() => setShowRestTimer(false)}
            onAdd={(sec) => setTimerState(p => ({...p, timeLeft: p.timeLeft + sec}))}
          />
        </div>
      )}

      {/* Exercises */}
      <div className="p-4 space-y-6 flex-1 pb-32">
        {logs.map((exercise, exIndex) => (
          <div key={exIndex} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-700">{exercise.name}</h3>
                  {(exercise.targetSets || exercise.targetReps) && (
                     <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                       <Target size={12} /> Target: {exercise.targetSets || '?'} x {exercise.targetReps || '?'}
                     </p>
                  )}
                </div>
                {aiSuggestions[exercise.name] && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-100 text-indigo-600 uppercase tracking-wide">
                     {aiSuggestions[exercise.name] >= 120 ? 'Compound' : 'Isolation'}
                  </span>
                )}
              </div>
              
              {exercise.notes && (
                <p className="text-xs text-slate-500 bg-slate-100 p-2 rounded-md border border-slate-200 italic">
                  <span className="font-semibold not-italic text-slate-400 mr-1">Note:</span>
                  {exercise.notes}
                </p>
              )}
            </div>

            <div className="p-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-400 mb-2 px-2 text-center uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-3">lbs</div>
                <div className="col-span-3">Reps</div>
                <div className="col-span-3">Prev</div>
                <div className="col-span-2">Done</div>
              </div>
              {exercise.sets.map((set, setIndex) => {
                const prevStats = getPreviousStats(exercise.name, setIndex);
                return (
                  <div 
                    key={setIndex} 
                    className={`grid grid-cols-12 gap-2 items-center mb-2 px-2 py-2 rounded-lg transition-colors ${set.completed ? 'bg-green-50/50' : ''}`}
                  >
                    <div className="col-span-1 text-center text-slate-400 font-medium">{setIndex + 1}</div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder={prevStats ? prevStats.weight : "0"}
                        className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-center font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-300"
                        value={set.weight}
                        onChange={(e) => updateSet(exIndex, setIndex, 'weight', e.target.value)}
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder={prevStats ? prevStats.reps : "0"}
                        className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-center font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-300"
                        value={set.reps}
                        onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                      />
                    </div>
                    <div className="col-span-3 flex items-center justify-center text-xs text-slate-400 font-mono">
                       {prevStats ? (
                         <span className="flex flex-col items-center leading-tight">
                           <span>{prevStats.weight}lbs</span>
                           <span>x{prevStats.reps}</span>
                         </span>
                       ) : (
                         <span className="opacity-20">-</span>
                       )}
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <button
                        onClick={() => toggleSetComplete(exIndex, setIndex)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          set.completed 
                            ? 'bg-green-500 text-white shadow-green-200 shadow-md' 
                            : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {set.completed && <div className="w-2 h-4 border-r-2 border-b-2 border-white rotate-45 -mt-1"></div>}
                      </button>
                    </div>
                  </div>
                );
              })}
               <div className="flex justify-between items-center mt-2 px-1">
                 <button 
                    onClick={() => removeSet(exIndex, exercise.sets.length - 1)}
                    disabled={exercise.sets.length <= 1}
                    className="text-slate-300 hover:text-red-400 disabled:opacity-0 p-2"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button 
                    onClick={() => addSet(exIndex)}
                    className="flex-1 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus size={14} /> Add Set
                  </button>
               </div>
            </div>
          </div>
        ))}

        {/* Actions Footer */}
        <div className="space-y-3 mt-8">
          <button 
            onClick={handleFinish}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Save size={20} /> Finish Workout
          </button>
          
          <button 
            onClick={() => setShowCancelConfirm(true)}
            className="w-full bg-white border border-slate-200 text-red-500 font-semibold py-3 rounded-xl hover:bg-red-50 transition-all flex items-center justify-center gap-2"
          >
            <AlertCircle size={18} /> Cancel Workout
          </button>
        </div>
      </div>
      
      {/* Confirmation Modal for Cancel Workout */}
      <ConfirmationModal
        isOpen={showCancelConfirm}
        title="Cancel Workout?"
        message="Are you sure you want to cancel? No data will be saved and this cannot be undone."
        onConfirm={onCancel}
        onCancel={() => setShowCancelConfirm(false)}
        confirmText="Discard Workout"
        isDestructive={true}
      />
    </div>
  );
};

const HistoryView = ({ logs, isDemoMode }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <h1 className="text-2xl font-bold text-slate-800">
        {isDemoMode ? 'Demo History' : 'Workout History'}
      </h1>
      
      {logs.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <History className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500">No workouts logged yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map(log => (
            <div key={log.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{log.routineName}</h3>
                  <p className="text-slate-400 text-xs flex items-center gap-1 mt-1">
                    <Calendar size={12} /> {formatDate(log.date)}
                    <span className="mx-1">•</span>
                    <Clock size={12} /> {Math.floor(log.duration / 60)}m {log.duration % 60}s
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {log.exercises.map((ex, i) => (
                  <div key={i} className="text-sm flex justify-between border-b border-slate-50 pb-1 last:border-0">
                    <span className="text-slate-600 font-medium">{ex.name}</span>
                    <span className="text-slate-400 font-mono text-xs">
                       {ex.sets.length} sets • Best: {Math.max(...ex.sets.map(s => Number(s.weight) || 0))} lbs
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ProgressView = ({ logs }) => {
  const [insight, setInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  // Extract all unique exercise names
  const exerciseNames = useMemo(() => {
    const names = new Set();
    logs.forEach(log => log.exercises.forEach(ex => names.add(ex.name)));
    return Array.from(names).sort();
  }, [logs]);

  const [selectedExercise, setSelectedExercise] = useState(exerciseNames[0] || '');

  useEffect(() => {
    if (!exerciseNames.includes(selectedExercise) && exerciseNames.length > 0) {
      setSelectedExercise(exerciseNames[0]);
    }
  }, [exerciseNames, selectedExercise]);

  const chartData = useMemo(() => {
    if (!selectedExercise) return [];
    const data = [];
    const sortedLogs = [...logs].sort((a, b) => a.date.seconds - b.date.seconds);

    sortedLogs.forEach(log => {
      const ex = log.exercises.find(e => e.name === selectedExercise);
      if (ex) {
        const maxWeight = Math.max(...ex.sets.map(s => Number(s.weight) || 0));
        const volume = ex.sets.reduce((acc, s) => acc + ((Number(s.weight)||0) * (Number(s.reps)||0)), 0);

        if (maxWeight > 0) {
          data.push({
            date: new Date(log.date.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            weight: maxWeight,
            volume: volume
          });
        }
      }
    });
    return data;
  }, [selectedExercise, logs]);

  const handleGetInsight = async () => {
    if (logs.length === 0) return;
    setLoadingInsight(true);
    try {
      const recentLogs = logs.slice(0, 5).map(l => `${l.routineName} on ${new Date(l.date.seconds * 1000).toDateString()}: ${l.exercises.length} exercises`).join('; ');
      const prompt = `Here is my recent workout history: ${recentLogs}. I have done ${logs.length} total workouts.`;
      const systemPrompt = "You are a data-driven fitness coach. Analyze these workout logs briefly. Identify trends, consistency, or give motivation. Be friendly and concise (max 3 bullet points).";
      
      const response = await callGemini(prompt, systemPrompt, false);
      setInsight(response);
    } catch (e) {
      console.error(e);
      setInsight("Could not retrieve insights at this time.");
    } finally {
      setLoadingInsight(false);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <h1 className="text-2xl font-bold text-slate-800">Progress Tracker</h1>
      
      {/* AI Insight Card */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-indigo-100 p-5 rounded-xl shadow-sm">
        <div className="flex items-start gap-3">
          <div className="bg-white p-2 rounded-full shadow-sm text-indigo-600">
             <Brain size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-indigo-900">AI Coach Insights</h3>
            {!insight ? (
              <p className="text-sm text-indigo-700/80 mt-1">
                Get a personalized analysis of your training consistency and progress.
              </p>
            ) : (
               <div className="text-sm text-indigo-900 mt-2 prose prose-sm max-w-none">
                 {insight.split('\n').map((line, i) => <p key={i} className="mb-1">{line}</p>)}
               </div>
            )}
            
            {!insight && (
              <button 
                onClick={handleGetInsight}
                disabled={loadingInsight || logs.length === 0}
                className="mt-3 text-xs font-bold bg-white text-indigo-600 px-4 py-2 rounded-lg shadow-sm hover:bg-indigo-50 transition-colors flex items-center gap-2"
              >
                {loadingInsight ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {logs.length === 0 ? "Log workouts to unlock" : "Analyze My Progress"}
              </button>
            )}
          </div>
        </div>
      </div>

      {exerciseNames.length === 0 ? (
        <div className="bg-slate-50 p-6 rounded-xl text-center text-slate-500">
          No workout data available yet.
        </div>
      ) : (
        <>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Exercise</label>
            <div className="relative">
              <select 
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg appearance-none font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {exerciseNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-3.5 text-slate-400 rotate-90 pointer-events-none" size={16} />
            </div>
          </div>

          {chartData.length > 0 ? (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-4">Max Weight Over Time</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{fontSize: 12, fill: '#94a3b8'}} 
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis 
                      tick={{fontSize: 12, fill: '#94a3b8'}} 
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#2563eb" 
                      strokeWidth={3}
                      dot={{fill: '#2563eb', r: 4, strokeWidth: 2, stroke: '#fff'}}
                      activeDot={{r: 6}}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-slate-500 uppercase">Current Max</p>
                  <p className="text-xl font-bold text-slate-800">{chartData[chartData.length-1].weight} lbs</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-slate-500 uppercase">All Time Best</p>
                  <p className="text-xl font-bold text-slate-800">{Math.max(...chartData.map(d => d.weight))} lbs</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              Not enough data to show chart for this exercise.
            </div>
          )}
        </>
      )}
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [routines, setRoutines] = useState([]);
  const [logs, setLogs] = useState([]);
  
  const [activeTab, setActiveTab] = useState('routines');
  const [showCreator, setShowCreator] = useState(false);
  const [showAICreator, setShowAICreator] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null); // Holds routine data to edit
  
  const [activeRoutine, setActiveRoutine] = useState(null); 
  const [isWorkoutMinimized, setIsWorkoutMinimized] = useState(false);
  
  const [isDemoMode, setIsDemoMode] = useState(false);

  // 1. Authentication
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Fetch Data
  useEffect(() => {
    if (!user) return;

    const routineCollectionName = isDemoMode ? 'demo_routines' : 'routines';
    const logsCollectionName = isDemoMode ? 'demo_logs' : 'logs';

    const routinesQuery = query(collection(db, 'artifacts', appId, 'users', user.uid, routineCollectionName), orderBy('createdAt', 'desc'));
    const logsQuery = query(collection(db, 'artifacts', appId, 'users', user.uid, logsCollectionName), orderBy('date', 'desc'));

    const unsubRoutines = onSnapshot(routinesQuery, 
      (snapshot) => setRoutines(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Routines error", err)
    );
    
    const unsubLogs = onSnapshot(logsQuery, 
      (snapshot) => setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Logs error", err)
    );

    return () => {
      unsubRoutines();
      unsubLogs();
    };
  }, [user, isDemoMode]);

  // 3. Handlers
  const handleSaveRoutine = async (routineData) => {
    if (!user) return;
    const collectionName = isDemoMode ? 'demo_routines' : 'routines';
    
    if (editingRoutine) {
      // Update existing
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, collectionName, editingRoutine.id), {
        ...routineData
      });
    } else {
      // Create new
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, collectionName), {
        ...routineData,
        createdAt: Timestamp.now()
      });
    }
    
    setShowCreator(false);
    setShowAICreator(false);
    setEditingRoutine(null);
  };

  const handleEditRoutine = (routine) => {
    setEditingRoutine(routine);
    setShowCreator(true);
  };

  const handleDeleteRoutine = async (id) => {
    if (!user) return;
    const collectionName = isDemoMode ? 'demo_routines' : 'routines';
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, collectionName, id));
  };

  const handleFinishWorkout = async (logData) => {
    if (!user) return;
    const collectionName = isDemoMode ? 'demo_logs' : 'logs';
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, collectionName), logData);
    setActiveRoutine(null);
    setIsWorkoutMinimized(false);
    setActiveTab('history'); 
  };

  const handleGenerateDemoData = async () => {
    if (!user || !isDemoMode) return;
    const batch = writeBatch(db);
    
    const routineRef1 = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'demo_routines'));
    batch.set(routineRef1, {
      name: 'Push Day',
      notes: 'Focus on heavy compounds first, then isolation.',
      exercises: [
        { name: 'Bench Press', sets: 3, reps: 8, notes: 'Keep elbows tucked' },
        { name: 'Overhead Press', sets: 3, reps: 10, notes: 'Dont arch back too much' },
        { name: 'Tricep Extension', sets: 3, reps: 12, notes: 'Squeeze at the bottom' }
      ],
      createdAt: Timestamp.now()
    });

    const routineRef2 = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'demo_routines'));
    batch.set(routineRef2, {
      name: 'Leg Day',
      notes: 'Keep rest times under 2 minutes.',
      exercises: [
        { name: 'Squat', sets: 4, reps: 6, notes: 'Go below parallel' },
        { name: 'Lunge', sets: 3, reps: 10 },
        { name: 'Calf Raise', sets: 4, reps: 15, notes: 'Pause at the top' }
      ],
      createdAt: Timestamp.now()
    });

    const today = new Date();
    for (let i = 0; i < 10; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (i * 3));

      const logRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'demo_logs'));
      const benchWeight = 135 + (10 - i) * 5; 
      const squatWeight = 185 + (10 - i) * 10;
      const isPush = i % 2 === 0;

      if (isPush) {
        batch.set(logRef, {
          routineName: 'Push Day',
          duration: 3600 + Math.floor(Math.random() * 600),
          date: Timestamp.fromDate(date),
          exercises: [
            {
              name: 'Bench Press',
              sets: [
                { weight: benchWeight, reps: 10, completed: true },
                { weight: benchWeight, reps: 10, completed: true },
                { weight: benchWeight, reps: 8, completed: true }
              ]
            },
            {
              name: 'Overhead Press',
              sets: [
                 { weight: Math.floor(benchWeight * 0.6), reps: 12, completed: true },
                 { weight: Math.floor(benchWeight * 0.6), reps: 10, completed: true }
              ]
            }
          ]
        });
      } else {
         batch.set(logRef, {
          routineName: 'Leg Day',
          duration: 4200 + Math.floor(Math.random() * 600),
          date: Timestamp.fromDate(date),
          exercises: [
            {
              name: 'Squat',
              sets: [
                { weight: squatWeight, reps: 8, completed: true },
                { weight: squatWeight, reps: 8, completed: true },
                { weight: squatWeight, reps: 8, completed: true }
              ]
            }
          ]
        });
      }
    }
    await batch.commit();
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-safe">
      {/* Main Content Area */}
      <main className="max-w-md mx-auto bg-white min-h-screen shadow-2xl relative">
        {activeTab === 'routines' && (
          <RoutinesView 
            routines={routines} 
            onStartWorkout={(r) => { setActiveRoutine(r); setIsWorkoutMinimized(false); }} 
            onEditRoutine={handleEditRoutine}
            onCreateRoutine={() => { setEditingRoutine(null); setShowCreator(true); }}
            onOpenAIGenerator={() => setShowAICreator(true)}
            onDeleteRoutine={handleDeleteRoutine}
            onGenerateDemoData={handleGenerateDemoData}
            isDemoMode={isDemoMode}
            toggleDemoMode={() => !activeRoutine && setIsDemoMode(!isDemoMode)} 
          />
        )}
        {activeTab === 'history' && <HistoryView logs={logs} isDemoMode={isDemoMode} />}
        {activeTab === 'progress' && <ProgressView logs={logs} />}
      
        {/* Modals */}
        {showCreator && (
          <RoutineCreator 
            initialData={editingRoutine}
            onClose={() => { setShowCreator(false); setEditingRoutine(null); }} 
            onSave={handleSaveRoutine} 
          />
        )}

        {showAICreator && (
          <AIRoutineModal
            onClose={() => setShowAICreator(false)}
            onSave={handleSaveRoutine}
          />
        )}

        {/* Active Workout Overlay */}
        {activeRoutine && (
          <div className={isWorkoutMinimized ? 'hidden' : 'block'}>
            <ActiveWorkout 
              routine={activeRoutine} 
              previousLogs={logs}
              onFinish={handleFinishWorkout} 
              onCancel={() => { setActiveRoutine(null); setIsWorkoutMinimized(false); }}
              onMinimize={() => setIsWorkoutMinimized(true)}
            />
          </div>
        )}

        {/* Minimized Workout Bar */}
        {activeRoutine && isWorkoutMinimized && (
          <div 
            onClick={() => setIsWorkoutMinimized(false)}
            className="fixed bottom-24 left-4 right-4 bg-blue-600 text-white p-4 rounded-xl shadow-xl z-50 flex justify-between items-center animate-bounce-in cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="text-xs font-bold text-blue-200 uppercase">Workout in Progress</span>
              <span className="font-bold">{activeRoutine.name}</span>
            </div>
            <Maximize2 size={24} />
          </div>
        )}

        {/* Navigation */}
        <Navigation 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          hasActiveWorkout={activeRoutine && isWorkoutMinimized}
        />
      </main>
    </div>
  );
}