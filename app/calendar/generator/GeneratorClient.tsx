'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { MEAL_TYPE_LABELS_LONG, MEAL_COURSE_ORDER } from '@/lib/meal-types';
import { generateMealPlans } from '@/app/actions/generator';
import {
  GENERATOR_MEAL_TYPES,
  GENERATOR_MEAL_COURSES,
  type GeneratorResult,
  type GeneratorMealType,
  type GeneratorMealCourse,
} from '@/lib/validators/generator';

// Métadonnées d'affichage : index Date.getDay() (1 = lundi, 0 = dimanche)
const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 0, label: 'Dim' },
];

// Défauts de types de plats par type de repas
const DEFAULT_COURSES: Record<GeneratorMealType, GeneratorMealCourse[]> = {
  breakfast: ['entrée', 'boisson', 'dessert'],
  lunch: ['plat', 'accompagnement'],
  snack: ['dessert', 'boisson'],
  dinner: ['plat', 'accompagnement'],
};

const MEAL_COURSE_LABELS: Record<string, string> = {
  'apéritif': 'Apéritif',
  'entrée': 'Entrée',
  'plat': 'Plat principal',
  'accompagnement': 'Accompagnement',
  'dessert': 'Dessert',
  'boisson': 'Boisson',
};

// Date du jour au format YYYY-MM-DD, fuseau local du navigateur
function todayLocalStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface GeneratorClientProps {
  // Couverts par défaut (page de paramétrage)
  defaultServings: number;
}

export default function GeneratorClient({ defaultServings }: GeneratorClientProps) {
  const router = useRouter();

  const [startDate, setStartDate] = useState<string>(todayLocalStr());
  const [daysCount, setDaysCount] = useState<number>(7);
  const [weekdays, setWeekdays] = useState<number[]>(WEEKDAYS.map(d => d.value));
  const [mealTypes, setMealTypes] = useState<GeneratorMealType[]>(['lunch', 'dinner']);
  const [courses, setCourses] = useState<Record<GeneratorMealType, GeneratorMealCourse[]>>({ ...DEFAULT_COURSES });
  const [servings, setServings] = useState<number>(defaultServings);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [excludedTags, setExcludedTags] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [pending, setPending] = useState(false);

  const toggleInList = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter(v => v !== value) : [...list, value];

  const toggleWeekday = (value: number) => {
    setWeekdays(days => (days.includes(value) ? days.filter(d => d !== value) : [...days, value]));
  };

  const toggleCourse = (mealType: GeneratorMealType, course: GeneratorMealCourse) => {
    setCourses(current => {
      const list = current[mealType] ?? [];
      return {
        ...current,
        [mealType]: list.includes(course) ? list.filter(c => c !== course) : [...list, course],
      };
    });
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    // Pré-contrôles légers (la validation Zod serveur reste autoritaire)
    if (weekdays.length === 0) {
      setError('Sélectionnez au moins un jour de la semaine');
      return;
    }
    if (mealTypes.length === 0) {
      setError('Sélectionnez au moins un type de repas');
      return;
    }
    for (const mealType of mealTypes) {
      if (!courses[mealType] || courses[mealType].length === 0) {
        setError(`Sélectionnez au moins un type de plat pour « ${MEAL_TYPE_LABELS_LONG[mealType]} »`);
        return;
      }
    }

    setPending(true);
    try {
      const res = await generateMealPlans({
        startDate,
        daysCount,
        weekdays,
        mealTypes,
        coursesByMealType: courses,
        servings,
        replaceExisting,
        excludedTags: excludedTags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0),
      });

      if (res.success) {
        setResult(res);
        // Recharger les données serveur (le calendrier est revalidé par l'action)
        router.refresh();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Une erreur est survenue');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Période */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="generator-start" className="block text-xs font-medium text-gray-600 mb-1">
            Date de début
          </label>
          <input
            id="generator-start"
            type="date"
            value={startDate}
            min={todayLocalStr()}
            onChange={e => setStartDate(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="generator-days" className="block text-xs font-medium text-gray-600 mb-1">
            Nombre de jours (1 à 30)
          </label>
          <input
            id="generator-days"
            type="number"
            min={1}
            max={30}
            value={daysCount}
            onChange={e => setDaysCount(Number(e.target.value))}
            required
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Jours de semaine concernés */}
      <div>
        <span className="block text-xs font-medium text-gray-600 mb-1">Jours concernés</span>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map(weekday => (
            <label
              key={weekday.value}
              className={`px-3 py-1.5 rounded border text-xs cursor-pointer transition-colors ${
                weekdays.includes(weekday.value)
                  ? 'bg-accent text-white border-accent'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={weekdays.includes(weekday.value)}
                onChange={() => toggleWeekday(weekday.value)}
              />
              {weekday.label}
            </label>
          ))}
        </div>
      </div>

      {/* Types de repas + types de plats autorisés */}
      <div>
        <span className="block text-xs font-medium text-gray-600 mb-1">Repas à planifier</span>
        <div className="space-y-2">
          {GENERATOR_MEAL_TYPES.map(mealType => {
            const checked = mealTypes.includes(mealType);
            return (
              <div
                key={mealType}
                className={`border rounded p-2 ${checked ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
              >
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setMealTypes(list => toggleInList(list, mealType))}
                  />
                  {MEAL_TYPE_LABELS_LONG[mealType]}
                </label>
                {checked && (
                  <div className="mt-1.5 ml-5 flex flex-wrap gap-1.5">
                    {GENERATOR_MEAL_COURSES.map(course => {
                      const courseChecked = (courses[mealType] ?? []).includes(course);
                      return (
                        <label
                          key={course}
                          className={`px-2 py-1 rounded border text-xs cursor-pointer transition-colors ${
                            courseChecked
                              ? 'bg-accent text-white border-accent'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={courseChecked}
                            onChange={() => toggleCourse(mealType, course)}
                          />
                          {MEAL_COURSE_LABELS[course]}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Couverts */}
      <div>
        <label htmlFor="generator-servings" className="block text-xs font-medium text-gray-600 mb-1">
          Couverts par repas
        </label>
        <input
          id="generator-servings"
          type="number"
          min={1}
          max={20}
          value={servings}
          onChange={e => setServings(Number(e.target.value))}
          required
          className="w-24 border border-gray-300 rounded px-2 py-1.5 text-sm"
        />
      </div>

      {/* Mode de génération */}
      <div>
        <span className="block text-xs font-medium text-gray-600 mb-1">Mode</span>
        <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={e => setReplaceExisting(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Remplacer les repas existants
            <span className="block text-xs text-orange-600 mt-0.5">
              Attention : supprime les repas déjà planifiés — y compris les notes
              libres — sur les créneaux concernés.
            </span>
          </span>
        </label>
        {!replaceExisting && (
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Mode par défaut : seuls les créneaux vides sont complétés.
          </p>
        )}
      </div>

      {/* Tags exclus */}
      <div>
        <label htmlFor="generator-tags" className="block text-xs font-medium text-gray-600 mb-1">
          Tags à exclure (optionnel, séparés par des virgules)
        </label>
        <input
          id="generator-tags"
          type="text"
          value={excludedTags}
          onChange={e => setExcludedTags(e.target.value)}
          placeholder="ex : poisson, végétarien"
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {result && result.success && (
        <div className="border border-gray-200 rounded p-3 bg-gray-50">
          <p className="text-sm text-gray-700 mb-2">{result.message}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white border border-gray-200 rounded p-2">
              <p className="text-lg font-bold text-gray-800">{result.created}</p>
              <p className="text-xs text-gray-500">Repas créés</p>
            </div>
            <div className="bg-white border border-gray-200 rounded p-2">
              <p className="text-lg font-bold text-gray-800">{result.skipped}</p>
              <p className="text-xs text-gray-500">Créneaux déjà pris</p>
            </div>
            <div className="bg-white border border-gray-200 rounded p-2">
              <p className="text-lg font-bold text-gray-800">{result.noRecipe}</p>
              <p className="text-xs text-gray-500">Sans recette compatible</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover text-sm disabled:opacity-50"
        >
          {pending ? 'Génération…' : 'Générer'}
        </button>
        {result?.success && (
          <a
            href="/calendar"
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 text-sm"
          >
            Voir le calendrier
          </a>
        )}
      </div>
    </form>
  );
}
