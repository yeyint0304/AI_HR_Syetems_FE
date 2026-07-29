"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { UpdateProfileForm } from "@/components/auth/UpdateProfileForm";
import { useCountryList } from "@/hooks/useCountries";
import { getFullName } from "@/lib/utils/userDisplay";
import type { AuthUser } from "@/types/auth.types";

export interface ProfileViewProps {
  user: Pick<AuthUser, "firstName" | "lastName" | "email" | "username" | "role" | "countryId">;
}

/**
 * `/profile` — a read-only summary of the signed-in user's account details
 * with an "Edit profile" action that opens a pre-filled `Modal`
 * (`components/auth/UpdateProfileForm.tsx`), matching the "Edit -> pre-filled
 * modal" pattern used by every other Administration screen in this app (e.g.
 * `components/auth/EditUserForm.tsx`/`UsersListView.tsx`,
 * `components/countries/CountryForm.tsx`/`CountriesListView.tsx`) rather than
 * an always-open inline form.
 *
 * `Username` is intentionally read-only here (and not part of the edit
 * form): `Auth/UpdateProfile` accepts no `Username` field
 * (`docs/HR_System_BE.postman_collection.json`'s saved example only sends
 * `FirstName`/`LastName`/`Email`/`CountryId`), so it's only ever shown, never
 * editable.
 */
export function ProfileView({ user: initialUser }: ProfileViewProps) {
  // Local state, seeded from the server-rendered `user` prop but overwritten
  // with the backend's response as soon as a save succeeds — so this summary
  // (and, via `UpdateProfileForm.onSuccess` -> `useUpdateProfile`, the
  // Sidebar/Topbar too) reflects an edited name/email/country immediately,
  // rather than only "the next time you sign in".
  const [user, setDisplayedUser] = useState(initialUser);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { data: countries } = useCountryList();

  const countryLabel = useMemo(() => {
    if (!user.countryId) return "Not set";
    const match = countries?.find((country) => country.id === user.countryId);
    return match ? `${match.name} (${match.code})` : "Not set";
  }, [countries, user.countryId]);

  const fullName = getFullName(user) || "—";

  function openEditModal() {
    setSuccessMessage(null);
    setIsEditOpen(true);
  }

  function handleEditSuccess(updatedUser: AuthUser) {
    setDisplayedUser((current) => ({ ...current, ...updatedUser }));
    setIsEditOpen(false);
    setSuccessMessage("Your profile has been updated.");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Your personal account details.</p>
        </div>
        <Button type="button" variant="secondary" onClick={openEditModal}>
          <Pencil aria-hidden="true" className="h-4 w-4" />
          Edit profile
        </Button>
      </div>

      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      <dl className="grid gap-x-8 gap-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Full name</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{fullName}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Username</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{user.username ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email address</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{user.email}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Role</dt>
          <dd className="mt-1">
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {user.role}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Country</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{countryLabel}</dd>
        </div>
      </dl>

      <Modal
        open={isEditOpen}
        title="Edit profile"
        description="Update your personal details."
        onClose={() => setIsEditOpen(false)}
      >
        <UpdateProfileForm
          initialValues={{
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            email: user.email,
            countryId: user.countryId ?? "",
          }}
          onSuccess={handleEditSuccess}
          onCancel={() => setIsEditOpen(false)}
        />
      </Modal>
    </div>
  );
}
