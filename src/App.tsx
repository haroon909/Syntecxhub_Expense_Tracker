import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  fetchExpenses,
  getSession,
  login,
  loginToDemo,
  logout,
  register,
  removeExpense,
  saveExpense,
  type Expense,
} from "./api";

const categories = ["Food & drink", "Transport", "Shopping", "Home", "Wellness", "Other"];
const categoryColors: Record<string, string> = {
  "Food & drink": "#c97a56",
  Transport: "#82927b",
  Shopping: "#d1a34f",
  Home: "#7d9b9d",
  Wellness: "#a988a1",
  Other: "#9b8c76",
};

type User = { id: string; name: string; email: string };
type AuthMode = "login" | "signup";

function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(year, month - 1, day));
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 6-7" /></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 1.7Z" transform="translate(-1 -1) scale(1.08)" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    down: <><path d="m7 10 5 5 5-5" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" /></>,
    leaf: <><path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 8-8 8-16Z" /><path d="M4 21c3-5 7-8 12-11" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3" /></>,
  };
  return <svg {...common}>{paths[name] ?? paths.spark}</svg>;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState(categories[0]);
  const [expenseDate, setExpenseDate] = useState(localDateString());
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [period, setPeriod] = useState<"month" | "all">("month");
  const [activeNav, setActiveNav] = useState("Overview");
  const titleRef = useRef<HTMLInputElement>(null);
  const authEmailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUser(getSession());
    setAuthReady(true);
    authEmailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      return;
    }
    let active = true;
    setLoadingExpenses(true);
    fetchExpenses(user.id)
      .then((items) => {
        if (active) setExpenses(items);
      })
      .catch(() => {
        if (active) setError("We couldn't load your expenses. Please refresh and try again.");
      })
      .finally(() => {
        if (active) setLoadingExpenses(false);
      });
    return () => { active = false; };
  }, [user]);

  const visibleExpenses = useMemo(() => {
    const currentMonth = localDateString().slice(0, 7);
    return [...expenses]
      .filter((expense) => period === "all" || expense.date.startsWith(currentMonth))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, period]);

  const monthTotal = useMemo(() => {
    const currentMonth = localDateString().slice(0, 7);
    return expenses.reduce((sum, expense) => sum + (expense.date.startsWith(currentMonth) ? expense.amount : 0), 0);
  }, [expenses]);

  const todayTotal = useMemo(() => {
    const today = localDateString();
    return expenses.reduce((sum, expense) => sum + (expense.date === today ? expense.amount : 0), 0);
  }, [expenses]);

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    visibleExpenses.forEach((expense) => totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount));
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [visibleExpenses]);

  const weeklyBars = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const dateKey = localDateString(date);
      const total = expenses.reduce((sum, expense) => sum + (expense.date === dateKey ? expense.amount : 0), 0);
      return { label: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date), total };
    });
    const peak = Math.max(...days.map((day) => day.total), 1);
    return days.map((day) => ({ ...day, height: Math.max(day.total > 0 ? 13 : 5, (day.total / peak) * 100) }));
  }, [expenses]);

  const submitExpense = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    const amount = Number(expenseAmount);
    if (!expenseTitle.trim() || !Number.isFinite(amount) || amount <= 0) return;
    setError("");
    try {
      const updated = await saveExpense(user.id, {
        id: crypto.randomUUID(),
        title: expenseTitle.trim(),
        category: expenseCategory,
        amount,
        date: expenseDate,
      });
      setExpenses(updated);
      setExpenseTitle("");
      setExpenseAmount("");
      setExpenseDate(localDateString());
      setNotice("Expense added to your ledger.");
      window.setTimeout(() => setNotice(""), 2800);
      titleRef.current?.focus();
    } catch {
      setError("Your expense couldn't be saved. Please try again.");
    }
  }, [user, expenseAmount, expenseTitle, expenseCategory, expenseDate]);

  const deleteExpense = useCallback(async (id: string) => {
    if (!user) return;
    setError("");
    try {
      setExpenses(await removeExpense(user.id, id));
    } catch {
      setError("That expense couldn't be removed. Please try again.");
    }
  }, [user]);

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      const account = authMode === "signup"
        ? await register(authName, authEmail, authPassword)
        : await login(authEmail, authPassword);
      setUser(account);
      setAuthPassword("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong. Please try again.");
    }
  };

  const demoLogin = async () => {
    setError("");
    try {
      setUser(await loginToDemo());
    } catch {
      setError("We couldn't open the demo account. Please try again.");
    }
  };

  const signOut = useCallback(() => {
    logout();
    setUser(null);
    setExpenses([]);
    setActiveNav("Overview");
    setError("");
  }, []);

  if (!authReady) return <div className="boot-screen"><span className="brand-mark"><Icon name="leaf" /></span></div>;
  if (!user) {
    return (
      <main className="auth-page">
        <div className="auth-landscape"><div className="auth-sun" /><div className="auth-dune dune-back" /><div className="auth-dune dune-front" /><div className="auth-stem stem-one" /><div className="auth-stem stem-two" /><div className="auth-caption">a softer way to see where it goes</div></div>
        <section className="auth-panel">
          <div className="auth-brand"><span className="brand-mark"><Icon name="leaf" /></span><span>dune<span className="brand-light">ledger</span></span></div>
          <div className="auth-content">
            <span className="eyebrow"><span className="eyebrow-dot" /> YOUR MONEY, IN SEASON</span>
            <h1>{authMode === "login" ? <>Make room<br />for <em>what matters.</em></> : <>A little space<br />to <em>begin.</em></>}</h1>
            <p className="auth-intro">{authMode === "login" ? "A calmer place for your everyday spending. Pick up right where you left off." : "Create your own quiet corner to notice, plan, and spend with intention."}</p>
            <form className="auth-form" onSubmit={submitAuth}>
              {authMode === "signup" && <label>Your name<input autoComplete="name" value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder="How should we call you?" required maxLength={60} /></label>}
              <label>Email address<input ref={authEmailRef} type="email" autoComplete="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" required /></label>
              <label>Password<input type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required /></label>
              {error && <p className="inline-error" role="alert">{error}</p>}
              <button className="button button-dark auth-submit" type="submit">{authMode === "login" ? "Welcome back" : "Create your account"}<Icon name="arrow" size={18} /></button>
            </form>
            <div className="auth-switch">{authMode === "login" ? "New around here?" : "Already have an account?"} <button type="button" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setError(""); }}> {authMode === "login" ? "Create an account" : "Sign in"}</button></div>
            <div className="auth-divider"><span /> or <span /></div>
            <button type="button" className="button button-outline demo-button" onClick={demoLogin}><Icon name="spark" size={18} /> Wander through the demo</button>
            <p className="local-note"><Icon name="lock" size={14} /> Demo mode · your data stays in this browser</p>
          </div>
          <p className="auth-footnote">Take a breath. You're right on time.</p>
        </section>
      </main>
    );
  }

  const firstName = user.name.split(" ")[0] || "friend";
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date());
  const initials = user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setActiveNav("Overview"); }}><span className="brand-mark"><Icon name="leaf" /></span><span>dune<span className="brand-light">ledger</span></span></a>
        <div className="workspace-label">YOUR SPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {[["Overview", "home"], ["Insights", "chart"], ["Your accounts", "card"]].map(([label, icon]) => (
            <button key={label} type="button" className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => { setActiveNav(label); setError(""); }}>
              <Icon name={icon} size={19} />{label}{label === "Overview" && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-lower">
          <div className="sidebar-quote"><span className="quote-glyph">“</span><p>Small steps in the right direction can turn out to be the biggest step of your life.</p><span className="quote-author">— N. K. Jemisin</span><span className="quote-sun" /></div>
          <button type="button" className="nav-item settings-nav" onClick={() => setNotice("Your account is safely stored on this device.")}><Icon name="settings" size={19} /> Settings</button>
          <div className="profile-card">
            <div className="avatar">{initials}</div><div className="profile-copy"><strong>{user.name}</strong><span>Personal account</span></div>
            <button className="icon-button signout-button" type="button" onClick={signOut} aria-label="Sign out" title="Sign out"><Icon name="logout" size={18} /></button>
          </div>
        </div>
        <div className="sidebar-bottom"><span>MADE FOR THE EVERYDAY</span><span className="tiny-sun">✳</span></div>
      </aside>

      <section className="main-area">
        <header className="topbar"><div className="breadcrumb"><span>Your space</span><span className="crumb-slash">/</span><strong>{activeNav}</strong></div><div className="topbar-right"><span className="live-date"><Icon name="calendar" size={16} />{new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</span><div className="topbar-avatar" title={user.name}>{initials}</div><button className="icon-button mobile-signout" type="button" onClick={signOut} aria-label="Sign out" title="Sign out"><Icon name="logout" size={17} /></button></div></header>
        {activeNav !== "Overview" && (
          <div className="page-placeholder">
            <span className="eyebrow"><span className="eyebrow-dot" /> COMING INTO FOCUS</span><h1>{activeNav === "Insights" ? "Your patterns, at a glance." : "One account. A little more clarity."}</h1>
            <p>This quiet corner is still taking shape. In the meantime, your everyday ledger is right here.</p>
            <button type="button" className="button button-dark" onClick={() => setActiveNav("Overview")}>Back to overview <Icon name="arrow" size={17} /></button>
          </div>
        )}
        {activeNav === "Overview" && <>
          <div className="greeting-row"><div><span className="eyebrow"><span className="eyebrow-dot" /> {monthName.toUpperCase()} · A FRESH PAGE</span><h1>Good morning, {firstName}<span className="greeting-period">.</span></h1><p className="greeting-subtitle">A little clarity goes a long way.</p></div><button className="button button-terra" type="button" onClick={() => titleRef.current?.focus()}><Icon name="plus" size={19} /> Add an expense</button></div>

          <section className="hero-card" aria-label="Monthly spending summary">
            <div className="hero-content"><span className="hero-label"><span className="hero-label-dot" /> SPENT THIS MONTH</span><div className="hero-total">{currency(monthTotal)}</div><p className="hero-subtitle">Every little thing, adding up to a fuller picture.</p><div className="hero-foot"><span className="hero-foot-icon"><Icon name="eye" size={15} /></span><span>Just for your eyes, <strong>{firstName}</strong></span><span className="hero-foot-separator">·</span><span>Only you can see this</span></div></div>
            <div className="hero-art" aria-hidden="true"><div className="hero-sun" /><div className="hero-hill hill-one" /><div className="hero-hill hill-two" /><div className="hero-hill hill-three" /><span className="art-spark spark-a">✳</span><span className="art-spark spark-b">✳</span><span className="hero-art-label">TAKE IT<br />ONE DAY<br />AT A TIME</span></div>
          </section>

          <div className="summary-grid">
            <section className="panel trend-panel">
              <div className="panel-heading"><div><span className="panel-kicker">YOUR RHYTHM</span><h2>The week in view</h2></div><span className="period-pill">LAST 7 DAYS <span className="pill-dot" /></span></div>
              <div className="chart-total"><strong>{currency(weeklyBars.reduce((sum, day) => sum + day.total, 0))}</strong><span>spent this week</span></div>
              <div className="bar-chart" aria-label="Daily spending over the last seven days">
                {weeklyBars.map((day, index) => <div className="bar-column" key={`${day.label}-${index}`}><div className="bar-track">{day.total > 0 && <span className="bar-value">{currency(day.total)}</span>}<div className={`bar-fill ${index === 6 ? "bar-today" : ""}`} style={{ height: `${day.height}%` }} /></div><span className={`bar-label ${index === 6 ? "today-label" : ""}`}>{day.label}</span></div>)}
              </div>
            </section>
            <section className="panel category-panel">
              <div className="panel-heading"><div><span className="panel-kicker">THE LITTLE THINGS</span><h2>By category</h2></div><span className="category-flower">✳</span></div>
              {categoryTotals.length === 0 ? <p className="empty-copy">Your categories will bloom here.</p> : <div className="category-list">{categoryTotals.map(([category, total], index) => {
                const share = (total / categoryTotals.reduce((sum, [, value]) => sum + value, 0)) * 100;
                return <div className="category-row" key={category}><div className="category-meta"><span className="category-name"><i style={{ backgroundColor: categoryColors[category] ?? categoryColors.Other }} />{category}</span><span className="category-amount">{currency(total)}</span></div><div className="category-progress"><span style={{ width: `${share}%`, backgroundColor: categoryColors[category] ?? categoryColors.Other, animationDelay: `${index * 100}ms` }} /></div></div>;
              })}</div>}
              <div className="category-foot"><span>KEEP IT INTENTIONAL</span><Icon name="leaf" size={16} /></div>
            </section>
          </div>

          <section className="ledger-panel" id="ledger">
            <div className="ledger-heading"><div><span className="panel-kicker">YOUR PERSONAL LEDGER</span><h2>Recent expenses<span className="ledger-count">{visibleExpenses.length}</span></h2></div><div className="ledger-actions"><div className="filter-control"><button type="button" className={period === "month" ? "selected" : ""} onClick={() => setPeriod("month")}>This month</button><button type="button" className={period === "all" ? "selected" : ""} onClick={() => setPeriod("all")}>All time</button></div><button type="button" className="icon-button filter-chevron" aria-label="More filters" onClick={() => setPeriod(period === "month" ? "all" : "month")}><Icon name="down" size={17} /></button></div></div>
            <form className="expense-form" onSubmit={submitExpense}>
              <label className="field-title"><span>WHAT WAS IT?</span><input ref={titleRef} value={expenseTitle} onChange={(event) => setExpenseTitle(event.target.value)} placeholder="A little something..." maxLength={80} required /></label>
              <label className="field-amount"><span>HOW MUCH?</span><div className="amount-input"><span>$</span><input type="number" min="0.01" step="0.01" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} placeholder="0.00" required /></div></label>
              <label className="field-category"><span>WHERE TO?</span><select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className="field-date"><span>WHEN?</span><input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} required /></label>
              <button type="submit" className="add-submit"><Icon name="plus" size={18} /><span>Add</span></button>
            </form>
            {error && <p className="inline-error app-error" role="alert">{error}</p>}
            {notice && <p className="inline-notice" role="status">{notice}</p>}
            {loadingExpenses ? <div className="loading-ledger"><span className="loader" /> Gathering your little things...</div> : visibleExpenses.length === 0 ? <div className="empty-ledger"><span className="empty-orbit">✳</span><strong>Nothing on the page just yet.</strong><span>Add your first expense above and let the picture take shape.</span></div> : (
              <div className="expense-list">
                {visibleExpenses.map((expense, index) => <article className="expense-row" key={expense.id} style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}><div className="expense-icon" style={{ color: categoryColors[expense.category] ?? categoryColors.Other, backgroundColor: `${categoryColors[expense.category] ?? categoryColors.Other}1b` }}><Icon name={expense.category === "Home" ? "home" : expense.category === "Transport" ? "arrow" : expense.category === "Wellness" ? "leaf" : expense.category === "Shopping" ? "spark" : "card"} size={18} /></div><div className="expense-info"><strong>{expense.title}</strong><span>{expense.category}</span></div><time className="expense-date" dateTime={expense.date}>{formatDate(expense.date)}</time><span className="expense-amount">{currency(expense.amount)}</span><button className="icon-button delete-expense" type="button" onClick={() => void deleteExpense(expense.id)} aria-label={`Delete ${expense.title}`} title="Delete expense"><Icon name="trash" size={16} /></button></article>)}
              </div>
            )}
            {visibleExpenses.length > 0 && <div className="ledger-end"><span>YOU'RE ALL CAUGHT UP</span><span className="end-flower">✳</span></div>}
          </section>
          <footer className="page-footer"><span>A softer way to keep track.</span><span>TAKE WHAT YOU NEED · LEAVE THE REST</span></footer>
        </>}
      </section>

      <aside className="right-rail">
        <div className="rail-card today-card"><div className="rail-heading"><span className="rail-icon"><Icon name="spark" size={18} /></span><span>YOUR LITTLE CHECK-IN</span></div><div className="today-label">Today, so far</div><div className="today-total">{currency(todayTotal)}</div><p className="today-note">{todayTotal > 0 ? "Noticing is its own kind of progress." : "A fresh page, open and waiting."}</p><div className="checkin-art" aria-hidden="true"><div className="checkin-sun" /><div className="checkin-dune dune-a" /><div className="checkin-dune dune-b" /><div className="checkin-plant" /></div><div className="tiny-caption"><span>☀</span> A GENTLE MOMENT TO PAUSE</div></div>
        <div className="rail-note"><span className="note-star">✳</span><p>“Almost everything will work again if you unplug it for a few minutes, including you.”</p><span className="note-credit">— ANNE LAMOTT</span></div>
        <div className="monthly-card"><div className="monthly-head"><span>THE MONTH, SO FAR</span><span className="monthly-sun">✳</span></div><div className="monthly-value">{currency(monthTotal)}</div><div className="monthly-foot"><span>{expenses.filter((expense) => expense.date.startsWith(localDateString().slice(0, 7))).length} small moments</span><span>{monthName.slice(0, 3).toUpperCase()}</span></div></div>
        <button className="rail-logout" type="button" onClick={signOut}><Icon name="logout" size={16} /> Sign out</button>
      </aside>
    </main>
  );
}

export default App;
