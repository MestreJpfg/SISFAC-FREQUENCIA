
import { DailyReport } from "./DailyReport";

export default async function ReportsPage() {
    return (
        <div className="w-full">
            <h1 className="text-3xl font-bold font-headline mb-6">Relatório de Frequência</h1>
            <DailyReport />
        </div>
    );
}

