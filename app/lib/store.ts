// Almacén en memoria con datos de ejemplo. Vive en globalThis para sobrevivir a la recarga en desarrollo.
// Se sustituirá por Postgres (replica-backend) sin tocar las pantallas: solo cambia lib/data.ts.

import { loadSnapshot, register } from "./persist";
import type { Assignment, ClassRoom, CorpusDoc, Feedback, Report, Submission, User } from "./types";

export interface Store {
  users: User[];
  classes: ClassRoom[];
  assignments: Assignment[];
  submissions: Submission[];
  corpus: CorpusDoc[];
  reports: Map<string, Report>;
  feedback: Map<string, Feedback>;
  seeded: boolean;
}

const g = globalThis as unknown as { __menteactiva?: Store };

interface StoreDump {
  users: User[]; classes: ClassRoom[]; assignments: Assignment[]; submissions: Submission[]; corpus: CorpusDoc[];
  reports: [string, Report][]; feedback: [string, Feedback][]; seeded: boolean;
}

export function store(): Store {
  if (!g.__menteactiva) {
    g.__menteactiva = {
      users: [],
      classes: [],
      assignments: [],
      submissions: [],
      corpus: [],
      reports: new Map(),
      feedback: new Map(),
      seeded: false,
    };
    const saved = loadSnapshot("store") as StoreDump | undefined;
    if (saved) {
      const st = g.__menteactiva;
      Object.assign(st, saved, { reports: new Map(saved.reports), feedback: new Map(saved.feedback) });
    }
    register("store", () => {
      const st = g.__menteactiva!;
      return { ...st, reports: [...st.reports], feedback: [...st.feedback] };
    });
  }
  return g.__menteactiva;
}

export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

// ---- textos de ejemplo (escritos para este proyecto) -----------------------------------------

export const DOC1 =
  "La memoria de trabajo permite mantener y manipular información durante breves periodos de tiempo. " +
  "Según los modelos más influyentes, este sistema se divide en componentes especializados que cooperan con la atención. " +
  "Un componente se ocupa del material verbal, otro del material visual y un tercero coordina ambos. " +
  "En el aula, esto significa que los estudiantes solo pueden sostener unas pocas ideas a la vez. " +
  "Por eso conviene presentar la información en pasos pequeños y comprobar que cada paso se ha entendido antes de continuar.";

export const DOC2 =
  "La evidencia reciente sugiere que la capacidad no es fija y varía con el entrenamiento sostenido a lo largo de las semanas. " +
  "Sin embargo, los beneficios observados tienden a limitarse a tareas muy parecidas a las practicadas durante el programa. " +
  "La transferencia hacia el rendimiento académico general sigue siendo objeto de debate entre los investigadores del campo.";

export const DOC3 =
  "Los estudios sobre hábitos de aprendizaje en entornos digitales muestran que las sesiones cortas y repetidas resultan más eficaces que una sola sesión larga antes del examen. " +
  "Planificar descansos y alternar materias ayuda a consolidar lo aprendido y reduce la fatiga durante el estudio.";

export const SEED_TEXTS = {
  ana:
    "La memoria de trabajo es una de las ideas que más me han ayudado a entender por qué estudiar de golpe funciona mal. " +
    "Cuando leo un capítulo entero sin parar, noto que a los veinte minutos ya no recuerdo cómo empezó. " +
    "Por eso conviene presentar la información en pasos pequeños y comprobar que cada paso se ha entendido antes de continuar. " +
    "En mi experiencia, hacer pausas breves y repasar con mis propias palabras me deja más tranquila ante los exámenes. " +
    "Mi conclusión es que aprender mejor depende más de organizar el tiempo que de estudiar muchas horas seguidas.",
  beto:
    "Este ensayo repasa algunas ideas sobre cómo aprendemos en la universidad y qué podemos mejorar. " +
    "Según los modelos más influyentes, este sistema se divide en componentes especializados que cooperan con la atención, y eso explica muchas dificultades. " +
    "La evidencia reciente sugiere que la capacidad no es fija y varía con el entrenamiento sostenido a lo largo de las semanas. " +
    "Los estudios sobre hábitos de aprendizaje en entornos digitales muestran que las sesiones cortas y repetidas resultan más eficaces que una sola sesión larga antes del examen. " +
    "Para terminar, creo que cada persona debe encontrar su propio ritmo y probar métodos distintos durante el curso.",
  carla:
    "Atención y entrenamiento son dos palabras que usamos mucho, pero pocas veces nos preguntamos qué significan en la práctica. " +
    "Para mí, atender es decidir qué ignorar, y entrenar es repetir algo con intención hasta que cuesta menos. " +
    "Durante este curso he probado a estudiar sin el móvil en la mesa y a escribir un resumen al final de cada sesión. " +
    "El cambio no fue inmediato, pero a las dos semanas noté que terminaba antes y con menos cansancio. " +
    "Creo que la clave está en la constancia y en ser honesta con lo que realmente funciona para cada uno.",
  david:
    "Resumo aquí lo esencial sobre cómo se organiza el aprendizaje. " +
    "La memoria de trabajo permite mantener y manipular información durante breves periodos de tiempo. " +
    "Según los modelos más influyentes, este sistema se divide en componentes especializados que cooperan con la atención. " +
    "Un componente se ocupa del material verbal, otro del material visual y un tercero coordina ambos. " +
    "Los estudios sobre hábitos de aprendizaje en entornos digitales muestran que las sesiones cortas y repetidas resultan más eficaces que una sola sesión larga antes del examen. " +
    "Planificar descansos y alternar materias ayuda a consolidar lo aprendido y reduce la fatiga durante el estudio.",
};
