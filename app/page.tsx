"use client";
import { useState, useEffect, useCallback, type FormEvent } from "react";
type Row = Record<string, any>;
type User = {
  user_id: number;
  full_name: string;
  email: string;
  role_name: string;
};
async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch("/api/" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw Error(data.error || "Request failed");
  return data;
}
function badge(value: string) {
  return <span className={"badge " + value}>{value.replaceAll("_", " ")}</span>;
}
export default function Home() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [data, setData] = useState<Row | null>(null),
    [tab, setTab] = useState("Incidents"),
    [selected, setSelected] = useState(101),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [showCreate, setShowCreate] = useState(false);
  const [notes, setNotes] = useState<Row[]>([]),
    [summary, setSummary] = useState<Row[]>([]),
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState<Row | null>(null),
    [query, setQuery] = useState("join"),
    [queryResult, setQueryResult] = useState<Row | null>(null);
  const [tagEditing, setTagEditing] = useState<{
    resource_id: number;
    tag: string;
  } | null>(null);
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticResult, setSemanticResult] = useState<Row | null>(null);
  const refresh = useCallback(async () => {
    setData(await api("dashboard"));
  }, []);
  useEffect(() => {
    api("auth/me")
      .then(async (u) => {
        setUser(u);
        await refresh();
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [refresh]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const loadNotes = useCallback(async () => {
    try {
      const d = await api(
        `notes?incident=${selected}&search=${encodeURIComponent(search)}`,
      );
      setNotes(d.notes);
      setSummary(d.summary);
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setNotes([]);
    }
  }, [selected, search]);
  useEffect(() => {
    if (user && tab === "Field notes") void loadNotes();
  }, [user, tab, loadNotes]);
  useEffect(() => {
    if (user && tab === "SQL lab")
      api("queries?key=" + query)
        .then(setQueryResult)
        .catch((e) => setError(e.message));
  }, [user, tab, query]);
  function form(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return Object.fromEntries(new FormData(event.currentTarget));
  }
  if (!ready) return <main className="loading">Opening CrisisLink…</main>;
  if (!user)
    return (
      <main className="login-wrap">
        <section className="login-story">
          <div className="wordmark">
            <i>+</i> CrisisLink
          </div>
          <span className="eyebrow">EMERGENCY RESPONSE DATABASE</span>
          <h1>
            A clear picture.
            <br />A coordinated response.
          </h1>
          <p>
            Track incidents, dispatch available teams and keep field updates
            connected.
          </p>
          <div className="login-foot">
            DBMS MINI PROJECT
            <br />
            Sachin R · Abhinav Krishna Kandukuri
          </div>
        </section>
        <section className="login-card">
          <span className="eyebrow">TEAM ACCESS</span>
          <h2>Sign in to your workspace</h2>
          <p className="muted">Use your assigned demonstration account.</p>
          <form
            onSubmit={(e) => {
              const d = form(e);
              void action(async () => {
                setUser(await api("auth/login", "POST", d));
                await refresh();
              });
            }}
          >
            <label>
              Email
              <input
                name="email"
                type="email"
                placeholder="coordinator@example.com"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              Sign in →
            </button>
          </form>
          <p className="small muted">
            Fictional classroom application. Not connected to emergency
            services.
          </p>
        </section>
      </main>
    );
  const coordinator = user.role_name === "Coordinator";
  const incident = data?.incidents.find(
    (i: Row) => i.emergency_id === selected,
  );
  const assignments = (data?.assignments || []).filter(
    (a: Row) => a.emergency_id === selected,
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="wordmark">
          <i>+</i> CrisisLink
        </div>
        <span className="eyebrow">RESPONSE WORKSPACE</span>
        <nav>
          {["Incidents", "Resources", "Field notes", "SQL lab"].map(
            (name, index) => (
              <button
                key={name}
                className={tab === name ? "active" : ""}
                onClick={() => {
                  setTab(name);
                  setError("");
                  setMessage("");
                }}
              >
                <span>{["◉", "▤", "▧", "⌘"][index]}</span>
                {name}
              </button>
            ),
          )}
        </nav>
        <div className="sidebar-bottom">
          <span className="live-dot" />
          Local project demonstration<p>PostgreSQL + MongoDB</p>
          <small>Sachin R · Abhinav Krishna Kandukuri</small>
        </div>
      </aside>
      <div className="main-shell">
        <header>
          <div>
            <span className="eyebrow">OPERATIONS / {tab.toUpperCase()}</span>
            <h1>
              {tab === "Incidents"
                ? "Incident overview"
                : tab === "Resources"
                  ? "Resources and readiness"
                  : tab === "Field notes"
                    ? "Updates from the field"
                    : "Explore the database"}
            </h1>
          </div>
          <div className="account">
            <span className="avatar">{user.full_name[0]}</span>
            <div>
              <strong>{user.full_name}</strong>
              <small>{user.role_name}</small>
            </div>
            <button
              className="text-button"
              onClick={() =>
                void action(async () => {
                  await api("auth/logout", "POST", {});
                  setUser(null);
                  setData(null);
                })
              }
            >
              Sign out
            </button>
          </div>
        </header>
        <main>
          <div aria-live="polite">
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            {message && <div className="success">{message}</div>}
          </div>
          <div className="stats">
            <div>
              <span>OPEN INCIDENTS</span>
              <strong>
                {data?.incidents.filter((i: Row) => i.status !== "resolved")
                  .length || 0}
              </strong>
              <small>Awaiting or receiving response</small>
            </div>
            <div>
              <span>AVAILABLE RESOURCES</span>
              <strong>
                {data?.resources.filter((r: Row) => r.status === "available")
                  .length || 0}
                <em> / {data?.resources.length || 0}</em>
              </strong>
              <small>Ready for dispatch</small>
            </div>
            <div>
              <span>ACTIVE ASSIGNMENTS</span>
              <strong>
                {data?.assignments.filter((a: Row) =>
                  ["active", "dispatched"].includes(a.status),
                ).length || 0}
              </strong>
              <small>Teams currently deployed</small>
            </div>
          </div>
          {tab === "Incidents" && (
            <>
              <div className="section-title">
                <div>
                  <h2>Incidents</h2>
                  <p className="muted">
                    Select an incident to review response activity.
                  </p>
                </div>
                {coordinator && (
                  <button
                    className="primary"
                    onClick={() => setShowCreate(!showCreate)}
                  >
                    + Report incident
                  </button>
                )}
              </div>
              <section className="panel semantic-search">
                <h3>Find similar incidents</h3>
                <p className="muted">Describe a situation to find related incidents by meaning, even when the wording differs.</p>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  void action(async () => {
                    setSemanticResult(null);
                    setSemanticResult(await api("incidents/search?q=" + encodeURIComponent(semanticQuery)));
                  });
                }}>
                  <label htmlFor="semantic-query">Situation or question</label>
                  <div className="semantic-controls">
                    <input id="semantic-query" value={semanticQuery}
                      onChange={(e) => setSemanticQuery(e.target.value)}
                      placeholder="People trapped by rising water" minLength={3} maxLength={500} required />
                    <button className="primary" disabled={busy}>{busy ? "Searching…" : "Search by meaning"}</button>
                  </div>
                </form>
                {semanticResult && <div aria-live="polite">
                  <p className="muted">{semanticResult.coverage.indexed} of {semanticResult.coverage.total} incidents indexed. Results are ranked suggestions; review their details before acting.</p>
                  {semanticResult.rows.length === 0 && <p>No indexed incidents yet.</p>}
                  <ol className="semantic-results">{semanticResult.rows.map((r: Row) => <li key={r.emergency_id}>
                    <button type="button" onClick={() => setSelected(r.emergency_id)}>Open incident #{r.emergency_id}</button>
                    <p>{r.description}</p>
                    <small>Cosine distance: {Number(r.cosine_distance).toFixed(4)} · {r.status}</small>
                  </li>)}</ol>
                </div>}
              </section>
              {showCreate && coordinator && (
                <section className="panel">
                  <h3>Report a new incident</h3>
                  <form
                    className="form-grid"
                    onSubmit={(e) => {
                      const d = form(e);
                      void action(async () => {
                        const row = await api("incidents", "POST", {
                          ...d,
                          type_id: Number(d.type_id),
                          location_id: Number(d.location_id),
                          people_affected: Number(d.people_affected),
                          capability_id: Number(d.capability_id),
                        });
                        setSelected(row.emergency_id);
                        setShowCreate(false);
                        await refresh();
                        setMessage(
                          `Incident #${row.emergency_id} saved with automatic status history.`,
                        );
                      });
                    }}
                  >
                    <label>
                      Incident type
                      <select name="type_id">
                        {data?.types.map((t: Row) => (
                          <option key={t.type_id} value={t.type_id}>
                            {t.type_name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Location
                      <select name="location_id">
                        {data?.locations.map((l: Row) => (
                          <option key={l.location_id} value={l.location_id}>
                            {l.location_name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Severity
                      <select name="severity_level">
                        <option>high</option>
                        <option>medium</option>
                        <option>low</option>
                        <option>critical</option>
                      </select>
                    </label>
                    <label>
                      People affected
                      <input
                        type="number"
                        name="people_affected"
                        defaultValue="1"
                        min="0"
                        max="1000000"
                        required
                      />
                    </label>
                    <label>
                      Required capability
                      <select name="capability_id">
                        {data?.capabilities.map((c: Row) => (
                          <option key={c.capability_id} value={c.capability_id}>
                            {c.capability_name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Description
                      <input
                        name="description"
                        placeholder="Describe the incident"
                        minLength={5}
                        maxLength={2000}
                        required
                      />
                    </label>
                    <button disabled={busy} className="primary">
                      Save incident
                    </button>
                  </form>
                </section>
              )}
              <div className="incident-layout">
                <section className="panel incident-list">
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>INCIDENT</th>
                          <th>SEVERITY</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data?.incidents.map((i: Row) => (
                          <tr
                            key={i.emergency_id}
                            className={
                              selected === i.emergency_id ? "selected" : ""
                            }
                            onClick={() => setSelected(i.emergency_id)}
                          >
                            <td>
                              <button
                                className="incident-button"
                                onClick={() => setSelected(i.emergency_id)}
                              >
                                <b>
                                  #{i.emergency_id} · {i.type_name}
                                </b>
                                <span>{i.location_name}</span>
                              </button>
                            </td>
                            <td>{badge(i.severity_level)}</td>
                            <td>{badge(i.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section className="panel detail">
                  {incident ? (
                    <>
                      <div className="detail-heading">
                        <span className="eyebrow">INCIDENT #{selected}</span>
                        {badge(incident.status)}
                      </div>
                      <h2>{incident.description}</h2>
                      <p className="muted">
                        {incident.location_name} · {incident.people_affected}{" "}
                        people affected
                      </p>
                      <h3>Response assignments</h3>
                      {assignments.length ? (
                        assignments.map((a: Row) => (
                          <div className="assignment" key={a.assignment_id}>
                            <b>{a.resource_name}</b>
                            <span>
                              {a.employee_id} · {a.status}
                            </span>
                            {["active", "dispatched"].includes(a.status) &&
                              (coordinator || a.user_id === user.user_id) && (
                                <button
                                  disabled={busy}
                                  onClick={() =>
                                    void action(async () => {
                                      await api("complete", "POST", {
                                        assignment_id: a.assignment_id,
                                        outcome:
                                          "Response completed safely and resources released",
                                      });
                                      await refresh();
                                      setMessage(
                                        "Response completed. Resource released and audit history updated.",
                                      );
                                    })
                                  }
                                >
                                  Complete response
                                </button>
                              )}
                          </div>
                        ))
                      ) : (
                        <p className="muted">No assignments yet.</p>
                      )}
                      {coordinator && incident.status !== "resolved" && (
                        <form
                          className="dispatch-form"
                          onSubmit={(e) => {
                            const d = form(e);
                            void action(async () => {
                              await api("dispatch", "POST", {
                                emergency_id: selected,
                                resource_id: Number(d.resource_id),
                                responder_id: Number(d.responder_id),
                              });
                              await refresh();
                              setMessage(
                                "Response dispatched in one database transaction.",
                              );
                            });
                          }}
                        >
                          <h3>Dispatch a response</h3>
                          <label>
                            Available resource
                            <select name="resource_id" required>
                              <option value="">Choose a resource</option>
                              {data?.resources
                                .filter((r: Row) => r.status === "available")
                                .map((r: Row) => (
                                  <option
                                    value={r.resource_id}
                                    key={r.resource_id}
                                  >
                                    {r.resource_name}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label>
                            Available responder
                            <select name="responder_id" required>
                              <option value="">Choose a responder</option>
                              {data?.responders
                                .filter((r: Row) => r.status === "available")
                                .map((r: Row) => (
                                  <option
                                    value={r.responder_id}
                                    key={r.responder_id}
                                  >
                                    {r.employee_id} · {r.team}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <button className="primary" disabled={busy}>
                            Dispatch team →
                          </button>
                        </form>
                      )}
                      <h3>Status timeline</h3>
                      <ol className="timeline">
                        {data?.history
                          .filter((h: Row) => h.emergency_id === selected)
                          .slice(0, 8)
                          .map((h: Row) => (
                            <li key={h.history_id}>
                              <b>{h.status}</b>
                              <span>{h.remarks}</span>
                              <small>
                                {new Date(h.changed_at).toLocaleString()}
                              </small>
                            </li>
                          ))}
                      </ol>
                    </>
                  ) : (
                    <p>Select an incident.</p>
                  )}
                </section>
              </div>
            </>
          )}
          {tab === "Resources" && (
            <>
              <section className="panel">
                <h2>Response resources</h2>
                <div className="resource-grid">
                  {data?.resources.map((r: Row) => (
                    <article className="resource-card" key={r.resource_id}>
                      <span className="eyebrow">{r.call_sign}</span>
                      <h3>{r.resource_name}</h3>
                      {badge(r.status)}
                      <p>
                        Capacity {r.capacity} · Resource #{r.resource_id}
                      </p>
                      <div
                        className="resource-tags"
                        aria-label={`Tags for ${r.resource_name}`}
                      >
                        {(data?.resourceTags || [])
                          .filter((t: Row) => t.resource_id === r.resource_id)
                          .map((t: Row) => (
                            <div className="resource-tag" key={t.tag}>
                              <span className="badge">{t.tag}</span>
                              {["Coordinator", "Technician"].includes(
                                user.role_name,
                              ) && (
                                <>
                                  <button
                                    type="button"
                                    aria-label={`Rename ${t.tag} on ${r.resource_name}`}
                                    onClick={() =>
                                      setTagEditing({
                                        resource_id: r.resource_id,
                                        tag: t.tag,
                                      })
                                    }
                                  >
                                    Rename
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    aria-label={`Remove ${t.tag} from ${r.resource_name}`}
                                    onClick={() =>
                                      void action(async () => {
                                        if (
                                          !confirm(
                                            `Remove the tag ${t.tag} from ${r.resource_name}?`,
                                          )
                                        )
                                          return;
                                        await api("resource-tags", "DELETE", {
                                          resource_id: r.resource_id,
                                          tag: t.tag,
                                        });
                                        await refresh();
                                        setMessage(
                                          "Resource tag removed from PostgreSQL.",
                                        );
                                      })
                                    }
                                  >
                                    Remove
                                  </button>
                                </>
                              )}
                            </div>
                          ))}
                      </div>
                      {["Coordinator", "Technician"].includes(
                        user.role_name,
                      ) && (
                        <form
                          className="resource-tag-form"
                          key={
                            tagEditing?.resource_id === r.resource_id
                              ? tagEditing?.tag || "new"
                              : "new"
                          }
                          onSubmit={(e) => {
                            const el = e.currentTarget;
                            const d = form(e);
                            void action(async () => {
                              const current =
                                tagEditing?.resource_id === r.resource_id
                                  ? tagEditing
                                  : null;
                              await api(
                                "resource-tags",
                                current ? "PATCH" : "POST",
                                current
                                  ? {
                                      resource_id: r.resource_id,
                                      tag: current.tag,
                                      new_tag: d.tag,
                                    }
                                  : { resource_id: r.resource_id, tag: d.tag },
                              );
                              setTagEditing(null);
                              el.reset();
                              await refresh();
                              setMessage(
                                current
                                  ? "Resource tag renamed in PostgreSQL."
                                  : "Resource tag saved to PostgreSQL.",
                              );
                            });
                          }}
                        >
                          <label>
                            {tagEditing?.resource_id === r.resource_id
                              ? "Rename tag"
                              : "Add resource tag"}
                            <input
                              name="tag"
                              required
                              minLength={1}
                              maxLength={100}
                              defaultValue={
                                tagEditing?.resource_id === r.resource_id
                                  ? tagEditing?.tag || ""
                                  : ""
                              }
                            />
                          </label>
                          <button type="submit" disabled={busy}>
                            Save tag
                          </button>
                          {tagEditing?.resource_id === r.resource_id && (
                            <button
                              type="button"
                              onClick={() => setTagEditing(null)}
                            >
                              Cancel rename
                            </button>
                          )}
                        </form>
                      )}
                    </article>
                  ))}
                </div>
              </section>
              {["Coordinator", "Technician"].includes(user.role_name) && (
                <section className="panel">
                  <h2>Record maintenance</h2>
                  <form
                    className="form-grid"
                    onSubmit={(e) => {
                      const d = form(e);
                      void action(async () => {
                        await api("maintenance", "POST", {
                          ...d,
                          resource_id: Number(d.resource_id),
                          cost: Number(d.cost),
                        });
                        await refresh();
                        setMessage("Maintenance record saved.");
                      });
                    }}
                  >
                    <label>
                      Resource
                      <select name="resource_id">
                        {data?.resources.map((r: Row) => (
                          <option key={r.resource_id} value={r.resource_id}>
                            {r.resource_name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Cost INR
                      <input
                        type="number"
                        name="cost"
                        min="0"
                        step="0.01"
                        required
                      />
                    </label>
                    <label className="wide">
                      Description
                      <input
                        name="description"
                        minLength={5}
                        maxLength={2000}
                        required
                      />
                    </label>
                    <button className="primary" disabled={busy}>
                      Save maintenance
                    </button>
                  </form>
                </section>
              )}
              <section className="panel">
                <h2>Maintenance history</h2>
                <ResultTable rows={data?.maintenance || []} />
              </section>
            </>
          )}
          {tab === "Field notes" && (
            <>
              <div className="section-title">
                <div>
                  <h2>Incident field notes</h2>
                  <p className="muted">
                    Flexible MongoDB documents linked to SQL incident IDs.
                  </p>
                </div>
                <label>
                  Incident
                  <select
                    value={selected}
                    onChange={(e) => {
                      setSelected(Number(e.target.value));
                      setEditing(null);
                    }}
                  >
                    {data?.incidents.map((i: Row) => (
                      <option value={i.emergency_id} key={i.emergency_id}>
                        #{i.emergency_id} · {i.location_name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="notes-layout">
                <section>
                  <div className="search-box">
                    <label>
                      Search notes
                      <input
                        aria-label="Search notes"
                        placeholder="Search text or tags…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="tag-summary">
                    {summary.map((t) => (
                      <span className="badge" key={t._id}>
                        {t._id} · {t.count}
                      </span>
                    ))}
                  </div>
                  {notes.length ? (
                    notes.map((n) => (
                      <article className="panel note" key={n._id}>
                        <div className="note-top">
                          <b>{n.author_name}</b>
                          <small>
                            {new Date(n.updated_at).toLocaleString()}
                          </small>
                        </div>
                        <p>{n.text}</p>
                        <div>
                          {n.tags.map((t: string) => (
                            <span className="badge" key={t}>
                              {t}
                            </span>
                          ))}
                        </div>
                        {Object.keys(n.assessment).length > 0 && (
                          <p className="muted">
                            Assessment:{" "}
                            {Object.entries(n.assessment)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(" · ")}
                          </p>
                        )}
                        {(coordinator || n.author_id === user.user_id) &&
                          user.role_name !== "Technician" && (
                            <div className="note-actions">
                              <button onClick={() => setEditing(n)}>
                                Edit note
                              </button>
                              <button
                                onClick={() =>
                                  void action(async () => {
                                    if (!confirm("Delete this field note?"))
                                      return;
                                    await api("notes/" + n._id, "DELETE");
                                    await loadNotes();
                                    setMessage("Field note deleted.");
                                  })
                                }
                              >
                                Delete note
                              </button>
                            </div>
                          )}
                      </article>
                    ))
                  ) : (
                    <section className="panel empty">
                      <h3>No matching field notes</h3>
                      <p>Updates for this incident will appear here.</p>
                    </section>
                  )}
                </section>
                {user.role_name !== "Technician" && (
                  <section className="panel">
                    <h2>{editing ? "Edit field note" : "Add a field note"}</h2>
                    <form
                      key={editing?._id || "new"}
                      onSubmit={(e) => {
                        const el = e.currentTarget;
                        const d = form(e);
                        void action(async () => {
                          const body = {
                            text: d.text,
                            tags: String(d.tags)
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean),
                            assessment: d.safety
                              ? { safety: String(d.safety) }
                              : {},
                          };
                          await api(
                            editing ? "notes/" + editing._id : "notes",
                            editing ? "PATCH" : "POST",
                            editing
                              ? body
                              : { ...body, emergency_id: selected },
                          );
                          setEditing(null);
                          el.reset();
                          await loadNotes();
                          setMessage("Field note saved to MongoDB.");
                        });
                      }}
                    >
                      <label>
                        Update
                        <textarea
                          name="text"
                          defaultValue={editing?.text || ""}
                          rows={5}
                          minLength={5}
                          maxLength={2000}
                          required
                        />
                      </label>
                      <label>
                        Tags separated by commas
                        <input
                          name="tags"
                          defaultValue={editing?.tags.join(", ") || ""}
                          placeholder="safety, medical"
                        />
                      </label>
                      <label>
                        Safety assessment optional
                        <input
                          name="safety"
                          maxLength={200}
                          defaultValue={editing?.assessment?.safety || ""}
                        />
                      </label>
                      <button className="primary" disabled={busy}>
                        Save field note
                      </button>
                      {editing && (
                        <button type="button" onClick={() => setEditing(null)}>
                          Cancel editing
                        </button>
                      )}
                    </form>
                    <p className="small muted">
                      Responders can add notes only to incidents they are
                      assigned to. The author or coordinator can edit and
                      delete.
                    </p>
                  </section>
                )}
              </div>
            </>
          )}
          {tab === "SQL lab" && (
            <section className="panel">
              <div className="section-title">
                <div>
                  <h2>Query explorer</h2>
                  <p className="muted">
                    These predefined queries execute against the live PostgreSQL
                    database.
                  </p>
                </div>
                <label>
                  SQL example
                  <select
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  >
                    <option value="join">Multiple JOINs</option>
                    <option value="nested">Nested query</option>
                    <option value="correlated">Correlated NOT EXISTS</option>
                    <option value="cte">CTE and window function</option>
                    <option value="recursive">Recursive CTE</option>
                    <option value="view">Assignment summary view</option>
                    <option value="aggregate">GROUP BY and HAVING</option>
                  </select>
                </label>
              </div>
              <pre className="sql-code">{queryResult?.sql}</pre>
              <p className="small muted">
                {queryResult?.rows.length || 0} rows returned
              </p>
              <ResultTable rows={queryResult?.rows || []} />
            </section>
          )}
          <p className="app-foot">
            CrisisLink · Fictional DBMS mini project · Persistent PostgreSQL and
            MongoDB storage
          </p>
        </main>
      </div>
    </div>
  );
}
function ResultTable({ rows }: { rows: Row[] }) {
  if (!rows.length) return <p className="muted">No rows returned.</p>;
  const keys = Object.keys(rows[0]);
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {keys.map((k) => (
              <th key={k}>{k.replaceAll("_", " ")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {keys.map((k) => (
                <td key={k}>{r[k] === null ? "NULL" : String(r[k])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
