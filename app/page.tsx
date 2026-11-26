"use client";
import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
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
  if (!res.ok) throw Object.assign(Error(data.error || "Request failed"), { status: res.status });
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
  const [reportDraft, setReportDraft] = useState<Row | null>(null);
  const [duplicateReview, setDuplicateReview] = useState<Row | null>(null);
  const [reviewUnavailable, setReviewUnavailable] = useState(false);
  const [draftRequestId, setDraftRequestId] = useState("");
  const draftVersion = useRef(0);
  const [locationArea, setLocationArea] = useState("Banashankari");
  const [locationStreet, setLocationStreet] = useState("");
  const [locationPlace, setLocationPlace] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [chosenLocation, setChosenLocation] = useState<Row | null>(null);
  const [locationMatches, setLocationMatches] = useState<Row[]>([]);
  const [locationNotice, setLocationNotice] = useState("");
  const locationVersion = useRef(0);
  function clearLocation() {
    locationVersion.current++; setChosenLocation(null); setLocationMatches([]); setLocationNotice(""); resetReportReview();
  }
  async function findLocation(save = false) {
    const version = locationVersion.current;
    await action(async () => {
      const input = {area: locationArea, query: (locationPlace.trim() || locationStreet.trim()).slice(0,160), street: locationStreet};
      if (save) {
        const place = await api("locations", "POST", input);
        if (version === locationVersion.current) {setChosenLocation(place); setLocationMatches([]);}
        await refresh();
      } else {
        const result = await api("locations/resolve", "POST", input);
        if (version === locationVersion.current) {
          setLocationMatches(result.candidates);
          setLocationNotice(result.semanticAvailable ? "Select a matching place below, or use the entered address as a new place. Similarity is a suggestion." : "Semantic model unavailable. Exact saved names and aliases are shown; you can save a new place.");
        }
      }
    });
  }
  const [queryEpoch, setQueryEpoch] = useState(0);
  const [queryPending, setQueryPending] = useState(false);
  const [queryError, setQueryError] = useState("");
  const [queryUpdatedAt, setQueryUpdatedAt] = useState("");
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
    if (!user || tab !== "SQL lab") return;
    let cancelled = false, inFlight = false;
    setQueryResult(null);
    setQueryUpdatedAt("");
    const load = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      setQueryPending(true);
      try {
        const result = await api("queries?key=" + query);
        if (!cancelled) { setQueryResult(result); setQueryUpdatedAt(result.executedAt); setQueryError(""); }
      } catch (e) {
        if (!cancelled) { setQueryResult(null); setQueryUpdatedAt(""); setQueryError((e as Error).message); }
      } finally { inFlight = false; if (!cancelled) setQueryPending(false); }
    };
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [user, tab, query, queryEpoch]);
  function resetReportReview() {
    draftVersion.current++;
    setDuplicateReview(null); setReportDraft(null); setReviewUnavailable(false);
  }
  async function submitReportDecision(choice: "create" | "attach", incident?: number) {
    if (!reportDraft) return;
    await action(async () => {
      const result = await api("incidents/report", "POST", {
        draft: reportDraft, action: choice, emergency_id: incident,
        ...(duplicateReview ? { reviewToken: duplicateReview.reviewToken } : { bypass_review: true, request_id: draftRequestId }),
      });
      setSelected(result.emergency_id); setShowCreate(false); resetReportReview();
      if (result.action === "attached") {
        setSearch(""); setEditing(null); setTab("Field notes");
        setMessage(`Additional report saved to incident #${result.emergency_id}. No new incident or dispatch was created.`);
      } else setMessage(`Incident #${result.emergency_id} saved with automatic status history.`);
      try { await refresh(); } catch { throw Error(`The report was saved to incident #${result.emergency_id}, but refreshing the dashboard failed. Reload to view it.`); }
    });
  }
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
          <p className="muted">Use your assigned account.</p>
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
            Project application. Not connected to emergency
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
          Bengaluru response workspace<p>PostgreSQL + MongoDB</p>
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
                    onClick={() => { if (!showCreate) { clearLocation(); setLocationStreet(""); setLocationPlace(""); setLocationDetail(""); } setShowCreate(!showCreate); resetReportReview(); }}
                  >
                    + Report incident
                  </button>
                )}
              </div>
              {showCreate && coordinator && (
                <section className="panel">
                  <h3>Report a new incident</h3>
                  <form
                    className="form-grid"
                    onChange={resetReportReview}
                    onSubmit={(e) => {
                      const d = form(e);
                      if (!chosenLocation) {setError("Select a saved place, or enter an address/landmark and choose Use entered address / landmark."); return;}
                      const draft = { ...d, reported_location_text: [locationPlace || chosenLocation.location_name, locationDetail, locationStreet, locationArea].filter(Boolean).join(", "), type_id: Number(d.type_id), location_id: Number(d.location_id),
                        people_affected: Number(d.people_affected), capability_id: Number(d.capability_id) };
                      const version = draftVersion.current;
                      setReportDraft(draft); setDraftRequestId(crypto.randomUUID());
                      setDuplicateReview(null); setReviewUnavailable(false);
                      void action(async () => {
                        try {
                          const result = await api("incidents/review", "POST", draft);
                          if (draftVersion.current === version) setDuplicateReview(result);
                        } catch (e) {
                          if (draftVersion.current === version && ((e as Error & {status?:number}).status === 503 || e instanceof TypeError)) setReviewUnavailable(true);
                          throw e;
                        }
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
                      Bengaluru area
                      <select value={locationArea} onChange={e=>{clearLocation();setLocationArea(e.target.value);setLocationPlace("");setLocationStreet("");setLocationDetail("");}}>
                        {data?.areas.map((a:string)=><option key={a}>{a}</option>)}
                      </select>
                    </label>
                    <label>
                      Saved place / building
                      <select value={chosenLocation?.location_id || ""} onChange={e=>{
                        clearLocation(); setLocationDetail(""); const place=data?.locations.find((l:Row)=>l.location_id===Number(e.target.value));
                        setLocationPlace(place?.location_name || ""); setLocationStreet(place?.street || "");
                        if(place)setChosenLocation(place);
                      }}>
                        <option value="">{data?.locations.filter((l:Row)=>l.area===locationArea).length || 0} saved places in {locationArea} — choose or type below</option>
                        {data?.locations.filter((l:Row)=>l.area===locationArea).map((l:Row)=><option key={l.location_id} value={l.location_id}>{l.location_name}</option>)}
                      </select>
                      <span className="small muted">Existing places are available now. Add your address below if yours is missing.</span>
                    </label>
                    <label>
                      Street / address
                      <input value={locationStreet} maxLength={200} placeholder="Street, cross or address" onChange={e=>{clearLocation();setLocationStreet(e.target.value);}} />
                    </label>
                    <label>
                      Landmark / place name
                      <input value={locationPlace} minLength={2} maxLength={160} placeholder="e.g. GJB Block, PES uni cafe, shop or landmark" onChange={e=>{clearLocation();setLocationPlace(e.target.value);}} />
                    </label>
                    <label>
                      Floor / room / directions (optional)
                      <input value={locationDetail} maxLength={120} placeholder="e.g. 3rd floor, room 302, near east entrance" onChange={e=>setLocationDetail(e.target.value)} />
                    </label>
                    <input type="hidden" name="location_id" value={chosenLocation?.location_id || ""} />
                    <div className="location-actions">
                      <button type="button" disabled={busy || Math.max(locationPlace.trim().length,locationStreet.trim().length)<2} onClick={()=>void findLocation()}>Find matching places</button>{" "}
                      <button type="button" disabled={busy || Math.max(locationPlace.trim().length,locationStreet.trim().length)<2 || !!chosenLocation} onClick={()=>void findLocation(true)}>Use entered address / landmark</button>
                      {locationNotice && <p role="status">{locationNotice}</p>}
                      {locationMatches.map((l:Row)=><button type="button" key={l.location_id} onClick={()=>{resetReportReview();setChosenLocation(l);setLocationMatches([]);}}>
                        {l.location_name} · {l.match_kind}{typeof l.cosine_distance==="number" ? ` · distance ${l.cosine_distance.toFixed(3)}` : ""}
                      </button>)}
                      {chosenLocation && <p role="status">Selected: <strong>{chosenLocation.location_name}</strong></p>}
                    </div>
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
                      {busy ? "Checking…" : "Check for existing incidents"}
                    </button>
                  </form>
                  {duplicateReview && reportDraft && <div className="duplicate-review" aria-live="polite">
                    <h3>{duplicateReview.candidates.length ? "Could this be an existing incident?" : "No close matches found"}</h3>
                    <p>Checked active incidents at the selected location reported in the last {duplicateReview.windowHours === 1 ? "hour" : `${duplicateReview.windowHours} hours`}. Older incidents remain in the incident list. Similar wording is a suggestion, not proof of a duplicate. Review the details before choosing.</p>
                    {duplicateReview.candidates.map((candidate: Row) => <article key={candidate.emergency_id} className="duplicate-candidate">
                      <h4>Incident #{candidate.emergency_id} · {candidate.type_name} · {candidate.status}</h4>
                      <p>{candidate.description}</p>
                      <p className="muted">Reported {new Date(candidate.reported_at).toLocaleString()} · Cosine distance {Number(candidate.cosine_distance).toFixed(4)} (lower is closer)</p>
                      <p>{candidate.active_assignments.length ? "Already deployed: " + candidate.active_assignments.map((a: Row) => `${a.resource_name} / ${a.employee_id}`).join(", ") : "No active team assigned yet."}</p>
                      <button type="button" disabled={busy} onClick={() => void submitReportDecision("attach", candidate.emergency_id)}>Same incident — attach this report</button>
                    </article>)}
                    <button type="button" className="primary" disabled={busy} onClick={() => void submitReportDecision("create")}>{duplicateReview.candidates.length ? "Different incident — create separately" : "Create new incident"}</button>
                    <p className="muted">Attaching saves your original report as an additional field note. It does not change severity, affected-person counts or existing assignments automatically.</p>
                  </div>}
                  {reviewUnavailable && reportDraft && <div role="status" className="duplicate-review">
                    <p>The duplicate check did not finish. You can retry above or explicitly create a new incident without it.</p>
                    <button type="button" disabled={busy} onClick={() => void submitReportDecision("create")}>Create new incident without duplicate check</button>
                  </div>}
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
                      {incident.reported_location_text && <p>Reported location: {incident.reported_location_text}</p>}
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
                    database. Results refresh every 5 seconds while this tab is open.
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
              <button type="button" disabled={queryPending} onClick={() => setQueryEpoch(n => n + 1)}>Refresh results now</button>
              {queryError && <p role="alert">{queryError}</p>}
              <pre className="sql-code">{queryResult?.sql}</pre>
              <p className="small muted">
                {queryPending ? "Refreshing… · " : ""}{queryResult?.rows.length || 0} rows returned
                {queryUpdatedAt && ` · Last executed ${new Date(queryUpdatedAt).toLocaleTimeString()}`}
              </p>
              <ResultTable rows={queryResult?.rows || []} />
            </section>
          )}
          <p className="app-foot">
            CrisisLink · Emergency Resource Coordination · PostgreSQL and
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
