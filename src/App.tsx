import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Moon, Plus, Sun, Trash2, Wifi } from 'lucide-react';
import { defaultCategories, defaultSavingsPlan, demoCategories, demoTransactions, paymentMethods } from './data';
import { isSupabaseConfigured, supabase } from './supabase';
import type { ExpenseCategory, ProjectionPoint, SavingsPlan, Transaction, TransactionType } from './types';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const colors = ['#2563eb', '#16a34a', '#f97316', '#dc2626', '#7c3aed', '#0891b2', '#f59e0b', '#64748b'];
const monthName = (date: Date) => date.toLocaleString('en-US', { month: 'short' });

function App() {
  const [dark, setDark] = useState(() => localStorage.theme === 'dark');
  const [transactions, setTransactions] = useState<Transaction[]>(() => JSON.parse(localStorage.transactions ?? 'null') ?? demoTransactions);
  const [categories, setCategories] = useState<ExpenseCategory[]>(() => JSON.parse(localStorage.categories ?? 'null') ?? demoCategories);
  const [plan, setPlan] = useState<SavingsPlan>(() => JSON.parse(localStorage.savingsPlan ?? 'null') ?? defaultSavingsPlan);
  const [newCategory, setNewCategory] = useState('');
  const [form, setForm] = useState<Omit<Transaction, 'id'>>({ type: 'expense', amount: 0, date: new Date().toISOString().slice(0, 10), description: '', category: 'Food', paymentMethod: 'Debit card' });

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.theme = dark ? 'dark' : 'light'; }, [dark]);
  useEffect(() => { localStorage.transactions = JSON.stringify(transactions); }, [transactions]);
  useEffect(() => { localStorage.categories = JSON.stringify(categories); }, [categories]);
  useEffect(() => { localStorage.savingsPlan = JSON.stringify(plan); }, [plan]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel('finance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => void loadSupabase())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_categories' }, () => void loadSupabase())
      .subscribe();
    void loadSupabase();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  async function loadSupabase() {
    if (!supabase) return;
    const [{ data: tx }, { data: cat }, { data: goal }] = await Promise.all([
      supabase.from('transactions').select('*').order('date', { ascending: false }),
      supabase.from('expense_categories').select('*').order('name'),
      supabase.from('savings_plans').select('*').limit(1).maybeSingle(),
    ]);
    if (tx) setTransactions(tx.map((r) => ({ id: r.id, type: r.type, amount: Number(r.amount), date: r.date, description: r.description, category: r.category, paymentMethod: r.payment_method, userId: r.user_id })));
    if (cat?.length) setCategories(cat.map((r) => ({ id: r.id, name: r.name, userId: r.user_id })));
    if (goal) setPlan({ monthlyGoal: Number(goal.monthly_goal) });
  }

  const stats = useMemo(() => {
    const now = new Date();
    const monthTx = transactions.filter((t) => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    const savings = income - expenses;
    return { income, expenses, balance, savings, savingsRate: income ? (savings / income) * 100 : 0 };
  }, [transactions]);

  const monthly = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const d = new Date(new Date().getFullYear(), i, 1);
    const list = transactions.filter((t) => new Date(t.date).getMonth() === i && new Date(t.date).getFullYear() === d.getFullYear());
    const income = list.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { month: monthName(d), income, expenses, cashFlow: income - expenses };
  }), [transactions]);

  const projection = useMemo<ProjectionPoint[]>(() => {
    const active = monthly.filter((m) => m.income || m.expenses);
    const avgIncome = active.reduce((s, m) => s + m.income, 0) / Math.max(active.length, 1);
    const avgExpenses = active.reduce((s, m) => s + m.expenses, 0) / Math.max(active.length, 1);
    let running = stats.balance;
    return Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() + i); running += avgIncome - avgExpenses; return { month: `${monthName(d)} ${String(d.getFullYear()).slice(2)}`, income: avgIncome, expenses: avgExpenses, cashFlow: avgIncome - avgExpenses, projectedBalance: running }; });
  }, [monthly, stats.balance]);

  const categoryData = categories.map((c) => ({ name: c.name, value: transactions.filter((t) => t.type === 'expense' && t.category === c.name).reduce((s, t) => s + t.amount, 0) })).filter((c) => c.value > 0);
  const gap = Math.max(plan.monthlyGoal - stats.savings, 0);
  const progress = Math.min((stats.savings / Math.max(plan.monthlyGoal, 1)) * 100, 100);
  const annualCashFlow = projection.reduce((s, p) => s + p.cashFlow, 0);

  async function addTransaction() {
    const item = { ...form, id: crypto.randomUUID(), amount: Number(form.amount) };
    setTransactions((prev) => [item, ...prev]);
    setForm({ ...form, amount: 0, description: '' });
    if (supabase) await supabase.from('transactions').insert({ id: item.id, type: item.type, amount: item.amount, date: item.date, description: item.description, category: item.category, payment_method: item.paymentMethod });
  }
  async function removeTransaction(id: string) { setTransactions((p) => p.filter((t) => t.id !== id)); if (supabase) await supabase.from('transactions').delete().eq('id', id); }
  async function addCategory() { if (!newCategory.trim()) return; const c = { id: crypto.randomUUID(), name: newCategory.trim() }; setCategories((p) => [...p, c]); setNewCategory(''); if (supabase) await supabase.from('expense_categories').insert(c); }
  async function removeCategory(id: string) { setCategories((p) => p.filter((c) => c.id !== id)); if (supabase) await supabase.from('expense_categories').delete().eq('id', id); }

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_35%),radial-gradient(circle_at_top_right,#e0e7ff,transparent_30%)] p-4 dark:bg-[radial-gradient(circle_at_top_left,#172554,transparent_35%),radial-gradient(circle_at_top_right,#312e81,transparent_30%)] md:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl dark:bg-white dark:text-slate-950 md:flex-row md:items-center md:justify-between">
        <div><p className="text-sm font-semibold uppercase tracking-[.3em] text-blue-300">Personal finance</p><h1 className="text-3xl font-bold md:text-5xl">Smart money dashboard</h1><p className="mt-2 max-w-2xl text-slate-300 dark:text-slate-600">Track income, expenses, savings goals and a rolling 12-month cash-flow projection in real time.</p></div>
        <button className="btn btn-secondary flex items-center justify-center gap-2" onClick={() => setDark(!dark)}>{dark ? <Sun size={18}/> : <Moon size={18}/>} {dark ? 'Light' : 'Dark'} mode</button>
      </header>
      <section className="grid gap-4 md:grid-cols-5">{[['Monthly income', stats.income], ['Monthly expenses', stats.expenses], ['Current balance', stats.balance], ['Savings rate', `${stats.savingsRate.toFixed(1)}%`], ['Projected annual cash flow', annualCashFlow]].map(([k,v]) => <div className="card" key={k}><p className="text-sm text-slate-500 dark:text-slate-400">{k}</p><p className="mt-3 text-2xl font-bold">{typeof v === 'number' ? money.format(v) : v}</p></div>)}</section>
      <section className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><div className="card"><h2 className="text-xl font-bold">Add transaction</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><select className="input" value={form.type} onChange={(e) => setForm({...form, type: e.target.value as TransactionType})}><option value="expense">Expense</option><option value="income">Income</option></select><input className="input" type="number" min="0" placeholder="Amount" value={form.amount || ''} onChange={(e) => setForm({...form, amount: Number(e.target.value)})}/><input className="input" type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})}/><input className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}/><select className="input" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}>{(form.type === 'income' ? ['Salary','Freelance','Investment','Other'] : categories.map((c) => c.name)).map((c) => <option key={c}>{c}</option>)}</select><select className="input" value={form.paymentMethod} onChange={(e) => setForm({...form, paymentMethod: e.target.value})}>{paymentMethods.map((p) => <option key={p}>{p}</option>)}</select></div><button className="btn btn-primary mt-4 flex items-center gap-2" onClick={addTransaction}><Plus size={18}/> Add transaction</button></div>
      <div className="card"><h2 className="text-xl font-bold">Expense categories</h2><div className="mt-4 flex gap-2"><input className="input" placeholder="New category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}/><button className="btn btn-primary" onClick={addCategory}>Add</button></div><div className="mt-4 flex flex-wrap gap-2">{categories.map((c) => <span className="rounded-full bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800" key={c.id}>{c.name} {!defaultCategories.includes(c.name) && <button onClick={() => removeCategory(c.id)} className="ml-2 text-red-500">×</button>}</span>)}</div></div></section>
      <section className="grid gap-6 lg:grid-cols-2"><Chart title="Income vs expenses by month"><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis/><Tooltip formatter={(v) => money.format(Number(v))}/><Bar dataKey="income" fill="#16a34a" radius={8}/><Bar dataKey="expenses" fill="#dc2626" radius={8}/></BarChart></Chart><Chart title="Expenses by category"><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={110} label>{categoryData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]}/>)}</Pie><Tooltip formatter={(v) => money.format(Number(v))}/></PieChart></Chart><Chart title="Annual cash flow projection"><LineChart data={projection}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis/><Tooltip formatter={(v) => money.format(Number(v))}/><Line dataKey="projectedBalance" stroke="#2563eb" strokeWidth={3}/></LineChart></Chart><div className="card"><h2 className="text-xl font-bold">Savings goal progress</h2><input className="input mt-4" type="number" value={plan.monthlyGoal} onChange={(e) => setPlan({ monthlyGoal: Number(e.target.value) })}/><div className="mt-5 h-4 rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-4 rounded-full bg-blue-600" style={{ width: `${progress}%` }}/></div><p className="mt-4">Achieved: <b>{money.format(stats.savings)}</b> / Goal: <b>{money.format(plan.monthlyGoal)}</b></p><p className="mt-2 text-slate-600 dark:text-slate-300">Gap: {money.format(gap)}. Recommended adjustment: {gap ? `reduce expenses or increase income by ${money.format(gap)} this month.` : 'you are on track—consider investing the surplus.'}</p><Chart title="Goal trend"><AreaChart data={monthly}><XAxis dataKey="month"/><YAxis/><Tooltip formatter={(v) => money.format(Number(v))}/><Area dataKey="cashFlow" fill="#93c5fd" stroke="#2563eb"/></AreaChart></Chart></div></section>
      <section className="card"><div className="flex items-center gap-2"><Wifi className="text-blue-600"/><h2 className="text-xl font-bold">Recent transactions</h2><span className="ml-auto text-sm text-slate-500">{isSupabaseConfigured ? 'Supabase realtime enabled' : 'Local demo mode'}</span></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-slate-500"><tr><th>Date</th><th>Type</th><th>Description</th><th>Category</th><th>Method</th><th className="text-right">Amount</th><th/></tr></thead><tbody>{transactions.map((t) => <tr className="border-t border-slate-200 dark:border-slate-800" key={t.id}><td className="py-3">{t.date}</td><td>{t.type}</td><td>{t.description}</td><td>{t.category}</td><td>{t.paymentMethod}</td><td className={`text-right font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{money.format(t.amount)}</td><td className="text-right"><button onClick={() => removeTransaction(t.id)}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div></section>
    </div>
  </main>;
}

function Chart({ title, children }: { title: string; children: React.ReactElement }) { return <div className="card min-h-[360px]"><h2 className="mb-4 text-xl font-bold">{title}</h2><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></div>; }
export default App;
