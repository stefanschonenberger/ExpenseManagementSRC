// src/app/profile/page.tsx
import ChangePasswordForm from "@/components/profile/ChangePasswordForm";

export default function ProfilePage() {
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <div className="max-w-xl">
                <ChangePasswordForm />
            </div>
        </div>
    );
}
