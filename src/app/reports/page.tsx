import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailyReport } from "./DailyReport";
import { MonthlyReport } from "./MonthlyReport";
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { Student } from '@/lib/types';
import { Card, CardContent, CardHeader } from "@/components/ui/card";

async function getStudents() {
    try {
        const { firestore } = initializeFirebase();
        const studentsRef = collection(firestore, 'students');
        const studentsQuery = query(studentsRef, orderBy('name'));
        const studentsSnap = await getDocs(studentsQuery);
        return studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    } catch (error) {
        console.error("Failed to fetch students:", error);
        return [];
    }
}

export default async function ReportsPage() {
    const students = await getStudents();

    return (
        <div className="w-full">
            <h1 className="text-3xl font-bold font-headline mb-6">Relatórios de Frequência</h1>
            <Tabs defaultValue="daily" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="daily">Relatório Diário</TabsTrigger>
                    <TabsTrigger value="monthly">Relatório Mensal</TabsTrigger>
                </TabsList>
                <TabsContent value="daily" className="mt-4">
                    <DailyReport />
                </TabsContent>
                <TabsContent value="monthly" className="mt-4">
                   <MonthlyReport students={students} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
