
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailyReport } from "./DailyReport";
import { MonthlyReport } from "./MonthlyReport";
import { IndividualReport } from "./IndividualReport";
import { CustomReport } from "./CustomReport";

export default async function ReportsPage() {
    return (
        <div className="w-full">
            <h1 className="text-3xl font-bold font-headline mb-6">Relatórios de Frequência</h1>
            <Tabs defaultValue="daily">
                <TabsList className="grid w-full grid-cols-4 max-w-2xl">
                    <TabsTrigger value="daily">Diário</TabsTrigger>
                    <TabsTrigger value="monthly">Mensal</TabsTrigger>
                    <TabsTrigger value="individual">Individual</TabsTrigger>
                    <TabsTrigger value="custom">Personalizado</TabsTrigger>
                </TabsList>
                <TabsContent value="daily" className="mt-6">
                    <DailyReport />
                </TabsContent>
                <TabsContent value="monthly" className="mt-6">
                    <MonthlyReport />
                </TabsContent>
                <TabsContent value="individual" className="mt-6">
                    <IndividualReport />
                </TabsContent>
                <TabsContent value="custom" className="mt-6">
                    <CustomReport />
                </TabsContent>
            </Tabs>
        </div>
    );
}
