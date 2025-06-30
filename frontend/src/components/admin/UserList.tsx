// src/components/admin/UserList.tsx
interface User {
    id: string;
    full_name: string;
    email: string;
    role: string;
}

export default function UserList({ users }: { users: User[] }) {
    return (
        <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">System Users</h2>
            <ul className="space-y-3">
                {users.map(user => (
                    <li key={user.id} className="p-3 border rounded-md">
                        <p className="font-medium text-gray-900">{user.full_name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500">{user.role}</p>
                    </li>
                ))}
            </ul>
        </div>
    )
}