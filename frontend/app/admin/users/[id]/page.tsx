'use client';

import { toast } from "sonner";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from 'next/navigation';
import { getUserById, User } from "@/services/users.service";

export default function UserViewPage() {
    const [user, setUser] = useState<User | null>(null);

    const params = useParams();
    const userId = params.id as string;
    const fetchUserData = async (userId: string) => {
        try {
            const userData = await getUserById(userId);
            setUser(userData);
        } catch (error: any) {
            toast.error(error?.message || "An error occurred while fetching user data.");
        }
    }

    useEffect(() => {
        if (userId) {
            fetchUserData(userId);
        }
    }, [userId]);

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex gap-3 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end justify-between">
             <div>
                <Link href="/admin/users" className="text-sm font-medium text-[var(--gold-deep)] hover:text-[var(--ink)]">
                    <p>&larr; Back to users</p>
                </Link>
            </div>
            <div>
                <Link href={`/admin/users/${user.id}/edit`} className="rounded-[2px] bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--cream)] transition hover:-translate-y-0.5 hover:bg-[var(--charcoal)]">
                    Edit User
                </Link>
            </div>
        </div>
            <div className="rounded-[2px] border border-[var(--border)] bg-[var(--surface)] p-8">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                    {/* Avatar */}
                    <div className="flex flex-col items-center lg:w-52">

                    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[var(--ink)] text-3xl font-bold text-[var(--cream)]">
                        {user.firstName.charAt(0).toUpperCase()}{user.lastName.charAt(0).toUpperCase()}
                    </div>

                    <span
                        className={`mt-4 rounded-full px-3 py-1 text-sm font-medium ${
                        user.isActive
                            ? "bg-[var(--success-bg)] text-[var(--success)]"
                            :"bg-[var(--danger-bg)] text-[var(--danger)]"
                        }`}
                    >
                        {user.isActive ? "Active" :"Inactive"}
                    </span>

                    </div>

                    {/* Details */}
                    <div className="flex-1">

                    <h1 className="text-3xl font-bold text-[var(--ink)]">
                        {user.firstName} {user.lastName}
                    </h1>

                    <p className="mt-2 text-[var(--ink-muted)]">
                        {user.email}
                    </p>

                    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">

                        <div>
                        <p className="font-body text-[11.5px] text-[var(--ink-muted)]">
                            First Name
                        </p>

                        <p className="font-medium">
                            {user.firstName}
                        </p>
                        </div>

                        <div>
                        <p className="font-body text-[11.5px] text-[var(--ink-muted)]">
                            Last Name
                        </p>

                        <p className="font-medium">
                            {user.lastName}
                        </p>
                        </div>

                        <div>
                        <p className="font-body text-[11.5px] text-[var(--ink-muted)]">
                            Email
                        </p>

                        <p className="font-medium">
                            {user.email}
                        </p>
                        </div>

                        <div>
                        <p className="font-body text-[11.5px] text-[var(--ink-muted)]">
                            Role
                        </p>

                        <span className="rounded-full bg-[var(--cream-2)] px-3 py-1 text-sm">
                            {user.role.name}
                        </span>
                        </div>

                    </div>
                    </div>
                </div>

            </div>
        </div>
    )
}