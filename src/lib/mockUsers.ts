import { AuthUser, Role } from "@/types/auth";

interface MockUser extends AuthUser {
  password: string;
}

const USERS_STORAGE_KEY = "hr_mock_users_v2";

// Mock data only — no real backend. Good for local demoing of the auth flows.
const SEED_USERS: MockUser[] = [
  {
    id: "u-1",
    username: "admin",
    password: "Password@123",
    firstName: "System",
    lastName: "Admin",
    email: "admin@hrsystem.com",
    role: "SYSTEM_ADMIN",
    countryCode: "SG",
    jobRole: "System Admin",
  },
  {
    id: "u-2",
    username: "sarah",
    password: "Password@123",
    firstName: "Sarah",
    lastName: "Chen",
    email: "sarah@hrsystem.com",
    role: "PROJECT_ADMIN",
    countryCode: "SG",
    jobRole: "Project Admin",
  },
  {
    id: "u-3",
    username: "alex",
    password: "Password@123",
    firstName: "Alex",
    lastName: "Kumar",
    email: "alex@hrsystem.com",
    role: "ASSIGNED_USER",
    countryCode: "IN",
    jobRole: "Senior Developer",
  },
];

function loadUsers(): MockUser[] {
  if (typeof window === "undefined") return SEED_USERS;

  try {
    const raw = window.localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return SEED_USERS;
    const persisted = JSON.parse(raw) as MockUser[];
    return Array.isArray(persisted) && persisted.length > 0 ? persisted : SEED_USERS;
  } catch {
    return SEED_USERS;
  }
}

let users: MockUser[] = loadUsers();

function persistUsers() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export function findMockUser(usernameOrEmail: string, password: string): AuthUser | null {
  const needle = usernameOrEmail.trim().toLowerCase();
  const match = users.find(
    (user) =>
      (user.username.toLowerCase() === needle || user.email.toLowerCase() === needle) &&
      user.password === password,
  );
  if (!match) return null;
  return toPublicUser(match);
}

export function listMockUsers(): AuthUser[] {
  return users.map(toPublicUser);
}

export function isUsernameTaken(username: string): boolean {
  const needle = username.trim().toLowerCase();
  return users.some((user) => user.username.toLowerCase() === needle);
}

export function isEmailTaken(email: string, excludeUserId?: string): boolean {
  const needle = email.trim().toLowerCase();
  return users.some((user) => user.email.toLowerCase() === needle && user.id !== excludeUserId);
}

export interface CreateMockUserInput {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  countryCode: string;
  jobRole: string;
}

export function createMockUser(input: CreateMockUserInput): AuthUser {
  const newUser: MockUser = {
    id: `u-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    username: input.username.trim(),
    email: input.email.trim(),
    password: input.password,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    role: input.role,
    countryCode: input.countryCode,
    jobRole: input.jobRole.trim(),
  };

  users = [...users, newUser];
  persistUsers();
  return toPublicUser(newUser);
}

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  email: string;
}

export function updateMockUserProfile(userId: string, input: UpdateProfileInput): AuthUser {
  let updated: MockUser | undefined;

  users = users.map((user) => {
    if (user.id !== userId) return user;
    updated = {
      ...user,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim(),
    };
    return updated;
  });

  if (!updated) {
    throw new Error("User not found.");
  }

  persistUsers();
  return toPublicUser(updated);
}

export function changeMockUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): void {
  const user = users.find((candidate) => candidate.id === userId);
  if (!user) {
    throw new Error("User not found.");
  }
  if (user.password !== currentPassword) {
    throw new Error("Current password is incorrect.");
  }

  users = users.map((candidate) =>
    candidate.id === userId ? { ...candidate, password: newPassword } : candidate,
  );
  persistUsers();
}

function toPublicUser(user: MockUser): AuthUser {
  const { password: _password, ...publicUser } = user;
  void _password;
  return publicUser;
}
