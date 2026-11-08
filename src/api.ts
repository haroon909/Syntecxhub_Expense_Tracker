export type Expense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  note?: string;
};

export type Account = {
  id: string;
  name: string;
  email: string;
  salt: string;
  passwordHash: string;
};

type PublicAccount = Pick<Account, "id" | "name" | "email">;

const ACCOUNT_KEY = "dune-ledger:accounts";
const SESSION_KEY = "dune-ledger:session";
const EXPENSE_KEY = (accountId: string) => `dune-ledger:expenses:${accountId}`;

function readAccounts(): Account[] {
  return JSON.parse(localStorage.getItem(ACCOUNT_KEY) ?? "[]") as Account[];
}

function waitForMockApi<T>(value: T): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(value), 180));
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(salt), iterations: 120_000, hash: "SHA-256" },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function publicAccount(account: Account): PublicAccount {
  return { id: account.id, name: account.name, email: account.email };
}

export async function register(name: string, email: string, password: string): Promise<PublicAccount> {
  const accounts = readAccounts();
  const normalizedEmail = email.trim().toLowerCase();
  if (accounts.some((account) => account.email === normalizedEmail)) {
    throw new Error("An account with this email already exists.");
  }
  const salt = crypto.randomUUID();
  const account: Account = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    salt,
    passwordHash: await hashPassword(password, salt),
  };
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify([...accounts, account]));
  localStorage.setItem(SESSION_KEY, account.id);
  return publicAccount(account);
}

export async function login(email: string, password: string): Promise<PublicAccount> {
  const account = readAccounts().find((item) => item.email === email.trim().toLowerCase());
  if (!account || (await hashPassword(password, account.salt)) !== account.passwordHash) {
    throw new Error("That email and password don't match.");
  }
  localStorage.setItem(SESSION_KEY, account.id);
  return publicAccount(account);
}

export function getSession(): PublicAccount | null {
  const id = localStorage.getItem(SESSION_KEY);
  const account = readAccounts().find((item) => item.id === id);
  return account ? publicAccount(account) : null;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export async function fetchExpenses(accountId: string): Promise<Expense[]> {
  const expenses = JSON.parse(localStorage.getItem(EXPENSE_KEY(accountId)) ?? "[]") as Expense[];
  return waitForMockApi(expenses);
}

export async function saveExpense(accountId: string, expense: Expense): Promise<Expense[]> {
  const expenses = JSON.parse(localStorage.getItem(EXPENSE_KEY(accountId)) ?? "[]") as Expense[];
  const updated = [expense, ...expenses];
  localStorage.setItem(EXPENSE_KEY(accountId), JSON.stringify(updated));
  return waitForMockApi(updated);
}

export async function removeExpense(accountId: string, expenseId: string): Promise<Expense[]> {
  const expenses = JSON.parse(localStorage.getItem(EXPENSE_KEY(accountId)) ?? "[]") as Expense[];
  const updated = expenses.filter((expense) => expense.id !== expenseId);
  localStorage.setItem(EXPENSE_KEY(accountId), JSON.stringify(updated));
  return waitForMockApi(updated);
}

export async function loginToDemo(): Promise<PublicAccount> {
  const accounts = readAccounts();
  let account = accounts.find((item) => item.email === "hello@duneledger.app");
  if (!account) {
    const salt = crypto.randomUUID();
    account = {
      id: crypto.randomUUID(),
      name: "Alex Morgan",
      email: "hello@duneledger.app",
      salt,
      passwordHash: await hashPassword(crypto.randomUUID(), salt),
    };
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify([...accounts, account]));
    const today = new Date();
    const date = (daysAgo: number) => {
      const day = new Date(today);
      day.setDate(day.getDate() - daysAgo);
      return day.toISOString().slice(0, 10);
    };
    localStorage.setItem(EXPENSE_KEY(account.id), JSON.stringify([
      { id: crypto.randomUUID(), title: "Morning coffee", category: "Food & drink", amount: 6.5, date: date(0) },
      { id: crypto.randomUUID(), title: "Desert botanical shop", category: "Shopping", amount: 34, date: date(0) },
      { id: crypto.randomUUID(), title: "Weekly groceries", category: "Food & drink", amount: 82.4, date: date(1) },
      { id: crypto.randomUUID(), title: "Ride across town", category: "Transport", amount: 18.75, date: date(2) },
      { id: crypto.randomUUID(), title: "Studio membership", category: "Wellness", amount: 45, date: date(3) },
      { id: crypto.randomUUID(), title: "Dinner with Maya", category: "Food & drink", amount: 58.2, date: date(4) },
      { id: crypto.randomUUID(), title: "Sunday market flowers", category: "Shopping", amount: 24, date: date(5) },
      { id: crypto.randomUUID(), title: "Electricity bill", category: "Home", amount: 96, date: date(6) },
      { id: crypto.randomUUID(), title: "Paperback & a bookmark", category: "Shopping", amount: 19.5, date: date(7) },
    ] satisfies Expense[]));
  }
  localStorage.setItem(SESSION_KEY, account.id);
  return publicAccount(account);
}
