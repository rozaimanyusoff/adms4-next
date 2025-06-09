// Employee Dashboard for OrgEmp
import React, { useEffect, useState } from "react";
import { authenticatedApi } from "../../config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Department { id: number; name: string; code: string; }
interface Position { id: number; name: string; }
interface District { id: number; name: string; code: string; }
interface CostCenter { id: number; name: string; }
interface Employee {
    id: number;
    ramco_id: string;
    full_name: string;
    email: string;
    contact: string;
    gender: string;
    dob: string;
    avatar?: string | null;
    hire_date: string;
    resignation_date: string;
    employment_type: string;
    employment_status: string;
    grade: string;
    position?: Position;
    department?: Department;
    costcenter?: CostCenter;
    district?: District;
}

const DashEmp: React.FC = () => {
    const [data, setData] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [active, setActive] = useState(0);
    const [resigned, setResigned] = useState(0);
    const [latest, setLatest] = useState<Employee[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await authenticatedApi.get<any>("/api/assets/employees");
                const employees: Employee[] = Array.isArray(res.data.data) ? res.data.data : [];
                setData(employees);
                setTotal(employees.length);
                setActive(employees.filter(e => e.employment_status === "active").length);
                setResigned(employees.filter(e => e.employment_status !== "active").length);
                setLatest(employees.slice(-5).reverse());
            } catch {
                setData([]); setTotal(0); setActive(0); setResigned(0); setLatest([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader><CardTitle>Total Employees</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold">{total}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Active</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold text-green-600">{active}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Resigned</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold text-red-500">{resigned}</div></CardContent>
                </Card>
            </div>
            <div className="mt-8">
                <h3 className="text-lg font-semibold mb-2">Latest Employees</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border rounded">
                        <thead>
                            <tr>
                                <th className="px-3 py-2 border">#</th>
                                <th className="px-3 py-2 border">Name</th>
                                <th className="px-3 py-2 border">Email</th>
                                <th className="px-3 py-2 border">Status</th>
                                <th className="px-3 py-2 border">Hire Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {latest.map((emp, idx) => (
                                <tr key={emp.id}>
                                    <td className="px-3 py-2 border">{idx + 1}</td>
                                    <td className="px-3 py-2 border">{emp.full_name}</td>
                                    <td className="px-3 py-2 border">{emp.email}</td>
                                    <td className="px-3 py-2 border">{emp.employment_status}</td>
                                    <td className="px-3 py-2 border">{emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('en-GB') : '-'}</td>
                                </tr>
                            ))}
                            {latest.length === 0 && (
                                <tr><td colSpan={5} className="text-center py-4 text-gray-400">No data</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashEmp;
