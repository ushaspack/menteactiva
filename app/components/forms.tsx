"use client";

import { useActionState } from "react";
import {
  addCommentAction, createAssignmentAction, createClassAction, joinClassAction, loginAction, registerAction, saveGradeAction, submitWorkAction,
} from "@/app/actions";
import { emptyState, type FormState } from "@/lib/form-state";
import { Alert, buttonClass, Check, Field, Select, TextArea, TextInput } from "./ui";

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass("primary")}>
      {pending ? <span className="size-3.5 rounded-full border-2 border-current border-r-transparent animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

function ErrorBox({ state }: { state: FormState }) {
  return state.error ? <Alert tone="error">{state.error}</Alert> : null;
}

export function NewClassForm() {
  const [state, action, pending] = useActionState(createClassAction, emptyState);
  return (
    <form action={action} className="max-w-xl">
      <ErrorBox state={state} />
      <Field id="title" label="Nombre de la clase" help="Lo verán tus estudiantes.">
        <TextInput id="title" name="title" required maxLength={120} defaultValue={state.values.title ?? ""} aria-describedby="title-help" />
      </Field>
      <Field id="expires" label="Fecha de cierre (opcional)" help="Después de esta fecha la clase deja de aceptar estudiantes.">
        <TextInput id="expires" name="expires" type="date" defaultValue={state.values.expires ?? ""} aria-describedby="expires-help" />
      </Field>
      <Submit pending={pending}>Crear clase</Submit>
    </form>
  );
}

export function JoinClassForm() {
  const [state, action, pending] = useActionState(joinClassAction, emptyState);
  return (
    <form action={action} className="max-w-md">
      <ErrorBox state={state} />
      <Field id="key" label="Clave de la clase" help="Te la da tu docente, por ejemplo COM-4821.">
        <TextInput id="key" name="key" required autoComplete="off" defaultValue={state.values.key ?? ""} aria-describedby="key-help" />
      </Field>
      <Submit pending={pending}>Unirme</Submit>
    </form>
  );
}

export function NewAssignmentForm({ classId }: { classId: string }) {
  const [state, action, pending] = useActionState(createAssignmentAction, emptyState);
  const v = state.values;
  return (
    <form action={action} className="max-w-2xl">
      <input type="hidden" name="classId" value={classId} />
      <ErrorBox state={state} />
      <Field id="title" label="Título de la tarea">
        <TextInput id="title" name="title" required maxLength={160} defaultValue={v.title ?? ""} />
      </Field>
      <Field id="instructions" label="Instrucciones (opcional)">
        <TextArea id="instructions" name="instructions" rows={4} defaultValue={v.instructions ?? ""} />
      </Field>
      <Field id="due" label="Fecha y hora límite (hora de Madrid)" help="Déjalo vacío si no hay plazo.">
        <TextInput id="due" name="due" type="datetime-local" defaultValue={v.due ?? ""} aria-describedby="due-help" />
      </Field>
      <Check id="lateAllowed" name="lateAllowed" label="Aceptar entregas tardías" help="Se marcarán como tardías en la bandeja." />

      <Field id="maxPoints" label="Puntuación máxima" help="La nota que ponga el profesorado irá de 0 a este valor.">
        <TextInput id="maxPoints" name="maxPoints" type="number" min={1} max={1000} step={1} defaultValue={v.maxPoints || "100"} aria-describedby="maxPoints-help" />
      </Field>

      <h2 className="font-display font-bold text-lg mt-8 mb-3">Similitud</h2>
      <Field id="retention" label="Dónde se guardan las entregas para comparar" help="Con «Ninguna», los trabajos no se usan para comparar con futuras entregas.">
        <Select id="retention" name="retention" defaultValue={v.retention || "institution"} aria-describedby="retention-help">
          <option value="institution">Solo mi institución</option>
          <option value="platform">Repositorio compartido</option>
          <option value="none">Ninguna</option>
        </Select>
      </Field>
      <Check id="studentsSeeReport" name="studentsSeeReport" defaultChecked label="Los estudiantes pueden ver su informe" />
      <Check id="excludeQuotes" name="excludeQuotes" label="Excluir citas textuales" />
      <Check id="excludeBibliography" name="excludeBibliography" label="Excluir bibliografía" />
      <Field id="minWords" label="Ignorar coincidencias de menos de (palabras)" help="De 0 a 100. Con 0 no se ignora nada.">
        <TextInput id="minWords" name="minWords" type="number" min={0} max={100} inputMode="numeric" defaultValue={v.minWords ?? "0"} className="max-w-32" aria-describedby="minWords-help" />
      </Field>
      <Submit pending={pending}>Crear tarea</Submit>
    </form>
  );
}

export function SubmitWorkForm({ assignmentId, defaultTitle }: { assignmentId: string; defaultTitle?: string }) {
  const [state, action, pending] = useActionState(submitWorkAction, emptyState);
  return (
    <form action={action} encType="multipart/form-data">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <ErrorBox state={state} />
      <Field id="title" label="Título del trabajo">
        <TextInput id="title" name="title" required maxLength={160} defaultValue={state.values.title ?? defaultTitle ?? ""} />
      </Field>
      <Field id="file" label="Sube un archivo" help="Archivos .docx, .pdf o .txt de hasta 50 MB.">
        <input id="file" name="file" type="file" accept=".txt,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-describedby="file-help"
          className="block w-full text-sm text-text-muted file:mr-3 file:h-10 file:px-4 file:rounded-md file:border file:border-border-input file:bg-transparent file:text-text file:cursor-pointer border border-dashed border-border-input rounded-lg p-4 bg-surface" />
      </Field>
      <p className="text-sm text-text-muted mb-4">o pega el texto aquí</p>
      <Field id="pasted" label="Texto del trabajo">
        <TextArea id="pasted" name="pasted" rows={10} defaultValue={state.values.pasted ?? ""} />
      </Field>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <span className="text-sm text-text-muted">Al entregar verás enseguida tu informe de similitud.</span>
        <Submit pending={pending}>Entregar trabajo</Submit>
      </div>
    </form>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, emptyState);
  return (
    <form action={action}>
      <ErrorBox state={state} />
      <Field id="email" label="Correo electrónico">
        <TextInput id="email" name="email" type="email" required autoComplete="email" maxLength={254} defaultValue={state.values.email ?? ""} />
      </Field>
      <Field id="password" label="Contraseña">
        <TextInput id="password" name="password" type="password" required autoComplete="current-password" maxLength={200} />
      </Field>
      <Submit pending={pending}>Entrar</Submit>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, emptyState);
  return (
    <form action={action}>
      <ErrorBox state={state} />
      <Field id="name" label="Nombre">
        <TextInput id="name" name="name" required autoComplete="name" maxLength={120} defaultValue={state.values.name ?? ""} />
      </Field>
      <Field id="email" label="Correo electrónico">
        <TextInput id="email" name="email" type="email" required autoComplete="email" maxLength={254} defaultValue={state.values.email ?? ""} />
      </Field>
      <Field id="role" label="Soy">
        <Select id="role" name="role" defaultValue={state.values.role || "estudiante"}>
          <option value="estudiante">Estudiante</option>
          <option value="docente">Docente</option>
        </Select>
      </Field>
      <Field id="password" label="Contraseña" help="Al menos 10 caracteres.">
        <TextInput id="password" name="password" type="password" required minLength={10} maxLength={200} autoComplete="new-password" aria-describedby="password-help" />
      </Field>
      <Submit pending={pending}>Crear cuenta</Submit>
    </form>
  );
}

export function GradeForm({
  submissionId, grade, overall, maxPoints,
}: { submissionId: string; grade: number | null; overall: string; maxPoints: number }) {
  const [state, action, pending] = useActionState(saveGradeAction, emptyState);
  return (
    <form action={action}>
      <input type="hidden" name="submissionId" value={submissionId} />
      <ErrorBox state={state} />
      {state.ok ? <Alert tone="success">{state.ok}</Alert> : null}
      <Field id="grade" label={`Nota (de 0 a ${maxPoints})`}>
        <TextInput id="grade" name="grade" inputMode="decimal" maxLength={7} defaultValue={state.values.grade ?? (grade ?? "").toString()} />
      </Field>
      <Field id="overall" label="Comentario general" help="Lo que quieres que lea la persona antes de los comentarios del texto.">
        <TextArea id="overall" name="overall" rows={5} maxLength={5000} defaultValue={state.values.overall ?? overall} aria-describedby="overall-help" />
      </Field>
      <Submit pending={pending}>Guardar nota</Submit>
    </form>
  );
}
