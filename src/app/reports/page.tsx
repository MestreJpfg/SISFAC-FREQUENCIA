import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailyReport } from "./DailyReport";
import { MonthlyReport } from "./MonthlyReport";

export default async function ReportsPage() {
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
                   <MonthlyReport />
                </TabsContent>
            </Tabs>
        </div>
    );
}
