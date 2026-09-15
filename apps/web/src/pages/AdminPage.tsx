import { useEffect, useRef, useState, type FormEvent } from "react";

import { useAuth } from "../auth/AuthContext.js";

type Department = { id: number; name: string };
type Course = { id: number; name: string; department: Department };
type Discipline = { id: number; code: string; name: string; workloadHours: number; department: Department; courses: { id: number; name: string }[] };
type Professor = { id: number; name: string; department: Department; disciplines: { id: number; name: string }[] };
type Area = "departments" | "courses" | "disciplines" | "professors";

const labels: Record<Area, string> = { departments: "Departamentos", courses: "Cursos", disciplines: "Disciplinas", professors: "Professores" };

function errorMessage(status: number) {
  if (status === 409) return "A operação conflita com dados existentes ou o recurso está em uso.";
  if (status === 404) return "Uma referência necessária não existe mais.";
  return "Não foi possível concluir a operação.";
}

export function AdminPage() {
  const { apiFetch } = useAuth();
  const [active, setActive] = useState<Area>("departments");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const controllers = useRef(new Set<AbortController>());

  const load = () => {
    controllers.current.forEach((controller) => controller.abort());
    const controller = new AbortController(); controllers.current.add(controller); setState("loading"); setFeedback(null);
    void Promise.all(["departments", "courses", "disciplines", "professors"].map(async (resource) => {
      const response = await apiFetch(`/api/admin/${resource}`, { signal: controller.signal });
      if (!response.ok) throw new Error();
      return response.json();
    })).then(([nextDepartments, nextCourses, nextDisciplines, nextProfessors]) => {
      if (!controller.signal.aborted) { setDepartments(nextDepartments); setCourses(nextCourses); setDisciplines(nextDisciplines); setProfessors(nextProfessors); setState("ready"); }
    }).catch(() => { if (!controller.signal.aborted) { setFeedback({ message: "Não foi possível carregar o catálogo administrativo.", isError: true }); setState("error"); } }).finally(() => controllers.current.delete(controller));
  };
  useEffect(() => { load(); return () => controllers.current.forEach((controller) => controller.abort()); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = <T,>(area: Area, callback: (items: T[]) => T[]) => {
    if (area === "departments") setDepartments((items) => callback(items as T[]) as Department[]);
    if (area === "courses") setCourses((items) => callback(items as T[]) as Course[]);
    if (area === "disciplines") setDisciplines((items) => callback(items as T[]) as Discipline[]);
    if (area === "professors") setProfessors((items) => callback(items as T[]) as Professor[]);
  };
  const items = active === "departments" ? departments : active === "courses" ? courses : active === "disciplines" ? disciplines : professors;

  async function save(area: Area, id: number | null, body: object) {
    const controller = new AbortController(); controllers.current.add(controller); setFeedback(null);
    try {
      const response = await apiFetch(`/api/admin/${area}${id === null ? "" : `/${id}`}`, { method: id === null ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      if (!response.ok) { setFeedback({ message: errorMessage(response.status), isError: true }); return undefined; }
      const item = await response.json();
      update<typeof item>(area, (current) => id === null ? [...current, item] : current.map((value: { id: number }) => value.id === id ? item : value));
      setFeedback({ message: id === null ? "Item criado com sucesso." : "Item atualizado com sucesso.", isError: false });
      return item;
    } catch { if (!controller.signal.aborted) setFeedback({ message: "Erro de rede ao salvar o item.", isError: true }); return undefined; }
    finally { controllers.current.delete(controller); }
  }
  async function remove(area: Area, id: number) {
    if (!window.confirm("Excluir este item do catálogo?")) return;
    const controller = new AbortController(); controllers.current.add(controller); setFeedback(null);
    try {
      const response = await apiFetch(`/api/admin/${area}/${id}`, { method: "DELETE", signal: controller.signal });
      if (response.status !== 204) { setFeedback({ message: errorMessage(response.status), isError: true }); return; }
      update(area, (current: Array<{ id: number }>) => current.filter((item) => item.id !== id)); setFeedback({ message: "Item removido com sucesso.", isError: false });
    } catch { if (!controller.signal.aborted) setFeedback({ message: "Erro de rede ao excluir o item.", isError: true }); }
    finally { controllers.current.delete(controller); }
  }

  return <main className="page-shell moderation-page"><header className="page-header"><p className="eyebrow">Catálogo fictício</p><h1>Administração</h1><p className="page-intro">Gerencie os dados acadêmicos locais e seus relacionamentos.</p></header>
    <div className="moderation-tabs" role="tablist" aria-label="Áreas administrativas">{(Object.keys(labels) as Area[]).map((area) => <button key={area} role="tab" aria-selected={active === area} onClick={() => setActive(area)}>{labels[area]}</button>)}</div>
    {state === "loading" ? <p className="inline-state">Carregando catálogo...</p> : null}
    {state === "error" ? <div className="moderation-error" role="alert"><p>{feedback?.message}</p><button onClick={load}>Tentar novamente</button></div> : null}
    {state === "ready" ? <AdminArea area={active} items={items} departments={departments} courses={courses} disciplines={disciplines} onSave={save} onRemove={remove} /> : null}
    {feedback !== null && state === "ready" ? <p className="form-feedback" role={feedback.isError ? "alert" : "status"}>{feedback.message}</p> : null}
  </main>;
}

function AdminArea({ area, items, departments, courses, disciplines, onSave, onRemove }: { area: Area; items: Array<{ id: number }>; departments: Department[]; courses: Course[]; disciplines: Discipline[]; onSave: (area: Area, id: number | null, body: object) => Promise<unknown>; onRemove: (area: Area, id: number) => Promise<void> }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [working, setWorking] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const createButton = useRef<HTMLButtonElement>(null);
  const initial = { code: "", name: "", departmentId: "", workloadHours: "", relationIds: [] as string[] };
  const [form, setForm] = useState(initial);
  const begin = (item?: any) => { setEditing(item?.id ?? 0); setForm(item ? { code: item.code ?? "", name: item.name, departmentId: item.department ? String(item.department.id) : "", workloadHours: item.workloadHours ? String(item.workloadHours) : "", relationIds: (item.courses ?? item.disciplines ?? []).map((value: { id: number }) => String(value.id)) } : initial); };
  const cancel = () => { setEditing(null); setForm(initial); queueMicrotask(() => createButton.current?.focus()); };
  const submit = async (event: FormEvent) => { event.preventDefault(); if (working) return; setWorking(true); const body = area === "departments" ? { name: form.name.trim() } : area === "courses" ? { name: form.name.trim(), departmentId: Number(form.departmentId) } : area === "disciplines" ? { code: form.code.trim().toUpperCase(), name: form.name.trim(), departmentId: Number(form.departmentId), workloadHours: Number(form.workloadHours), courseIds: form.relationIds.map(Number) } : { name: form.name.trim(), departmentId: Number(form.departmentId), disciplineIds: form.relationIds.map(Number) }; const result = await onSave(area, editing === 0 ? null : editing, body); setWorking(false); if (result) cancel(); };
  const remove = async (id: number) => { if (removingId !== null) return; setRemovingId(id); await onRemove(area, id); setRemovingId(null); queueMicrotask(() => createButton.current?.focus()); };
  const relationOptions = area === "disciplines" ? courses : disciplines;
  return <section className="moderation-section"><h2>{labels[area]}</h2><button ref={createButton} type="button" disabled={working || removingId !== null} onClick={() => begin()}>Criar {labels[area].slice(0, -1).toLowerCase()}</button>
    {editing !== null ? <form className="auth-form" onSubmit={submit}><label>Nome<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} disabled={working} /></label>{area === "disciplines" ? <><label>Código<input required pattern="[A-Za-z]{3}[0-9]{3}" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} disabled={working} /></label><label>Carga horária<input required min="1" type="number" value={form.workloadHours} onChange={(event) => setForm({ ...form, workloadHours: event.target.value })} disabled={working} /></label></> : null}{area !== "departments" ? <label>Departamento<select required value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })} disabled={working}><option value="">Selecione</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}{area === "disciplines" || area === "professors" ? <label>{area === "disciplines" ? "Cursos" : "Disciplinas"}<select multiple value={form.relationIds} onChange={(event) => setForm({ ...form, relationIds: Array.from(event.currentTarget.selectedOptions, (option) => option.value) })} disabled={working}>{relationOptions.map((item: any) => <option key={item.id} value={item.id}>{area === "disciplines" ? item.name : `${item.code} — ${item.name}`}</option>)}</select></label> : null}<button disabled={working}>{working ? "Salvando..." : "Salvar"}</button><button type="button" disabled={working} onClick={cancel}>Cancelar</button></form> : null}
    {items.length === 0 ? <p className="inline-state">Nenhum item cadastrado.</p> : <div className="moderation-list">{items.map((item: any) => <article key={item.id} className="moderation-card"><h3>{item.code ? `${item.code} — ${item.name}` : item.name}</h3>{item.department ? <p>{item.department.name}</p> : null}{item.workloadHours ? <p>{item.workloadHours} horas</p> : null}{item.courses ? <p>Cursos: {item.courses.map((value: Related) => value.name).join(", ") || "Nenhum"}</p> : null}{item.disciplines ? <p>Disciplinas: {item.disciplines.map((value: Related) => value.name).join(", ") || "Nenhuma"}</p> : null}<button type="button" disabled={working || removingId !== null} onClick={() => begin(item)}>Editar</button><button type="button" disabled={working || removingId !== null} className="danger-button" onClick={() => void remove(item.id)}>{removingId === item.id ? "Excluindo..." : "Excluir"}</button></article>)}</div>}
  </section>;
}

type Related = { id: number; name: string };
